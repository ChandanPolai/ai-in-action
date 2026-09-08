import express from 'express';
import { listMyCertificates } from '../../controllers/user/certificateController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyCertificates);

export default router;
