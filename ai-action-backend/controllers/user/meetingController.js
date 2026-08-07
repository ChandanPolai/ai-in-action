import { Meeting, Attendance } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatMeeting = (m, attendanceStatus = null) => ({
  id: m._id,
  title: m.title,
  description: m.description,
  meetingDate: m.meetingDate,
  meetingTime: m.meetingTime,
  zoomLink: m.zoomLink,
  dayNumber: m.dayNumber,
  sessionNumber: m.sessionNumber,
  organizationType: m.organizationType,
  status: m.status,
  attendanceStatus,
  alreadyAttended: attendanceStatus === 'present'
});

// @desc    List meetings assigned to logged-in user
// @route   POST /api/user/meetings/list
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

    const attendance = await Attendance.find({
      userId: req.user._id,
      meetingId: { $in: meetings.map((m) => m._id) }
    }).select('meetingId status');

    const attMap = new Map(attendance.map((a) => [a.meetingId.toString(), a.status]));

    const byDay = {};
    const list = meetings.map((m) => {
      const item = formatMeeting(m, attMap.get(m._id.toString()) || null);
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

// @desc    Join meeting — only when Live; marks present once
// @route   POST /api/user/meetings/join
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
        meeting: formatMeeting(meeting, 'present'),
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
      meeting: formatMeeting(meeting, 'present'),
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

export default {
  listMyMeetings,
  joinMeeting
};
