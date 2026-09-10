import express from 'express';
import { listMyCertificates, previewMyCertificate } from '../../controllers/user/certificateController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyCertificates);
router.post('/preview', previewMyCertificate);

export default router;
