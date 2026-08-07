import express from 'express';
import { getDashboardStats } from '../../controllers/admin/dashboardController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminToken);
router.post('/stats', getDashboardStats);

export default router;
