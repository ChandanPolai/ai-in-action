import { User, Meeting, Attendance, Recording } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import moment from 'moment';

// @desc    Admin Dashboard Stats
// @route   POST /api/admin/dashboard/stats
export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalMeetings,
      upcomingMeetings,
      completedMeetings,
      presentCount,
      absentCount,
      recentMeetings,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false, isActive: true }),
      User.countDocuments({ isDeleted: false, isActive: false }),
      Meeting.countDocuments({ isDeleted: false }),
      Meeting.countDocuments({ isDeleted: false, status: { $in: ['upcoming', 'live'] }, meetingDate: { $gte: moment().startOf('day').toDate() } }),
      Meeting.countDocuments({ isDeleted: false, status: 'completed' }),
      Attendance.countDocuments({ status: 'present' }),
      Attendance.countDocuments({ status: 'absent' }),
      Meeting.find({ isDeleted: false }).sort({ meetingDate: 1 }).limit(5).select('title meetingDate meetingTime status dayNumber sessionNumber'),
      User.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5).select('name email isActive profilePhoto createdAt')
    ]);

    return sendSuccess(res, 'Dashboard stats fetched successfully', {
      users: { total: totalUsers, active: activeUsers, inactive: inactiveUsers },
      meetings: { total: totalMeetings, upcoming: upcomingMeetings, completed: completedMeetings },
      attendance: {
        present: presentCount,
        absent: absentCount,
        total: presentCount + absentCount,
        presentRate: presentCount + absentCount > 0
          ? Math.round((presentCount / (presentCount + absentCount)) * 100)
          : 0
      },
      recentMeetings,
      recentUsers,
      generatedAt: now.toISOString()
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default { getDashboardStats };
