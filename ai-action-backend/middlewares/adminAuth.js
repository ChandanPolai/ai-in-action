import jwt from 'jsonwebtoken';
import { sendError } from '../utils/apiResponse.js';
import { Admin } from '../models/index.js';

export const verifyAdminToken = async (req, res, next) => {
  try {
    let token = req.headers['admintoken'] || req.body.adminToken;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Access denied. Admin authorization token required.', null, 401);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ai_in_action_super_secret_jwt_key_2026');

      if (decoded.role && decoded.role !== 'admin') {
        return sendError(res, 'Invalid admin token role.', null, 401);
      }

      const admin = await Admin.findOne({ _id: decoded.id, isActive: true }).select('-password');

      if (!admin) {
        return sendError(res, 'Admin account not found or deactivated.', null, 401);
      }

      req.admin = admin;
      next();
    } catch (jwtErr) {
      return sendError(res, 'Invalid or expired authentication token.', null, 401);
    }
  } catch (error) {
    return sendError(res, 'Authentication middleware error: ' + error.message, null, 500);
  }
};

export default verifyAdminToken;
