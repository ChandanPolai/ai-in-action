import express from 'express';
import {
  getCompanySettings,
  updateCompanySettings,
  listInvoices,
  getInvoice,
  createInvoice,
  deleteInvoice
} from '../../controllers/admin/invoiceController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/company/get', getCompanySettings);
router.post('/company/update', updateCompanySettings);
router.post('/list', listInvoices);
router.post('/get', getInvoice);
router.post('/create', createInvoice);
router.post('/delete', deleteInvoice);

export default router;
