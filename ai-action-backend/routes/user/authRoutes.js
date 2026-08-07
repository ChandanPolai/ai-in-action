import express from 'express';
import {
  userLogin,
  getUserProfile,
  updateUserProfile,
  changeUserPassword
} from '../../controllers/user/authController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';
import { uploadUserAvatar } from '../../middlewares/upload.js';

const router = express.Router();

router.post('/login', userLogin);
router.post('/me', verifyUserToken, getUserProfile);
router.post('/update-profile', verifyUserToken, uploadUserAvatar.single('profilePhoto'), updateUserProfile);
router.post('/change-password', verifyUserToken, changeUserPassword);

export default router;
