import {
  WebsiteWorkshop,
  WebsiteSession,
  WebsiteTestimonial,
  WebsiteGallery,
  WebsiteHero
} from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const calcWorkshopTotals = (offerPrice, gstPercent) => {
  const p = Math.max(0, Number(offerPrice) || 0);
  const g = Math.max(0, Number(gstPercent) || 0);
  const gstAmount = Math.round(((p * g) / 100) * 100) / 100;
  const total = Math.round((p + gstAmount) * 100) / 100;
  return { offerPrice: p, gstPercent: g, gstAmount, total };
};

const formatWorkshop = (w) => ({
  id: w._id,
  title: w.title,
  description: w.description,
  basePrice: w.basePrice,
  offerPrice: w.offerPrice,
  gstPercent: w.gstPercent,
  gstAmount: w.gstAmount,
  total: w.total,
  image: w.image,
  sortOrder: w.sortOrder,
  isActive: w.isActive,
  createdAt: w.createdAt,
  updatedAt: w.updatedAt
});

const formatSession = (s) => ({
  id: s._id,
  title: s.title,
  description: s.description,
  image: s.image,
  dayNumber: s.dayNumber,
  sessionNumber: s.sessionNumber,
  sessionDate: s.sessionDate,
  startTime: s.startTime,
  endTime: s.endTime,
  sortOrder: s.sortOrder,
  isActive: s.isActive,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt
});

const formatTestimonial = (t) => ({
  id: t._id,
  name: t.name,
  description: t.description,
  image: t.image,
  position: t.position || '',
  sortOrder: t.sortOrder,
  isActive: t.isActive,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt
});

const formatGallery = (g) => ({
  id: g._id,
  type: g.type,
  title: g.title,
  mediaUrl: g.mediaUrl,
  mediaFile: g.mediaFile,
  media: g.mediaFile || g.mediaUrl || '',
  sortOrder: g.sortOrder,
  isActive: g.isActive,
  createdAt: g.createdAt,
  updatedAt: g.updatedAt
});

const formatHero = (h) => ({
  id: h._id,
  title: h.title,
  description: h.description,
  image: h.image,
  videos: h.videos || [],
  images: h.images || [],
  isActive: h.isActive,
  createdAt: h.createdAt,
  updatedAt: h.updatedAt
});

const parseBool = (v, fallback = true) => {
  if (v === undefined || v === null || v === '') return fallback;
  return String(v) !== 'false' && v !== false;
};

// ─── Workshops ───────────────────────────────────────────────

export const createWorkshop = async (req, res) => {
  try {
    const {
      title,
      description = '',
      basePrice = 0,
      offerPrice = 0,
      gstPercent = 18,
      sortOrder = 0,
      isActive = true
    } = req.body;

    if (!title?.trim()) return sendError(res, 'Title is required', null, 400);

    const totals = calcWorkshopTotals(offerPrice, gstPercent);
    const workshop = await WebsiteWorkshop.create({
      title: title.trim(),
      description: description || '',
      basePrice: Math.max(0, Number(basePrice) || 0),
      ...totals,
      image: req.file ? `/uploads/website/${req.file.filename}` : '',
      sortOrder: Number(sortOrder) || 0,
      isActive: parseBool(isActive),
      createdBy: req.admin._id
    });

    return sendSuccess(res, 'Workshop created', { workshop: formatWorkshop(workshop) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const listWorkshops = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 100 } = req.body;
    const query = { isDeleted: false };
    if (search) query.title = new RegExp(String(search).trim(), 'i');

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      WebsiteWorkshop.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      WebsiteWorkshop.countDocuments(query)
    ]);

    return sendSuccess(res, 'Workshops fetched', {
      workshops: items.map(formatWorkshop),
      total
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateWorkshop = async (req, res) => {
  try {
    const { workshopId, title, description, basePrice, offerPrice, gstPercent, sortOrder, isActive } =
      req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);

    const workshop = await WebsiteWorkshop.findOne({ _id: workshopId, isDeleted: false });
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);

    if (title !== undefined) workshop.title = String(title).trim();
    if (description !== undefined) workshop.description = description;
    if (basePrice !== undefined) workshop.basePrice = Math.max(0, Number(basePrice) || 0);
    if (offerPrice !== undefined || gstPercent !== undefined) {
      const totals = calcWorkshopTotals(
        offerPrice !== undefined ? offerPrice : workshop.offerPrice,
        gstPercent !== undefined ? gstPercent : workshop.gstPercent
      );
      Object.assign(workshop, totals);
    }
    if (sortOrder !== undefined) workshop.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) workshop.isActive = parseBool(isActive);
    if (req.file) workshop.image = `/uploads/website/${req.file.filename}`;

    await workshop.save();
    return sendSuccess(res, 'Workshop updated', { workshop: formatWorkshop(workshop) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const deleteWorkshop = async (req, res) => {
  try {
    const { workshopId } = req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);
    const workshop = await WebsiteWorkshop.findOne({ _id: workshopId, isDeleted: false });
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);
    workshop.isDeleted = true;
    workshop.isActive = false;
    await workshop.save();
    return sendSuccess(res, 'Workshop deleted');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// ─── Sessions ────────────────────────────────────────────────

export const createSession = async (req, res) => {
  try {
    const {
      title,
      description = '',
      dayNumber = 1,
      sessionNumber = 1,
      sessionDate,
      startTime,
      endTime,
      sortOrder = 0,
      isActive = true
    } = req.body;

    if (!title?.trim() || !sessionDate || !startTime || !endTime) {
      return sendError(res, 'Title, date, start time and end time are required', null, 400);
    }

    const session = await WebsiteSession.create({
      title: title.trim(),
      description: description || '',
      image: req.file ? `/uploads/website/${req.file.filename}` : '',
      dayNumber: Number(dayNumber) || 1,
      sessionNumber: Number(sessionNumber) || 1,
      sessionDate: new Date(sessionDate),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive: parseBool(isActive),
      createdBy: req.admin._id
    });

    return sendSuccess(res, 'Session created', { session: formatSession(session) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const listSessions = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 100 } = req.body;
    const query = { isDeleted: false };
    if (search) query.title = new RegExp(String(search).trim(), 'i');

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      WebsiteSession.find(query).sort({ sessionDate: 1, startTime: 1 }).skip(skip).limit(Number(limit)),
      WebsiteSession.countDocuments(query)
    ]);

    return sendSuccess(res, 'Sessions fetched', {
      sessions: items.map(formatSession),
      total
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateSession = async (req, res) => {
  try {
    const {
      sessionId,
      title,
      description,
      dayNumber,
      sessionNumber,
      sessionDate,
      startTime,
      endTime,
      sortOrder,
      isActive
    } = req.body;

    if (!sessionId) return sendError(res, 'sessionId is required', null, 400);
    const session = await WebsiteSession.findOne({ _id: sessionId, isDeleted: false });
    if (!session) return sendError(res, 'Session not found', null, 404);

    if (title !== undefined) session.title = String(title).trim();
    if (description !== undefined) session.description = description;
    if (dayNumber !== undefined) session.dayNumber = Number(dayNumber) || 1;
    if (sessionNumber !== undefined) session.sessionNumber = Number(sessionNumber) || 1;
    if (sessionDate) session.sessionDate = new Date(sessionDate);
    if (startTime) session.startTime = String(startTime).trim();
    if (endTime) session.endTime = String(endTime).trim();
    if (sortOrder !== undefined) session.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) session.isActive = parseBool(isActive);
    if (req.file) session.image = `/uploads/website/${req.file.filename}`;

    await session.save();
    return sendSuccess(res, 'Session updated', { session: formatSession(session) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return sendError(res, 'sessionId is required', null, 400);
    const session = await WebsiteSession.findOne({ _id: sessionId, isDeleted: false });
    if (!session) return sendError(res, 'Session not found', null, 404);
    session.isDeleted = true;
    session.isActive = false;
    await session.save();
    return sendSuccess(res, 'Session deleted');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// ─── Testimonials ────────────────────────────────────────────

export const createTestimonial = async (req, res) => {
  try {
    const { name, description = '', position = '', sortOrder = 0, isActive = true } = req.body;
    if (!name?.trim()) return sendError(res, 'Name is required', null, 400);

    const item = await WebsiteTestimonial.create({
      name: name.trim(),
      description: description || '',
      position: position || '',
      image: req.file ? `/uploads/website/${req.file.filename}` : '',
      sortOrder: Number(sortOrder) || 0,
      isActive: parseBool(isActive),
      createdBy: req.admin._id
    });

    return sendSuccess(res, 'Testimonial created', { testimonial: formatTestimonial(item) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const listTestimonials = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 100 } = req.body;
    const query = { isDeleted: false };
    if (search) {
      const regex = new RegExp(String(search).trim(), 'i');
      query.$or = [{ name: regex }, { position: regex }];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      WebsiteTestimonial.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      WebsiteTestimonial.countDocuments(query)
    ]);

    return sendSuccess(res, 'Testimonials fetched', {
      testimonials: items.map(formatTestimonial),
      total
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateTestimonial = async (req, res) => {
  try {
    const { testimonialId, name, description, position, sortOrder, isActive } = req.body;
    if (!testimonialId) return sendError(res, 'testimonialId is required', null, 400);

    const item = await WebsiteTestimonial.findOne({ _id: testimonialId, isDeleted: false });
    if (!item) return sendError(res, 'Testimonial not found', null, 404);

    if (name !== undefined) item.name = String(name).trim();
    if (description !== undefined) item.description = description;
    if (position !== undefined) item.position = position || '';
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) item.isActive = parseBool(isActive);
    if (req.file) item.image = `/uploads/website/${req.file.filename}`;

    await item.save();
    return sendSuccess(res, 'Testimonial updated', { testimonial: formatTestimonial(item) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const deleteTestimonial = async (req, res) => {
  try {
    const { testimonialId } = req.body;
    if (!testimonialId) return sendError(res, 'testimonialId is required', null, 400);
    const item = await WebsiteTestimonial.findOne({ _id: testimonialId, isDeleted: false });
    if (!item) return sendError(res, 'Testimonial not found', null, 404);
    item.isDeleted = true;
    item.isActive = false;
    await item.save();
    return sendSuccess(res, 'Testimonial deleted');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// ─── Gallery ─────────────────────────────────────────────────

export const createGalleryItem = async (req, res) => {
  try {
    const { type, title = '', mediaUrl = '', sortOrder = 0, isActive = true } = req.body;
    if (!type || !['image', 'video'].includes(type)) {
      return sendError(res, 'type must be image or video', null, 400);
    }

    const mediaFile = req.file ? `/uploads/website/${req.file.filename}` : '';
    if (!mediaFile && !mediaUrl) {
      return sendError(res, 'Upload a file or provide mediaUrl', null, 400);
    }

    const item = await WebsiteGallery.create({
      type,
      title: title || '',
      mediaUrl: mediaUrl || '',
      mediaFile,
      sortOrder: Number(sortOrder) || 0,
      isActive: parseBool(isActive),
      createdBy: req.admin._id
    });

    return sendSuccess(res, 'Gallery item created', { item: formatGallery(item) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const listGallery = async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 200 } = req.body;
    const query = { isDeleted: false };
    if (type === 'image' || type === 'video') query.type = type;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      WebsiteGallery.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      WebsiteGallery.countDocuments(query)
    ]);

    return sendSuccess(res, 'Gallery fetched', {
      items: items.map(formatGallery),
      total,
      images: items.filter((i) => i.type === 'image').map(formatGallery),
      videos: items.filter((i) => i.type === 'video').map(formatGallery)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateGalleryItem = async (req, res) => {
  try {
    const { itemId, type, title, mediaUrl, sortOrder, isActive } = req.body;
    if (!itemId) return sendError(res, 'itemId is required', null, 400);

    const item = await WebsiteGallery.findOne({ _id: itemId, isDeleted: false });
    if (!item) return sendError(res, 'Gallery item not found', null, 404);

    if (type && ['image', 'video'].includes(type)) item.type = type;
    if (title !== undefined) item.title = title || '';
    if (mediaUrl !== undefined) item.mediaUrl = mediaUrl || '';
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) item.isActive = parseBool(isActive);
    if (req.file) item.mediaFile = `/uploads/website/${req.file.filename}`;

    await item.save();
    return sendSuccess(res, 'Gallery item updated', { item: formatGallery(item) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return sendError(res, 'itemId is required', null, 400);
    const item = await WebsiteGallery.findOne({ _id: itemId, isDeleted: false });
    if (!item) return sendError(res, 'Gallery item not found', null, 404);
    item.isDeleted = true;
    item.isActive = false;
    await item.save();
    return sendSuccess(res, 'Gallery item deleted');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// ─── Hero (single document) ──────────────────────────────────

export const getHero = async (req, res) => {
  try {
    let hero = await WebsiteHero.findOne().sort({ updatedAt: -1 });
    if (!hero) {
      hero = await WebsiteHero.create({
        title: '',
        description: '',
        image: '',
        videos: [],
        images: []
      });
    }
    return sendSuccess(res, 'Hero fetched', { hero: formatHero(hero) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateHero = async (req, res) => {
  try {
    const { title, description, isActive, videosJson, imagesJson } = req.body;

    let hero = await WebsiteHero.findOne().sort({ updatedAt: -1 });
    if (!hero) {
      hero = new WebsiteHero({});
    }

    if (title !== undefined) hero.title = String(title).trim();
    if (description !== undefined) hero.description = description;
    if (isActive !== undefined) hero.isActive = parseBool(isActive);
    if (req.file) hero.image = `/uploads/website/${req.file.filename}`;

    if (videosJson !== undefined) {
      try {
        const parsed = typeof videosJson === 'string' ? JSON.parse(videosJson) : videosJson;
        if (Array.isArray(parsed)) hero.videos = parsed;
      } catch {
        /* keep existing */
      }
    }

    if (imagesJson !== undefined) {
      try {
        const parsed = typeof imagesJson === 'string' ? JSON.parse(imagesJson) : imagesJson;
        if (Array.isArray(parsed)) hero.images = parsed;
      } catch {
        /* keep existing */
      }
    }

    hero.updatedBy = req.admin._id;
    await hero.save();

    return sendSuccess(res, 'Hero updated', { hero: formatHero(hero) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const addHeroMedia = async (req, res) => {
  try {
    const { mediaType = 'image', title = '', url = '' } = req.body;
    if (!['image', 'video'].includes(mediaType)) {
      return sendError(res, 'mediaType must be image or video', null, 400);
    }

    const filePath = req.file ? `/uploads/website/${req.file.filename}` : '';
    if (!filePath && !url) {
      return sendError(res, 'Upload a file or provide url', null, 400);
    }

    let hero = await WebsiteHero.findOne().sort({ updatedAt: -1 });
    if (!hero) hero = await WebsiteHero.create({});

    const entry = {
      type: mediaType,
      url: url || '',
      file: filePath,
      title: title || ''
    };

    if (mediaType === 'video') hero.videos.push(entry);
    else hero.images.push(entry);

    hero.updatedBy = req.admin._id;
    await hero.save();

    return sendSuccess(res, 'Hero media added', { hero: formatHero(hero) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const removeHeroMedia = async (req, res) => {
  try {
    const { mediaType, mediaId } = req.body;
    if (!mediaType || !mediaId) return sendError(res, 'mediaType and mediaId required', null, 400);

    const hero = await WebsiteHero.findOne().sort({ updatedAt: -1 });
    if (!hero) return sendError(res, 'Hero not found', null, 404);

    if (mediaType === 'video') {
      hero.videos = hero.videos.filter((m) => String(m._id) !== String(mediaId));
    } else {
      hero.images = hero.images.filter((m) => String(m._id) !== String(mediaId));
    }

    await hero.save();
    return sendSuccess(res, 'Hero media removed', { hero: formatHero(hero) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
