import express from 'express';
import { getPublicHome } from '../../controllers/public/websiteController.js';

const router = express.Router();

router.post('/home', getPublicHome);
router.get('/home', getPublicHome);

export default router;
