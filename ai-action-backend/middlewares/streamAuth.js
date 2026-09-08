import { User } from '../models/index.js';
import { verifyVideoStreamToken } from '../utils/videoStreamToken.js';

/**
 * Auth for video stream only — short-lived stream token (header preferred).
 * Does NOT accept long-lived login usertoken in query (stops easy URL copy/reuse).
 */
export const verifyStreamAccess = async (req, res, next) => {
  try {
    const token =
      req.headers['x-stream-token'] ||
      req.headers['streamtoken'] ||
      req.query?.streamToken ||
      null;

    if (!token) {
      return res.status(401).json({
        status: false,
        message: 'Stream token required'
      });
    }

    let decoded;
    try {
      decoded = verifyVideoStreamToken(token);
    } catch {
      return res.status(401).json({
        status: false,
        message: 'Stream link expired or invalid. Open the video again from the app.'
      });
    }

    const recordingId = String(req.params.recordingId || '');
    if (!recordingId || String(decoded.recordingId) !== recordingId) {
      return res.status(403).json({ status: false, message: 'Stream token mismatch' });
    }

    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: false,
      isActive: true
    }).select('-password');

    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    req.user = user;
    req.streamClaims = decoded;
    next();
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export default verifyStreamAccess;
