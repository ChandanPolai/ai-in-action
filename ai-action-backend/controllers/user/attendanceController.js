import { Attendance, Meeting } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import moment from 'moment';

// @desc    User attendance history with filters
// @route   POST /api/user/attendance/history
export const getMyAttendance = async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.body;
    const query = { userId: req.user._id };

    if (status && ['present', 'absent'].includes(status)) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      const meetingQuery = { isDeleted: false };
      meetingQuery.meetingDate = {};
      if (dateFrom) meetingQuery.meetingDate.$gte = moment(dateFrom).startOf('day').toDate();
      if (dateTo) meetingQuery.meetingDate.$lte = moment(dateTo).endOf('day').toDate();

      const meetings = await Meeting.find(meetingQuery).select('_id');
      query.meetingId = { $in: meetings.map((m) => m._id) };
    }

    const records = await Attendance.find(query)
      .populate('meetingId', 'title meetingDate meetingTime dayNumber sessionNumber status')
      .sort({ createdAt: -1 });

    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;

    return sendSuccess(res, 'Attendance history fetched successfully', {
      summary: {
        present,
        absent,
        total: records.length,
        presentRate: records.length ? Math.round((present / records.length) * 100) : 0
      },
      records: records.map((a) => ({
        id: a._id,
        status: a.status,
        joinedAt: a.joinedAt,
        meeting: a.meetingId,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default { getMyAttendance };
