import express from 'express';
import {
  createBonus,
  listBonuses,
  getBonus,
  updateBonus,
  deleteBonus,
  toggleBonusStatus,
  setBonusAccess,
  getBonusAccessMatrix
} from '../../controllers/admin/bonusController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';
import { uploadBonusImage } from '../../middlewares/upload.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/create', uploadBonusImage.single('image'), createBonus);
router.post('/list', listBonuses);
router.post('/get', getBonus);
router.post('/update', uploadBonusImage.single('image'), updateBonus);
router.post('/delete', deleteBonus);
router.post('/toggle-status', toggleBonusStatus);
router.post('/set-access', setBonusAccess);
router.post('/access-matrix', getBonusAccessMatrix);

export default router;
