import express from 'express';
import { createComplaint, listMyComplaints } from '../../controllers/user/complaintController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';
import { uploadComplaintImage } from '../../middlewares/upload.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/create', uploadComplaintImage.single('image'), createComplaint);
router.post('/list', listMyComplaints);

export default router;
