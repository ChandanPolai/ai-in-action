import {
  WebsiteWorkshop,
  WebsiteSession,
  WebsiteTestimonial,
  WebsiteGallery,
  WebsiteHero
} from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

/**
 * Public website content — active items only (no auth).
 */

export const getPublicHome = async (req, res) => {
  try {
    const [hero, workshops, sessions, testimonials, gallery] = await Promise.all([
      WebsiteHero.findOne({ isActive: true }).sort({ updatedAt: -1 }),
      WebsiteWorkshop.find({ isDeleted: false, isActive: true }).sort({ sortOrder: 1, createdAt: -1 }),
      WebsiteSession.find({ isDeleted: false, isActive: true }).sort({ sessionDate: 1, startTime: 1 }),
      WebsiteTestimonial.find({ isDeleted: false, isActive: true }).sort({ sortOrder: 1, createdAt: -1 }),
      WebsiteGallery.find({ isDeleted: false, isActive: true }).sort({ sortOrder: 1, createdAt: -1 })
    ]);

    return sendSuccess(res, 'Website content fetched', {
      hero: hero
        ? {
            title: hero.title,
            description: hero.description,
            image: hero.image,
            videos: hero.videos || [],
            images: hero.images || []
          }
        : null,
      workshops: workshops.map((w) => ({
        id: w._id,
        title: w.title,
        description: w.description,
        basePrice: w.basePrice,
        offerPrice: w.offerPrice,
        gstPercent: w.gstPercent,
        gstAmount: w.gstAmount,
        total: w.total,
        image: w.image
      })),
      sessions: sessions.map((s) => ({
        id: s._id,
        title: s.title,
        description: s.description,
        image: s.image,
        dayNumber: s.dayNumber,
        sessionNumber: s.sessionNumber,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime
      })),
      testimonials: testimonials.map((t) => ({
        id: t._id,
        name: t.name,
        description: t.description,
        image: t.image,
        position: t.position || ''
      })),
      gallery: {
        images: gallery
          .filter((g) => g.type === 'image')
          .map((g) => ({
            id: g._id,
            title: g.title,
            media: g.mediaFile || g.mediaUrl
          })),
        videos: gallery
          .filter((g) => g.type === 'video')
          .map((g) => ({
            id: g._id,
            title: g.title,
            media: g.mediaFile || g.mediaUrl
          }))
      }
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default { getPublicHome };
