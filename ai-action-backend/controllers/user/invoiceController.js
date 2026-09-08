import { Invoice } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatInvoice = (inv) => ({
  id: inv._id,
  invoiceNumber: inv.invoiceNumber,
  invoiceDate: inv.invoiceDate,
  workshopTitle: inv.workshopId?.title || null,
  courseTitle: inv.courseId?.title || null,
  buyerName: inv.buyerName,
  buyerEmail: inv.buyerEmail,
  buyerMobile: inv.buyerMobile,
  buyerAddress: inv.buyerAddress,
  buyerGstin: inv.buyerGstin,
  buyerState: inv.buyerState,
  companyName: inv.companyName,
  companyAddress: inv.companyAddress,
  companyGstin: inv.companyGstin,
  companyState: inv.companyState,
  companyEmail: inv.companyEmail,
  companyPhone: inv.companyPhone,
  companyPan: inv.companyPan,
  description: inv.description,
  taxableAmount: inv.taxableAmount,
  gstPercent: inv.gstPercent,
  cgstAmount: inv.cgstAmount,
  sgstAmount: inv.sgstAmount,
  igstAmount: inv.igstAmount,
  gstAmount: inv.gstAmount,
  totalAmount: inv.totalAmount,
  amountPaid: inv.amountPaid,
  paymentMode: inv.paymentMode,
  paymentStatus: inv.paymentStatus,
  notes: inv.notes,
  createdAt: inv.createdAt
});

// @desc    List my invoices
// @route   POST /api/user/invoices/list
export const listMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      userId: req.user._id,
      isDeleted: false
    })
      .populate('workshopId', 'title')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Invoices fetched successfully', {
      invoices: invoices.map(formatInvoice)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get my invoice
// @route   POST /api/user/invoices/get
export const getMyInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return sendError(res, 'invoiceId is required', null, 400);

    const inv = await Invoice.findOne({
      _id: invoiceId,
      userId: req.user._id,
      isDeleted: false
    })
      .populate('workshopId', 'title')
      .populate('courseId', 'title');

    if (!inv) return sendError(res, 'Invoice not found', null, 404);
    return sendSuccess(res, 'Invoice fetched', { invoice: formatInvoice(inv) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
