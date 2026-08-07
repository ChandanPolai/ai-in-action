import express from 'express';
import { listMyMeetings, joinMeeting } from '../../controllers/user/meetingController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyMeetings);
router.post('/join', joinMeeting);

export default router;
