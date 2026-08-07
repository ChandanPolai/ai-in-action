import { Attendance } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

// @desc    User attendance history
// @route   POST /api/user/attendance/history
export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user._id })
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
