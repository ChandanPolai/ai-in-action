import express from 'express';
import {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  toggleMeetingStatus,
  markMeetingCompleted,
  listMeetingReviews
} from '../../controllers/admin/meetingController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/create', createMeeting);
router.post('/list', listMeetings);
router.post('/get', getMeeting);
router.post('/update', updateMeeting);
router.post('/delete', deleteMeeting);
router.post('/toggle-status', toggleMeetingStatus);
router.post('/mark-completed', markMeetingCompleted);
router.post('/reviews', listMeetingReviews);

export default router;
