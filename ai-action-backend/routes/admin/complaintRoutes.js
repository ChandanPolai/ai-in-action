import express from 'express';
import {
  listComplaints,
  updateComplaint,
  deleteComplaint
} from '../../controllers/admin/complaintController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminToken);
router.post('/list', listComplaints);
router.post('/update', updateComplaint);
router.post('/delete', deleteComplaint);

export default router;
