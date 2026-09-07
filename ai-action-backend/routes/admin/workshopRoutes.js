import express from 'express';
import {
  createWorkshop,
  listWorkshops,
  getWorkshop,
  updateWorkshop,
  deleteWorkshop,
  toggleWorkshopStatus,
  setWorkshopAccess,
  getWorkshopAccessMatrix
} from '../../controllers/admin/workshopController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';
import { uploadWorkshopImage } from '../../middlewares/upload.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/create', uploadWorkshopImage.single('image'), createWorkshop);
router.post('/list', listWorkshops);
router.post('/get', getWorkshop);
router.post('/update', uploadWorkshopImage.single('image'), updateWorkshop);
router.post('/delete', deleteWorkshop);
router.post('/toggle-status', toggleWorkshopStatus);
router.post('/set-access', setWorkshopAccess);
router.post('/access-matrix', getWorkshopAccessMatrix);

export default router;
