import express from 'express';
import { listMyRecordings, watchRecording } from '../../controllers/user/recordingController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyRecordings);
router.post('/watch', watchRecording);

export default router;
