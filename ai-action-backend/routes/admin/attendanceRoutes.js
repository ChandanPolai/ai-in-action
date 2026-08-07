import express from 'express';
import {
  listAttendance,
  getAttendanceByMeeting,
  updateAttendance,
  getAttendanceHistory
} from '../../controllers/admin/attendanceController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/list', listAttendance);
router.post('/by-meeting', getAttendanceByMeeting);
router.post('/update', updateAttendance);
router.post('/history', getAttendanceHistory);

export default router;
