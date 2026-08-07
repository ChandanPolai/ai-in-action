import jwt from 'jsonwebtoken';
import { User } from '../../models/index.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai_in_action_super_secret_jwt_key_2026';

const signUserToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobileNumber: user.mobileNumber,
  countryCode: user.countryCode,
  profilePhoto: user.profilePhoto || '',
  canUpdateProfile: user.canUpdateProfile,
  role: 'user'
});

// @desc    User Login
// @route   POST /api/user/auth/login
export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', null, 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), isDeleted: false });
    if (!user) {
      return sendError(res, 'Invalid credentials', null, 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated. Contact admin.', null, 403);
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', null, 401);
    }

    const userToken = signUserToken(user);

    return sendSuccess(res, 'Login successful', {
      userToken,
      user: formatUser(user)
    });
  } catch (error) {
    return sendError(res, error.message || 'Server Error during login', null, 500);
  }
};

// @desc    Get User Profile
// @route   POST /api/user/auth/me
export const getUserProfile = async (req, res) => {
  try {
    return sendSuccess(res, 'Profile fetched successfully', { user: formatUser(req.user) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update User Profile
// @route   POST /api/user/auth/update-profile
export const updateUserProfile = async (req, res) => {
  try {
    if (!req.user.canUpdateProfile) {
      return sendError(res, 'Profile updates are disabled by admin', null, 403);
    }

    const { name, mobileNumber, countryCode } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (mobileNumber) user.mobileNumber = mobileNumber.trim();
    if (countryCode) user.countryCode = countryCode.trim();
    if (req.file) {
      user.profilePhoto = `/uploads/users/${req.file.filename}`;
    }

    await user.save();

    return sendSuccess(res, 'Profile updated successfully', { user: formatUser(user) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Change Password
// @route   POST /api/user/auth/change-password
export const changeUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', null, 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters', null, 400);
    }

    const user = await User.findById(req.user._id);
    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', null, 400);
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  userLogin,
  getUserProfile,
  updateUserProfile,
  changeUserPassword
};
