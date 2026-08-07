import { Meeting, Attendance } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import moment from 'moment';

const formatMeeting = (m) => ({
  id: m._id,
  title: m.title,
  description: m.description,
  meetingDate: m.meetingDate,
  meetingTime: m.meetingTime,
  zoomLink: m.zoomLink,
  dayNumber: m.dayNumber,
  sessionNumber: m.sessionNumber,
  organizationType: m.organizationType,
  status: m.status
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

    const now = moment().startOf('day').toDate();

    if (filter === 'upcoming') {
      query.status = { $in: ['upcoming', 'live'] };
      query.meetingDate = { $gte: now };
    } else if (filter === 'completed') {
      query.status = 'completed';
    }

    const meetings = await Meeting.find(query).sort({ meetingDate: 1, meetingTime: 1 });

    // Group day-wise for UI
    const byDay = {};
    meetings.forEach((m) => {
      const key = `Day ${m.dayNumber}`;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(formatMeeting(m));
    });

    return sendSuccess(res, 'Meetings fetched successfully', {
      meetings: meetings.map(formatMeeting),
      byDay
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Join meeting — marks present + returns zoom link
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

    const record = await Attendance.findOneAndUpdate(
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
      zoomLink: meeting.zoomLink,
      meeting: formatMeeting(meeting),
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
