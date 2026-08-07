import express from 'express';
import { listCourses, getCourse } from '../../controllers/user/courseController.js';
import { verifyUserToken } from '../../middlewares/userAuth.js';

const router = express.Router();

router.use(verifyUserToken);
router.post('/list', listCourses);
router.post('/get', getCourse);

export default router;
