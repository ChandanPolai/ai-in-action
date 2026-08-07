import { Meeting, Attendance } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { grantVideoAccessToAbsentees } from '../../utils/videoAccess.js';
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
  assignedUsers: m.assignedUsers,
  status: m.status,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt
});

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

// @desc    Create Meeting
// @route   POST /api/admin/meetings/create
export const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description,
      meetingDate,
      meetingTime,
      zoomLink,
      dayNumber = 1,
      sessionNumber = 1,
      organizationType = 'day-wise',
      assignedUsers = [],
      status = 'upcoming'
    } = req.body;

    if (!title || !meetingDate || !meetingTime || !zoomLink) {
      return sendError(res, 'Title, date, time and Zoom link are required', null, 400);
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description || '',
      meetingDate: new Date(meetingDate),
      meetingTime: meetingTime.trim(),
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
// @route   POST /api/admin/meetings/list
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

// @desc    Get Meeting
// @route   POST /api/admin/meetings/get
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

// @desc    Update Meeting
// @route   POST /api/admin/meetings/update
export const updateMeeting = async (req, res) => {
  try {
    const {
      meetingId,
      title,
      description,
      meetingDate,
      meetingTime,
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
    if (meetingTime) meeting.meetingTime = meetingTime.trim();
    if (zoomLink) meeting.zoomLink = zoomLink.trim();
    if (dayNumber !== undefined) meeting.dayNumber = Number(dayNumber);
    if (sessionNumber !== undefined) meeting.sessionNumber = Number(sessionNumber);
    if (organizationType) meeting.organizationType = organizationType;
    if (status) meeting.status = status;
    if (Array.isArray(assignedUsers)) meeting.assignedUsers = assignedUsers;

    await meeting.save();
    await ensureAbsentRecords(meeting);
    await meeting.populate('assignedUsers', 'name email profilePhoto');

    return sendSuccess(res, 'Meeting updated successfully', { meeting: formatMeeting(meeting) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Delete Meeting
// @route   POST /api/admin/meetings/delete
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

// @desc    Mark meeting completed (helper)
// @route   POST /api/admin/meetings/mark-completed
export const markMeetingCompleted = async (req, res) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) return sendError(res, 'meetingId is required', null, 400);

    const meeting = await Meeting.findOne({ _id: meetingId, isDeleted: false });
    if (!meeting) return sendError(res, 'Meeting not found', null, 404);

    meeting.status = 'completed';
    await meeting.save();

    // Auto: all absentees get video access for linked / same day-session recordings
    const grant = await grantVideoAccessToAbsentees(meeting._id);

    return sendSuccess(res, 'Meeting marked as completed. Absentees auto-assigned video access.', {
      meeting: formatMeeting(meeting),
      videoAccess: grant
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
  markMeetingCompleted
};
