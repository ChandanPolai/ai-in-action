import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../models/index.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendPasswordResetEmail } from '../../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai_in_action_super_secret_jwt_key_2026';

const signUserToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobileNumber: user.mobileNumber,
  secondaryMobileNumber: user.secondaryMobileNumber || '',
  countryCode: user.countryCode,
  profilePhoto: user.profilePhoto || '',
  canUpdateProfile: user.canUpdateProfile,
  role: 'user'
});

const findUserByLoginIdentifier = async (identifier) => {
  const value = String(identifier || '').trim();
  if (!value) return null;

  if (value.includes('@')) {
    return User.findOne({ email: value.toLowerCase(), isDeleted: false });
  }

  const mobile = value.replace(/[^\d+]/g, '');
  return User.findOne({
    isDeleted: false,
    $or: [{ mobileNumber: mobile }, { secondaryMobileNumber: mobile }]
  });
};

export const userLogin = async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.mobileNumber;
    const { password } = req.body;

    if (!identifier || !password) {
      return sendError(res, 'Email/mobile and password are required', null, 400);
    }

    const user = await findUserByLoginIdentifier(identifier);
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

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, 'Email is required', null, 400);
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isDeleted: false,
      isActive: true
    });

    if (!user) {
      return sendSuccess(res, 'If an account exists with this email, a reset link has been sent.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(user.email, user.name, resetToken, user._id);

    return sendSuccess(res, 'If an account exists with this email, a reset link has been sent.');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendError(res, 'Token and new password are required', null, 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', null, 400);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      isDeleted: false
    });

    if (!user) {
      return sendError(res, 'Invalid or expired reset link. Please request a new one.', null, 400);
    }

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = '';
    user.resetPasswordExpires = null;
    await user.save();

    return sendSuccess(res, 'Password reset successfully. You can now log in.');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const getUserProfile = async (req, res) => {
  try {
    return sendSuccess(res, 'Profile fetched successfully', { user: formatUser(req.user) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    if (!req.user.canUpdateProfile) {
      return sendError(res, 'Profile updates are disabled by admin', null, 403);
    }

    const { name, mobileNumber, secondaryMobileNumber, countryCode } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (mobileNumber) user.mobileNumber = String(mobileNumber).replace(/[^\d+]/g, '').trim();
    if (secondaryMobileNumber !== undefined) {
      user.secondaryMobileNumber = String(secondaryMobileNumber).replace(/[^\d+]/g, '').trim();
    }
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
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  changeUserPassword
};
