import express from 'express';
import {
  createRecording,
  listRecordings,
  getRecording,
  updateRecording,
  deleteRecording,
  setRecordingAccess,
  getAccessMatrix
} from '../../controllers/admin/recordingController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';
import { uploadRecordingVideo } from '../../middlewares/upload.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/create', uploadRecordingVideo.single('videoFile'), createRecording);
router.post('/list', listRecordings);
router.post('/get', getRecording);
router.post('/update', uploadRecordingVideo.single('videoFile'), updateRecording);
router.post('/delete', deleteRecording);
router.post('/set-access', setRecordingAccess);
router.post('/access-matrix', getAccessMatrix);

export default router;
