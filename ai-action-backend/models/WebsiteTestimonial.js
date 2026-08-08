import mongoose from 'mongoose';

const websiteTestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    position: { type: String, default: '', trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

websiteTestimonialSchema.index({ isDeleted: 1, isActive: 1, sortOrder: 1 });

export default mongoose.model('WebsiteTestimonial', websiteTestimonialSchema);
