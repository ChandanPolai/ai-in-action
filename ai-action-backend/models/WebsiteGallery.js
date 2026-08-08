import mongoose from 'mongoose';

/**
 * Gallery item — type image | video for tab-wise public gallery.
 */
const websiteGallerySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    title: { type: String, default: '', trim: true },
    mediaUrl: { type: String, default: '' },
    mediaFile: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

websiteGallerySchema.index({ isDeleted: 1, isActive: 1, type: 1, sortOrder: 1 });

export default mongoose.model('WebsiteGallery', websiteGallerySchema);
