import express from 'express';
import {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse
} from '../../controllers/admin/courseController.js';
import { verifyAdminToken } from '../../middlewares/adminAuth.js';
import { uploadCourseImage } from '../../middlewares/upload.js';

const router = express.Router();

router.use(verifyAdminToken);

router.post('/create', uploadCourseImage.single('image'), createCourse);
router.post('/list', listCourses);
router.post('/get', getCourse);
router.post('/update', uploadCourseImage.single('image'), updateCourse);
router.post('/delete', deleteCourse);

export default router;
