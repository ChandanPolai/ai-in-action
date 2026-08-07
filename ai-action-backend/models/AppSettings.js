import mongoose from 'mongoose';

/**
 * Global app settings — default video play limit for new recordings
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
    }
  },
  { timestamps: true }
);

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);
export default AppSettings;
