import mongoose from 'mongoose';

/**
 * Public website workshop / pricing card.
 * basePrice = MRP (strike-through), offerPrice = selling price shown.
 * GST calculated on offerPrice → total.
 */
const websiteWorkshopSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    basePrice: { type: Number, required: true, min: 0, default: 0 },
    offerPrice: { type: Number, required: true, min: 0, default: 0 },
    gstPercent: { type: Number, default: 18, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    image: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

websiteWorkshopSchema.index({ isDeleted: 1, isActive: 1, sortOrder: 1 });

export default mongoose.model('WebsiteWorkshop', websiteWorkshopSchema);
