import express from 'express';
import {
  listMyWorkshops,
  listMyRecordings,
  watchRecording,
  saveWatchProgress,
  completeWatch,
  streamRecording,
  requestMorePlays,
  myPlayRequests
} from '../../controllers/user/recordingController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';
import { verifyStreamAccess } from '../../middlewares/streamAuth.js';

const router = express.Router();

// Stream uses short-lived stream token only (not login usertoken in URL)
router.get('/stream/:recordingId', verifyStreamAccess, streamRecording);
router.head('/stream/:recordingId', verifyStreamAccess, streamRecording);

router.use(verifyUserToken);
router.post('/workshops', listMyWorkshops);
router.post('/list', listMyRecordings);
router.post('/watch', watchRecording);
router.post('/progress', saveWatchProgress);
router.post('/complete', completeWatch);
router.post('/request-play', requestMorePlays);
router.post('/my-requests', myPlayRequests);

export default router;
