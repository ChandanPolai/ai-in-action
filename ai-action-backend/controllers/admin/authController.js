import jwt from 'jsonwebtoken';
import { Admin } from '../../models/index.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai_in_action_super_secret_jwt_key_2026';

const signAdminToken = (admin) =>
  jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });

const formatAdmin = (admin) => ({
  id: admin._id,
  name: admin.name,
  email: admin.email,
  profilePhoto: admin.profilePhoto || '',
  role: 'admin'
});

// @desc    Admin Login
// @route   POST /api/admin/auth/login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', null, 400);
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return sendError(res, 'Invalid Admin Credentials', null, 401);
    }

    if (!admin.isActive) {
      return sendError(res, 'Admin account is deactivated', null, 403);
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      return sendError(res, 'Invalid Admin Credentials', null, 401);
    }

    const adminToken = signAdminToken(admin);

    return sendSuccess(res, 'Admin logged in successfully', {
      adminToken,
      admin: formatAdmin(admin)
    });
  } catch (error) {
    return sendError(res, error.message || 'Server Error during admin login', null, 500);
  }
};

// @desc    Get Current Admin Profile
// @route   POST /api/admin/auth/me
export const getAdminProfile = async (req, res) => {
  try {
    return sendSuccess(res, 'Admin profile fetched successfully', formatAdmin(req.admin));
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update Admin Profile
// @route   POST /api/admin/auth/update-profile
export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return sendError(res, 'Admin not found', null, 404);
    }

    if (name) admin.name = name.trim();
    if (email) admin.email = email.toLowerCase().trim();

    if (req.file) {
      admin.profilePhoto = `/uploads/admin/${req.file.filename}`;
    }

    await admin.save();

    return sendSuccess(res, 'Admin profile updated successfully', formatAdmin(admin));
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Change Admin Password
// @route   POST /api/admin/auth/change-password
export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', null, 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters', null, 400);
    }

    const admin = await Admin.findById(req.admin._id);
    const isMatch = await comparePassword(currentPassword, admin.password);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', null, 400);
    }

    admin.password = await hashPassword(newPassword);
    await admin.save();

    return sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword
};
