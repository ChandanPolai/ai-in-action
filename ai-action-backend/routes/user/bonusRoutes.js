import express from 'express';
import { listMyBonuses } from '../../controllers/user/bonusController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyBonuses);

export default router;
