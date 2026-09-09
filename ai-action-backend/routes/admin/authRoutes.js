import express from 'express';
import {
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword
} from '../../controllers/admin/authController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';
import { uploadAdminAvatar } from '../../middlewares/upload.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, adminLogin);
router.post('/me', verifyAdminToken, getAdminProfile);
router.post('/update-profile', verifyAdminToken, uploadAdminAvatar.single('profilePhoto'), updateAdminProfile);
router.post('/change-password', verifyAdminToken, changeAdminPassword);

export default router;
