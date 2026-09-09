import express from 'express';
import {
  userLogin,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  changeUserPassword
} from '../../controllers/user/authController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';
import { uploadUserAvatar } from '../../middlewares/upload.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, userLogin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/me', verifyUserToken, getUserProfile);
router.post('/update-profile', verifyUserToken, uploadUserAvatar.single('profilePhoto'), updateUserProfile);
router.post('/change-password', verifyUserToken, changeUserPassword);

export default router;
