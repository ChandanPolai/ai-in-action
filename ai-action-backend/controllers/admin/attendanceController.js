import { Attendance, Meeting, User } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { grantVideoAccessToUserForMeeting } from '../../utils/videoAccess.js';
import moment from 'moment';

const formatAttendance = (a) => ({
  id: a._id,
  meetingId: a.meetingId,
  userId: a.userId,
  status: a.status,
  joinedAt: a.joinedAt,
  markedBy: a.markedBy,
  notes: a.notes,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt
});

const resolveMeetingIdsByDate = async ({ dateFrom, dateTo, meetingId }) => {
  const meetingQuery = { isDeleted: false };

  if (meetingId) {
    meetingQuery._id = meetingId;
  }

  if (dateFrom || dateTo) {
    meetingQuery.meetingDate = {};
    if (dateFrom) meetingQuery.meetingDate.$gte = moment(dateFrom).startOf('day').toDate();
    if (dateTo) meetingQuery.meetingDate.$lte = moment(dateTo).endOf('day').toDate();
  }

  if (!dateFrom && !dateTo && !meetingId) {
    return null;
  }

  if (!dateFrom && !dateTo && meetingId) {
    return [meetingId];
  }

  const meetings = await Meeting.find(meetingQuery).select('_id');
  return meetings.map((m) => m._id);
};

// @desc    List attendance with filters
// @route   POST /api/admin/attendance/list
export const listAttendance = async (req, res) => {
  try {
    const { meetingId, userId, status, dateFrom, dateTo, page = 1, limit = 200 } = req.body;
    const query = {};

    if (userId) query.userId = userId;
    if (status && ['present', 'absent'].includes(status)) query.status = status;

    if (dateFrom || dateTo || meetingId) {
      const meetingIds = await resolveMeetingIdsByDate({ dateFrom, dateTo, meetingId });
      query.meetingId = { $in: meetingIds || [] };
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('userId', 'name email mobileNumber profilePhoto')
        .populate('meetingId', 'title meetingDate meetingTime dayNumber sessionNumber status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Attendance.countDocuments(query)
    ]);

    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;

    return sendSuccess(res, 'Attendance fetched successfully', {
      records: records.map(formatAttendance),
      summary: {
        present,
        absent,
        total: records.length,
        presentRate: records.length ? Math.round((present / records.length) * 100) : 0
      },
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get attendance for a meeting
// @route   POST /api/admin/attendance/by-meeting
export const getAttendanceByMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
    if (!meeting) return sendError(res, 'Meeting not found', null, 404);

    const records = await Attendance.find({ meetingId })
      .populate('userId', 'name email mobileNumber profilePhoto isActive')
      .sort({ status: -1 });

    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;

    return sendSuccess(res, 'Meeting attendance fetched successfully', {
      meeting: {
        id: meeting._id,
        title: meeting.title,
        meetingDate: meeting.meetingDate,
        meetingTime: meeting.meetingTime
      },
      summary: { present, absent, total: records.length },
      records: records.map(formatAttendance)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Manually update attendance status
// @route   POST /api/admin/attendance/update
export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId, meetingId, userId, status, notes } = req.body;

    if (!['present', 'absent'].includes(status)) {
      return sendError(res, 'Status must be present or absent', null, 400);
    }

    let record = null;

    if (attendanceId) {
      record = await Attendance.findById(attendanceId);
    } else if (meetingId && userId) {
      record = await Attendance.findOneAndUpdate(
        { meetingId, userId },
        {
          $set: {
            status,
            markedBy: 'admin',
            notes: notes || '',
            joinedAt: status === 'present' ? new Date() : null
          },
          $setOnInsert: { meetingId, userId }
        },
        { upsert: true, new: true }
      );
    } else {
      return sendError(res, 'attendanceId or (meetingId + userId) required', null, 400);
    }

    if (!record && attendanceId) {
      return sendError(res, 'Attendance record not found', null, 404);
    }

    if (attendanceId && record) {
      record.status = status;
      record.markedBy = 'admin';
      if (notes !== undefined) record.notes = notes;
      record.joinedAt = status === 'present' ? record.joinedAt || new Date() : null;
      await record.save();
    }

    await record.populate('userId', 'name email profilePhoto');
    await record.populate('meetingId', 'title meetingDate meetingTime');

    // Auto: if marked absent → grant video access for that meeting's recordings
    if (record.status === 'absent' && record.meetingId && record.userId) {
      const meetingId = record.meetingId._id || record.meetingId;
      const userId = record.userId._id || record.userId;
      await grantVideoAccessToUserForMeeting(meetingId, userId);
    }

    return sendSuccess(res, 'Attendance updated successfully', { record: formatAttendance(record) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Attendance history / summary by user
// @route   POST /api/admin/attendance/history
export const getAttendanceHistory = async (req, res) => {
  try {
    const { userId, dateFrom, dateTo, status } = req.body;
    if (!userId) return sendError(res, 'userId is required', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false }).select('name email');
    if (!user) return sendError(res, 'User not found', null, 404);

    const query = { userId };
    if (status && ['present', 'absent'].includes(status)) query.status = status;

    if (dateFrom || dateTo) {
      const meetingIds = await resolveMeetingIdsByDate({ dateFrom, dateTo });
      query.meetingId = { $in: meetingIds || [] };
    }

    const records = await Attendance.find(query)
      .populate('meetingId', 'title meetingDate meetingTime dayNumber sessionNumber status')
      .sort({ createdAt: -1 });

    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;

    return sendSuccess(res, 'Attendance history fetched successfully', {
      user: { id: user._id, name: user.name, email: user.email },
      summary: { present, absent, total: records.length },
      records: records.map(formatAttendance)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  listAttendance,
  getAttendanceByMeeting,
  updateAttendance,
  getAttendanceHistory
};
