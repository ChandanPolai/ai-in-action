import express from 'express';
import { listMyInvoices, getMyInvoice } from '../../controllers/user/invoiceController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listMyInvoices);
router.post('/get', getMyInvoice);

export default router;
