import { Meeting, Attendance, MeetingReview } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatMeeting = (m, extras = {}) => {
  const startTime = m.startTime || m.meetingTime || '';
  return {
    id: m._id,
    title: m.title,
    description: m.description,
    meetingDate: m.meetingDate,
    meetingTime: startTime,
    startTime,
    endTime: m.endTime || '',
    zoomLink: m.zoomLink,
    dayNumber: m.dayNumber,
    sessionNumber: m.sessionNumber,
    organizationType: m.organizationType,
    status: m.status,
    attendanceStatus: extras.attendanceStatus || null,
    alreadyAttended: extras.attendanceStatus === 'present',
    hasReview: Boolean(extras.hasReview),
    myReview: extras.myReview || null
  };
};

export const listMyMeetings = async (req, res) => {
  try {
    const { filter = 'all' } = req.body;
    const query = {
      isDeleted: false,
      assignedUsers: req.user._id
    };

    if (filter === 'upcoming') {
      query.status = { $in: ['upcoming', 'live'] };
    } else if (filter === 'live') {
      query.status = 'live';
    } else if (filter === 'completed') {
      query.status = 'completed';
    }

    const meetings = await Meeting.find(query).sort({ meetingDate: 1, meetingTime: 1 });
    const ids = meetings.map((m) => m._id);

    const [attendance, reviews] = await Promise.all([
      Attendance.find({ userId: req.user._id, meetingId: { $in: ids } }).select('meetingId status'),
      MeetingReview.find({ userId: req.user._id, meetingId: { $in: ids } })
    ]);

    const attMap = new Map(attendance.map((a) => [a.meetingId.toString(), a.status]));
    const reviewMap = new Map(
      reviews.map((r) => [
        r.meetingId.toString(),
        { id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt }
      ])
    );

    const byDay = {};
    const list = meetings.map((m) => {
      const mid = m._id.toString();
      const item = formatMeeting(m, {
        attendanceStatus: attMap.get(mid) || null,
        hasReview: reviewMap.has(mid),
        myReview: reviewMap.get(mid) || null
      });
      const key = `Day ${m.dayNumber}`;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(item);
      return item;
    });

    return sendSuccess(res, 'Meetings fetched successfully', {
      meetings: list,
      byDay
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const joinMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const meeting = await Meeting.findOne({
      _id: meetingId,
      isDeleted: false,
      assignedUsers: req.user._id
    });

    if (!meeting) {
      return sendError(res, 'Meeting not found or not assigned to you', null, 404);
    }

    if (meeting.status === 'cancelled') {
      return sendError(res, 'This meeting has been cancelled', null, 400);
    }

    if (meeting.status === 'completed') {
      return sendError(res, 'This meeting is already completed. Attendance cannot be marked.', null, 400);
    }

    if (meeting.status !== 'live') {
      return sendError(
        res,
        'Meeting is not live yet. You can mark attendance only when status is Live.',
        { code: 'NOT_LIVE', status: meeting.status },
        400
      );
    }

    let record = await Attendance.findOne({
      meetingId: meeting._id,
      userId: req.user._id
    });

    if (record && record.status === 'present') {
      return sendSuccess(res, 'Already attended', {
        alreadyAttended: true,
        zoomLink: meeting.zoomLink,
        meeting: formatMeeting(meeting, { attendanceStatus: 'present' }),
        attendance: {
          id: record._id,
          status: record.status,
          joinedAt: record.joinedAt
        }
      });
    }

    record = await Attendance.findOneAndUpdate(
      { meetingId: meeting._id, userId: req.user._id },
      {
        $set: {
          status: 'present',
          joinedAt: new Date(),
          markedBy: 'user-join'
        },
        $setOnInsert: {
          meetingId: meeting._id,
          userId: req.user._id
        }
      },
      { upsert: true, new: true }
    );

    return sendSuccess(res, 'Attendance marked. Opening Zoom meeting...', {
      alreadyAttended: false,
      zoomLink: meeting.zoomLink,
      meeting: formatMeeting(meeting, { attendanceStatus: 'present' }),
      attendance: {
        id: record._id,
        status: record.status,
        joinedAt: record.joinedAt
      }
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Submit meeting review (attendees only, once)
export const submitMeetingReview = async (req, res) => {
  try {
    const { meetingId, rating, comment = '' } = req.body;
    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const score = Number(rating);
    if (!score || score < 1 || score > 5) {
      return sendError(res, 'Rating must be between 1 and 5', null, 400);
    }

    const meeting = await Meeting.findOne({
      _id: meetingId,
      isDeleted: false,
      assignedUsers: req.user._id
    });
    if (!meeting) return sendError(res, 'Meeting not found', null, 404);

    if (meeting.status !== 'completed') {
      return sendError(res, 'You can review only after the meeting is completed', null, 400);
    }

    const attendance = await Attendance.findOne({
      meetingId,
      userId: req.user._id,
      status: 'present'
    });
    if (!attendance) {
      return sendError(res, 'Only attendees who were present can submit a review', null, 403);
    }

    const existing = await MeetingReview.findOne({ meetingId, userId: req.user._id });
    if (existing) {
      return sendError(res, 'You already submitted a review for this meeting', null, 400);
    }

    const review = await MeetingReview.create({
      meetingId,
      userId: req.user._id,
      rating: score,
      comment: String(comment || '').trim().slice(0, 1000)
    });

    return sendSuccess(res, 'Review submitted successfully', {
      review: {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      }
    }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 'You already submitted a review for this meeting', null, 400);
    }
    return sendError(res, error.message, null, 500);
  }
};

export const myMeetingReviews = async (req, res) => {
  try {
    const reviews = await MeetingReview.find({ userId: req.user._id })
      .populate('meetingId', 'title meetingDate startTime endTime meetingTime status dayNumber sessionNumber')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Reviews fetched', {
      reviews: reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        meeting: r.meetingId
          ? {
              id: r.meetingId._id,
              title: r.meetingId.title,
              meetingDate: r.meetingId.meetingDate,
              startTime: r.meetingId.startTime || r.meetingId.meetingTime || '',
              endTime: r.meetingId.endTime || '',
              status: r.meetingId.status,
              dayNumber: r.meetingId.dayNumber,
              sessionNumber: r.meetingId.sessionNumber
            }
          : null
      }))
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  listMyMeetings,
  joinMeeting,
  submitMeetingReview,
  myMeetingReviews
};
