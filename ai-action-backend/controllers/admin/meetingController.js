import { Meeting, Attendance, MeetingReview } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { grantVideoAccessToAbsentees } from '../../utils/videoAccess.js';
import { completeMeetingAndNotify } from '../../utils/meetingSchedule.js';
import moment from 'moment';

const formatMeeting = (m) => {
  const startTime = m.startTime || m.meetingTime || '';
  const endTime = m.endTime || '';
  return {
    id: m._id,
    title: m.title,
    description: m.description,
    meetingDate: m.meetingDate,
    meetingTime: startTime,
    startTime,
    endTime,
    zoomLink: m.zoomLink,
    dayNumber: m.dayNumber,
    sessionNumber: m.sessionNumber,
    organizationType: m.organizationType,
    assignedUsers: m.assignedUsers,
    status: m.status,
    reviewEmailSent: m.reviewEmailSent || false,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  };
};

const ensureAbsentRecords = async (meeting) => {
  if (!meeting.assignedUsers?.length) return;

  const ops = meeting.assignedUsers.map((userId) => ({
    updateOne: {
      filter: { meetingId: meeting._id, userId },
      update: {
        $setOnInsert: {
          meetingId: meeting._id,
          userId,
          status: 'absent',
          markedBy: 'system'
        }
      },
      upsert: true
    }
  }));

  if (ops.length) await Attendance.bulkWrite(ops);
};

const resolveTimes = ({ meetingTime, startTime, endTime }) => {
  const start = String(startTime || meetingTime || '').trim();
  const end = String(endTime || '').trim();
  return { start, end };
};

// @desc    Create Meeting
export const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description,
      meetingDate,
      meetingTime,
      startTime,
      endTime,
      zoomLink,
      dayNumber = 1,
      sessionNumber = 1,
      organizationType = 'day-wise',
      assignedUsers = [],
      status = 'upcoming'
    } = req.body;

    const times = resolveTimes({ meetingTime, startTime, endTime });

    if (!title || !meetingDate || !times.start || !times.end || !zoomLink) {
      return sendError(res, 'Title, date, start time, end time and Zoom link are required', null, 400);
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description || '',
      meetingDate: new Date(meetingDate),
      meetingTime: times.start,
      startTime: times.start,
      endTime: times.end,
      zoomLink: zoomLink.trim(),
      dayNumber: Number(dayNumber) || 1,
      sessionNumber: Number(sessionNumber) || 1,
      organizationType,
      assignedUsers,
      status,
      createdBy: req.admin._id
    });

    await ensureAbsentRecords(meeting);
    await meeting.populate('assignedUsers', 'name email profilePhoto');

    return sendSuccess(res, 'Meeting created successfully', { meeting: formatMeeting(meeting) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List Meetings
export const listMeetings = async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      dayNumber,
      sessionNumber,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.body;
    const query = { isDeleted: false };

    if (status && status !== 'all') query.status = status;
    if (dayNumber) query.dayNumber = Number(dayNumber);
    if (sessionNumber) query.sessionNumber = Number(sessionNumber);

    if (dateFrom || dateTo) {
      query.meetingDate = {};
      if (dateFrom) query.meetingDate.$gte = moment(dateFrom).startOf('day').toDate();
      if (dateTo) query.meetingDate.$lte = moment(dateTo).endOf('day').toDate();
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { description: regex }];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [meetings, total] = await Promise.all([
      Meeting.find(query)
        .populate('assignedUsers', 'name email profilePhoto')
        .sort({ meetingDate: -1, meetingTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Meeting.countDocuments(query)
    ]);

    return sendSuccess(res, 'Meetings fetched successfully', {
      meetings: meetings.map(formatMeeting),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const getMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false }).populate(
      'assignedUsers',
      'name email profilePhoto mobileNumber'
    );
    if (!meeting) return sendError(res, 'Meeting not found', null, 404);

    return sendSuccess(res, 'Meeting fetched successfully', { meeting: formatMeeting(meeting) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const {
      meetingId,
      title,
      description,
      meetingDate,
      meetingTime,
      startTime,
      endTime,
      zoomLink,
      dayNumber,
      sessionNumber,
      organizationType,
      assignedUsers,
      status
    } = req.body;

    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
    if (!meeting) return sendError(res, 'Meeting not found', null, 404);

    if (title !== undefined) meeting.title = title.trim();
    if (description !== undefined) meeting.description = description;
    if (meetingDate) meeting.meetingDate = new Date(meetingDate);
    if (zoomLink) meeting.zoomLink = zoomLink.trim();
    if (dayNumber !== undefined) meeting.dayNumber = Number(dayNumber);
    if (sessionNumber !== undefined) meeting.sessionNumber = Number(sessionNumber);
    if (organizationType) meeting.organizationType = organizationType;
    if (status) meeting.status = status;
    if (Array.isArray(assignedUsers)) meeting.assignedUsers = assignedUsers;

    if (startTime !== undefined || meetingTime !== undefined || endTime !== undefined) {
      const times = resolveTimes({
        meetingTime: meetingTime !== undefined ? meetingTime : meeting.meetingTime,
        startTime: startTime !== undefined ? startTime : meeting.startTime,
        endTime: endTime !== undefined ? endTime : meeting.endTime
      });
      if (times.start) {
        meeting.meetingTime = times.start;
        meeting.startTime = times.start;
      }
      if (times.end) meeting.endTime = times.end;
    }

    await meeting.save();
    await ensureAbsentRecords(meeting);
    await meeting.populate('assignedUsers', 'name email profilePhoto');

    return sendSuccess(res, 'Meeting updated successfully', { meeting: formatMeeting(meeting) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
    if (!meeting) return sendError(res, 'Meeting not found', null, 404);

    meeting.isDeleted = true;
    await meeting.save();

    return sendSuccess(res, 'Meeting deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const markMeetingCompleted = async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
    if (!meeting) return sendError(res, 'Meeting not found', null, 404);

    const result = await completeMeetingAndNotify(meeting);
    await meeting.populate('assignedUsers', 'name email profilePhoto');

    return sendSuccess(res, 'Meeting marked as completed. Absentees got video access. Attendees got review email.', {
      meeting: formatMeeting(meeting),
      result
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List reviews for a meeting (or all) with filters
export const listMeetingReviews = async (req, res) => {
  try {
    const {
      meetingId,
      rating,
      search = '',
      dateFrom,
      dateTo,
      page = 1,
      limit = 100
    } = req.body;

    const query = {};
    if (meetingId && meetingId !== 'all') query.meetingId = meetingId;

    const ratingNum = Number(rating);
    if (rating && rating !== 'all' && ratingNum >= 1 && ratingNum <= 5) {
      query.rating = ratingNum;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = moment(dateFrom).startOf('day').toDate();
      if (dateTo) query.createdAt.$lte = moment(dateTo).endOf('day').toDate();
    }

    let reviews = await MeetingReview.find(query)
      .populate('userId', 'name email mobileNumber')
      .populate('meetingId', 'title meetingDate startTime endTime meetingTime dayNumber sessionNumber')
      .sort({ createdAt: -1 });

    const q = String(search || '').trim().toLowerCase();
    if (q) {
      reviews = reviews.filter((r) => {
        const userName = r.userId?.name?.toLowerCase() || '';
        const userEmail = r.userId?.email?.toLowerCase() || '';
        const meetingTitle = r.meetingId?.title?.toLowerCase() || '';
        const comment = (r.comment || '').toLowerCase();
        return (
          userName.includes(q) ||
          userEmail.includes(q) ||
          meetingTitle.includes(q) ||
          comment.includes(q)
        );
      });
    }

    const total = reviews.length;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const paged = reviews.slice(skip, skip + Number(limit));

    const avgRating =
      total > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10 : 0;

    // Meeting-wise summary from current filtered set
    const byMeetingMap = new Map();
    for (const r of reviews) {
      const mid = r.meetingId?._id?.toString() || 'unknown';
      if (!byMeetingMap.has(mid)) {
        byMeetingMap.set(mid, {
          meetingId: mid === 'unknown' ? null : mid,
          title: r.meetingId?.title || 'Unknown meeting',
          meetingDate: r.meetingId?.meetingDate || null,
          dayNumber: r.meetingId?.dayNumber,
          sessionNumber: r.meetingId?.sessionNumber,
          count: 0,
          totalRating: 0
        });
      }
      const row = byMeetingMap.get(mid);
      row.count += 1;
      row.totalRating += r.rating;
    }

    const byMeeting = [...byMeetingMap.values()]
      .map((row) => ({
        meetingId: row.meetingId,
        title: row.title,
        meetingDate: row.meetingDate,
        dayNumber: row.dayNumber,
        sessionNumber: row.sessionNumber,
        count: row.count,
        avgRating: Math.round((row.totalRating / row.count) * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);

    return sendSuccess(res, 'Reviews fetched', {
      reviews: paged.map((r) => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: r.userId
          ? {
              id: r.userId._id,
              name: r.userId.name,
              email: r.userId.email,
              mobileNumber: r.userId.mobileNumber
            }
          : null,
        meeting: r.meetingId
          ? {
              id: r.meetingId._id,
              title: r.meetingId.title,
              meetingDate: r.meetingId.meetingDate,
              startTime: r.meetingId.startTime || r.meetingId.meetingTime,
              endTime: r.meetingId.endTime || '',
              dayNumber: r.meetingId.dayNumber,
              sessionNumber: r.meetingId.sessionNumber
            }
          : null
      })),
      total,
      avgRating,
      byMeeting,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  markMeetingCompleted,
  listMeetingReviews
};
