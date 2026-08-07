import verifyAdminToken from './adminAuth.js';
import verifyUserToken from './userAuth.js';
import { apiLimiter, authLimiter } from './rateLimiter.js';
import { uploadAdminAvatar, uploadUserAvatar, uploadRecordingVideo } from './upload.js';

export {
  verifyAdminToken,
  verifyUserToken,
  apiLimiter,
  authLimiter,
  uploadAdminAvatar,
  uploadUserAvatar,
  uploadRecordingVideo
};

export default {
  verifyAdminToken,
  verifyUserToken,
  apiLimiter,
  authLimiter,
  uploadAdminAvatar,
  uploadUserAvatar,
  uploadRecordingVideo
};
