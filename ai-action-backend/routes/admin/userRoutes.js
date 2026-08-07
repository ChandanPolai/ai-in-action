import express from 'express';
import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword
} from '../../controllers/admin/userController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';
import { uploadUserAvatar } from '../../middlewares/upload.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/create', uploadUserAvatar.single('profilePhoto'), createUser);
router.post('/list', listUsers);
router.post('/get', getUser);
router.post('/update', uploadUserAvatar.single('profilePhoto'), updateUser);
router.post('/delete', deleteUser);
router.post('/toggle-status', toggleUserStatus);
router.post('/reset-password', resetUserPassword);

export default router;
