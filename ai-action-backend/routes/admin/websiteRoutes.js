import express from 'express';
import {
  createWorkshop,
  listWorkshops,
  updateWorkshop,
  deleteWorkshop,
  createSession,
  listSessions,
  updateSession,
  deleteSession,
  createTestimonial,
  listTestimonials,
  updateTestimonial,
  deleteTestimonial,
  createGalleryItem,
  listGallery,
  updateGalleryItem,
  deleteGalleryItem,
  getHero,
  updateHero,
  addHeroMedia,
  removeHeroMedia
} from '../../controllers/admin/websiteController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';
import { uploadWebsiteImage, uploadWebsiteMedia } from '../../middlewares/upload.js';

const router = express.Router();
router.use(verifyAdminToken);

// Hero
router.post('/hero/get', getHero);
router.post('/hero/update', uploadWebsiteImage.single('image'), updateHero);
router.post('/hero/media/add', uploadWebsiteMedia.single('file'), addHeroMedia);
router.post('/hero/media/remove', removeHeroMedia);

// Workshops
router.post('/workshops/create', uploadWebsiteImage.single('image'), createWorkshop);
router.post('/workshops/list', listWorkshops);
router.post('/workshops/update', uploadWebsiteImage.single('image'), updateWorkshop);
router.post('/workshops/delete', deleteWorkshop);

// Sessions
router.post('/sessions/create', uploadWebsiteImage.single('image'), createSession);
router.post('/sessions/list', listSessions);
router.post('/sessions/update', uploadWebsiteImage.single('image'), updateSession);
router.post('/sessions/delete', deleteSession);

// Testimonials
router.post('/testimonials/create', uploadWebsiteImage.single('image'), createTestimonial);
router.post('/testimonials/list', listTestimonials);
router.post('/testimonials/update', uploadWebsiteImage.single('image'), updateTestimonial);
router.post('/testimonials/delete', deleteTestimonial);

// Gallery
router.post('/gallery/create', uploadWebsiteMedia.single('file'), createGalleryItem);
router.post('/gallery/list', listGallery);
router.post('/gallery/update', uploadWebsiteMedia.single('file'), updateGalleryItem);
router.post('/gallery/delete', deleteGalleryItem);

export default router;
