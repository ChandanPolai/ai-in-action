import mongoose from 'mongoose';

/**
 * Global app settings — video play limit + company billing details
 */
const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: 'global'
    },
    defaultMaxPlayCount: {
      type: Number,
      default: 1,
      min: 1
    },
    companyName: { type: String, default: 'AI in Action', trim: true },
    companyAddress: { type: String, default: '', trim: true },
    companyGstin: { type: String, default: '', trim: true },
    companyState: { type: String, default: '', trim: true },
    companyEmail: { type: String, default: '', trim: true },
    companyPhone: { type: String, default: '', trim: true },
    companyPan: { type: String, default: '', trim: true },
    invoicePrefix: { type: String, default: 'INV', trim: true }
  },
  { timestamps: true }
);

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);
export default AppSettings;
