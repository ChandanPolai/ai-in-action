import express from 'express';
import {
  listMyRecordings,
  watchRecording,
  streamRecording,
  requestMorePlays,
  myPlayRequests
} from '../../controllers/user/recordingController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyRecordings);
router.post('/watch', watchRecording);
router.get('/stream/:recordingId', streamRecording);
router.post('/request-play', requestMorePlays);
router.post('/my-requests', myPlayRequests);

export default router;
