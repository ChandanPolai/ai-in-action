import express from 'express';
import {
  listCertificates,
  generateAndSaveCertificates,
  sendCertificates,
  deleteCertificate,
  previewCertificate
} from '../../controllers/admin/certificateController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/list', listCertificates);
router.post('/generate', generateAndSaveCertificates);
router.post('/send', sendCertificates);
router.post('/delete', deleteCertificate);
router.post('/preview', previewCertificate);

export default router;
