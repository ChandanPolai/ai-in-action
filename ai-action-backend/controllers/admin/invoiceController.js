import { Invoice, User, Workshop, Course, AppSettings } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const getOrCreateSettings = async () => {
  let settings = await AppSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await AppSettings.create({ key: 'global' });
  }
  return settings;
};

const companyFromSettings = (s) => ({
  companyName: s.companyName || 'AI in Action',
  companyAddress: s.companyAddress || '',
  companyGstin: s.companyGstin || '',
  companyState: s.companyState || '',
  companyEmail: s.companyEmail || '',
  companyPhone: s.companyPhone || '',
  companyPan: s.companyPan || '',
  invoicePrefix: s.invoicePrefix || 'INV'
});

const calcGst = ({ taxableAmount, gstPercent, companyState, buyerState }) => {
  const taxable = round2(taxableAmount);
  const percent = Math.max(0, Number(gstPercent) || 0);
  const gstAmount = round2((taxable * percent) / 100);
  const totalAmount = round2(taxable + gstAmount);

  const sameState =
    companyState &&
    buyerState &&
    String(companyState).trim().toLowerCase() === String(buyerState).trim().toLowerCase();

  // Intra-state → CGST + SGST; inter-state / unknown → IGST
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (sameState) {
    cgstAmount = round2(gstAmount / 2);
    sgstAmount = round2(gstAmount - cgstAmount);
  } else {
    igstAmount = gstAmount;
  }

  return { taxableAmount: taxable, gstPercent: percent, cgstAmount, sgstAmount, igstAmount, gstAmount, totalAmount };
};

const nextInvoiceNumber = async (prefix = 'INV') => {
  const year = new Date().getFullYear();
  const safePrefix = String(prefix || 'INV').replace(/[^A-Za-z0-9-]/g, '').toUpperCase() || 'INV';
  const re = new RegExp(`^${safePrefix}-${year}-`);
  const latest = await Invoice.find({ invoiceNumber: re })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .select('invoiceNumber');

  let seq = 1;
  if (latest[0]?.invoiceNumber) {
    const parts = latest[0].invoiceNumber.split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(last)) seq = last + 1;
  }
  return `${safePrefix}-${year}-${String(seq).padStart(4, '0')}`;
};

const formatInvoice = (inv) => ({
  id: inv._id,
  invoiceNumber: inv.invoiceNumber,
  invoiceDate: inv.invoiceDate,
  userId: inv.userId?._id || inv.userId,
  userName: inv.userId?.name || inv.buyerName,
  workshopId: inv.workshopId?._id || inv.workshopId || null,
  workshopTitle: inv.workshopId?.title || null,
  courseId: inv.courseId?._id || inv.courseId || null,
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
  createdAt: inv.createdAt,
  updatedAt: inv.updatedAt
});

// @desc    Get company billing settings
// @route   POST /api/admin/invoices/company/get
export const getCompanySettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return sendSuccess(res, 'Company settings fetched', { company: companyFromSettings(settings) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update company billing settings
// @route   POST /api/admin/invoices/company/update
export const updateCompanySettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const fields = [
      'companyName',
      'companyAddress',
      'companyGstin',
      'companyState',
      'companyEmail',
      'companyPhone',
      'companyPan',
      'invoicePrefix'
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) settings[f] = String(req.body[f] ?? '').trim();
    });
    await settings.save();
    return sendSuccess(res, 'Company settings updated', { company: companyFromSettings(settings) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List invoices
// @route   POST /api/admin/invoices/list
export const listInvoices = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 100 } = req.body;
    const query = { isDeleted: false };

    if (search && String(search).trim()) {
      const q = String(search).trim();
      query.$or = [
        { invoiceNumber: new RegExp(q, 'i') },
        { buyerName: new RegExp(q, 'i') },
        { buyerEmail: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') }
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('userId', 'name email mobileNumber')
        .populate('workshopId', 'title')
        .populate('courseId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(query)
    ]);

    return sendSuccess(res, 'Invoices fetched successfully', {
      invoices: invoices.map(formatInvoice),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get one invoice
// @route   POST /api/admin/invoices/get
export const getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return sendError(res, 'invoiceId is required', null, 400);

    const inv = await Invoice.findOne({ _id: invoiceId, isDeleted: false })
      .populate('userId', 'name email mobileNumber')
      .populate('workshopId', 'title')
      .populate('courseId', 'title');

    if (!inv) return sendError(res, 'Invoice not found', null, 404);
    return sendSuccess(res, 'Invoice fetched', { invoice: formatInvoice(inv) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Create / generate GST invoice
// @route   POST /api/admin/invoices/create
export const createInvoice = async (req, res) => {
  try {
    const {
      userId,
      workshopId = null,
      courseId = null,
      buyerName,
      buyerEmail = '',
      buyerMobile = '',
      buyerAddress = '',
      buyerGstin = '',
      buyerState = '',
      description = 'Training / Workshop Fee',
      taxableAmount,
      gstPercent = 18,
      amountPaid,
      paymentMode = '',
      paymentStatus,
      notes = '',
      invoiceDate
    } = req.body;

    if (!userId) return sendError(res, 'Select a user', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) return sendError(res, 'User not found', null, 404);

    if (workshopId) {
      const w = await Workshop.findOne({ _id: workshopId, isDeleted: false });
      if (!w) return sendError(res, 'Workshop not found', null, 404);
    }
    if (courseId) {
      const c = await Course.findOne({ _id: courseId, isDeleted: false });
      if (!c) return sendError(res, 'Course not found', null, 404);
    }

    const taxable = Number(taxableAmount);
    if (Number.isNaN(taxable) || taxable < 0) {
      return sendError(res, 'Valid taxable amount is required', null, 400);
    }

    const settings = await getOrCreateSettings();
    const company = companyFromSettings(settings);

    const name = String(buyerName || user.name || '').trim();
    if (!name) return sendError(res, 'Buyer name is required', null, 400);

    const amounts = calcGst({
      taxableAmount: taxable,
      gstPercent,
      companyState: company.companyState,
      buyerState: buyerState || ''
    });

    let paid = amountPaid !== undefined && amountPaid !== '' ? round2(amountPaid) : amounts.totalAmount;
    if (paid < 0) paid = 0;

    let status = paymentStatus;
    if (!status) {
      if (paid <= 0) status = 'unpaid';
      else if (paid + 0.001 < amounts.totalAmount) status = 'partial';
      else status = 'paid';
    }

    const invoiceNumber = await nextInvoiceNumber(company.invoicePrefix);

    const inv = await Invoice.create({
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      userId: user._id,
      workshopId: workshopId || null,
      courseId: courseId || null,
      buyerName: name,
      buyerEmail: String(buyerEmail || user.email || '').trim(),
      buyerMobile: String(buyerMobile || user.mobileNumber || '').trim(),
      buyerAddress: String(buyerAddress || '').trim(),
      buyerGstin: String(buyerGstin || '').trim(),
      buyerState: String(buyerState || '').trim(),
      ...company,
      description: String(description || 'Training / Workshop Fee').trim(),
      ...amounts,
      amountPaid: paid,
      paymentMode: String(paymentMode || '').trim(),
      paymentStatus: status,
      notes: String(notes || '').trim(),
      createdBy: req.admin._id
    });

    await inv.populate([
      { path: 'userId', select: 'name email mobileNumber' },
      { path: 'workshopId', select: 'title' },
      { path: 'courseId', select: 'title' }
    ]);

    return sendSuccess(res, 'Invoice generated successfully', { invoice: formatInvoice(inv) }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 'Invoice number conflict, please try again', null, 409);
    }
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Soft delete invoice
// @route   POST /api/admin/invoices/delete
export const deleteInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return sendError(res, 'invoiceId is required', null, 400);

    const inv = await Invoice.findOne({ _id: invoiceId, isDeleted: false });
    if (!inv) return sendError(res, 'Invoice not found', null, 404);

    inv.isDeleted = true;
    await inv.save();
    return sendSuccess(res, 'Invoice deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
