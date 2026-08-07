import express from 'express';
import {
  listMyMeetings,
  joinMeeting,
  submitMeetingReview,
  myMeetingReviews
} from '../../controllers/user/meetingController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyMeetings);
router.post('/join', joinMeeting);
router.post('/review', submitMeetingReview);
router.post('/my-reviews', myMeetingReviews);

export default router;
