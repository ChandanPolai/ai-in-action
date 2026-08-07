import jwt from 'jsonwebtoken';
import { sendError } from '../utils/apiResponse.js';
import { User } from '../models/index.js';

export const verifyUserToken = async (req, res, next) => {
  try {
    let token = req.headers['usertoken'] || req.body.userToken;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Access denied. Authorization token required.', null, 401);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ai_in_action_super_secret_jwt_key_2026');

      if (decoded.role && decoded.role !== 'user') {
        return sendError(res, 'Invalid user token role.', null, 401);
      }

      const user = await User.findOne({ _id: decoded.id, isDeleted: false, isActive: true }).select('-password');

      if (!user) {
        return sendError(res, 'User account not found or deactivated.', null, 401);
      }

      req.user = user;
      next();
    } catch (jwtErr) {
      return sendError(res, 'Invalid or expired authentication token.', null, 401);
    }
  } catch (error) {
    return sendError(res, 'Authentication middleware error: ' + error.message, null, 500);
  }
};

export default verifyUserToken;
