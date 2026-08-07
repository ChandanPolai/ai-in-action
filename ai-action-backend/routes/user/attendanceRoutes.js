import express from 'express';
import { getMyAttendance } from '../../controllers/user/attendanceController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/history', getMyAttendance);

export default router;
