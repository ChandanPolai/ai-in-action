import mongoose from 'mongoose';

/**
 * Upcoming / agenda sessions for public website.
 */
const websiteSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    dayNumber: { type: Number, default: 1, min: 1 },
    sessionNumber: { type: Number, default: 1, min: 1 },
    sessionDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

websiteSessionSchema.index({ isDeleted: 1, isActive: 1, sessionDate: 1 });

export default mongoose.model('WebsiteSession', websiteSessionSchema);
