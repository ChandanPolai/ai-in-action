import mongoose from 'mongoose';

/**
 * GST invoice / bill issued by admin to a participant (user).
 */
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      default: null
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
    },
    // Buyer (snapshot at issue time)
    buyerName: { type: String, required: true, trim: true },
    buyerEmail: { type: String, default: '', trim: true },
    buyerMobile: { type: String, default: '', trim: true },
    buyerAddress: { type: String, default: '', trim: true },
    buyerGstin: { type: String, default: '', trim: true },
    buyerState: { type: String, default: '', trim: true },
    // Seller snapshot
    companyName: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    companyGstin: { type: String, default: '' },
    companyState: { type: String, default: '' },
    companyEmail: { type: String, default: '' },
    companyPhone: { type: String, default: '' },
    companyPan: { type: String, default: '' },
    // Line item
    description: { type: String, default: 'Training / Workshop Fee', trim: true },
    // Amounts
    taxableAmount: { type: Number, required: true, min: 0, default: 0 },
    gstPercent: { type: Number, default: 18, min: 0 },
    cgstAmount: { type: Number, default: 0, min: 0 },
    sgstAmount: { type: Number, default: 0, min: 0 },
    igstAmount: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    paymentMode: { type: String, default: '', trim: true },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'paid'
    },
    notes: { type: String, default: '', trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

invoiceSchema.index({ isDeleted: 1, createdAt: -1 });
invoiceSchema.index({ userId: 1, isDeleted: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
