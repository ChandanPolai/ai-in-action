import mongoose from 'mongoose';

/**
 * Hero section — single active document (upsert).
 * Optional extra videos / images for hero media strip.
 */
const mediaItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, default: '' },
    file: { type: String, default: '' },
    title: { type: String, default: '' }
  },
  { _id: true }
);

const websiteHeroSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    videos: { type: [mediaItemSchema], default: [] },
    images: { type: [mediaItemSchema], default: [] },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

export default mongoose.model('WebsiteHero', websiteHeroSchema);
