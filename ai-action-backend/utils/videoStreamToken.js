import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ai_in_action_super_secret_jwt_key_2026';
const STREAM_TOKEN_TTL = process.env.VIDEO_STREAM_TOKEN_TTL || '4h';

/**
 * Short-lived token for video stream only (not a full login token).
 */
export const signVideoStreamToken = ({ userId, recordingId }) =>
  jwt.sign(
    {
      typ: 'video-stream',
      id: String(userId),
      recordingId: String(recordingId)
    },
    JWT_SECRET,
    { expiresIn: STREAM_TOKEN_TTL }
  );

export const verifyVideoStreamToken = (token) => {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.typ !== 'video-stream' || !decoded.id || !decoded.recordingId) {
    throw new Error('Invalid stream token');
  }
  return decoded;
};

export default {
  signVideoStreamToken,
  verifyVideoStreamToken
};
