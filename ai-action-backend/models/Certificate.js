import mongoose from 'mongoose';

/**
 * Certificate generated via external cert API and assigned to a user.
 */
const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipientName: {
      type: String,
      required: true,
      trim: true
    },
    recipientEmail: {
      type: String,
      default: '',
      trim: true
    },
    courseTitle: {
      type: String,
      default: 'AI IN ACTION',
      trim: true
    },
    issueDate: {
      type: String,
      default: ''
    },
    templateId: {
      type: String,
      default: 'ai_in_action'
    },
    signatory1Name: {
      type: String,
      default: 'Gouri Shankar'
    },
    signatory2Name: {
      type: String,
      default: 'Arpit Shah'
    },
    certId: {
      type: String,
      default: '',
      index: true
    },
    verifyHash: {
      type: String,
      default: ''
    },
    pdfUrl: {
      type: String,
      default: ''
    },
    svgUrl: {
      type: String,
      default: ''
    },
    fullPdfUrl: {
      type: String,
      default: ''
    },
    sendStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending'
    },
    sentAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

certificateSchema.index({ isDeleted: 1, createdAt: -1 });
certificateSchema.index({ userId: 1, isDeleted: 1 });

const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;
