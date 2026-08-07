import { User } from '../../models/index.js';
import { hashPassword } from '../../utils/password.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendLoginCredentialsEmail } from '../../utils/emailService.js';

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobileNumber: user.mobileNumber,
  countryCode: user.countryCode,
  profilePhoto: user.profilePhoto || '',
  isActive: user.isActive,
  canUpdateProfile: user.canUpdateProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// @desc    Create User
// @route   POST /api/admin/users/create
export const createUser = async (req, res) => {
  try {
    const { name, email, mobileNumber, countryCode, password, sendCredentials = true, canUpdateProfile = true } = req.body;

    if (!name || !email || !mobileNumber) {
      return sendError(res, 'Name, email and mobile number are required', null, 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim(), isDeleted: false });
    if (existing) {
      return sendError(res, 'A user with this email already exists', null, 400);
    }

    const plainPassword = password || generateTempPassword();
    const hashed = await hashPassword(plainPassword);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      countryCode: countryCode || '+91',
      password: hashed,
      canUpdateProfile: canUpdateProfile !== false && canUpdateProfile !== 'false',
      profilePhoto: req.file ? `/uploads/users/${req.file.filename}` : ''
    });

    if (sendCredentials !== false && sendCredentials !== 'false') {
      await sendLoginCredentialsEmail(user.email, user.name, plainPassword, user._id);
    }

    return sendSuccess(res, 'User created successfully', {
      user: formatUser(user),
      temporaryPassword: password ? undefined : plainPassword
    }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List Users
// @route   POST /api/admin/users/list
export const listUsers = async (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { mobileNumber: regex }];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query)
    ]);

    return sendSuccess(res, 'Users fetched successfully', {
      users: users.map(formatUser),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get User Details
// @route   POST /api/admin/users/get
export const getUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendError(res, 'userId is required', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false }).select('-password');
    if (!user) return sendError(res, 'User not found', null, 404);

    return sendSuccess(res, 'User fetched successfully', { user: formatUser(user) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update User
// @route   POST /api/admin/users/update
export const updateUser = async (req, res) => {
  try {
    const { userId, name, email, mobileNumber, countryCode, canUpdateProfile } = req.body;
    if (!userId) return sendError(res, 'userId is required', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) return sendError(res, 'User not found', null, 404);

    if (email && email.toLowerCase().trim() !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase().trim(), isDeleted: false, _id: { $ne: userId } });
      if (exists) return sendError(res, 'Email already in use by another user', null, 400);
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (mobileNumber) user.mobileNumber = mobileNumber.trim();
    if (countryCode) user.countryCode = countryCode.trim();
    if (canUpdateProfile !== undefined) {
      user.canUpdateProfile = canUpdateProfile !== false && canUpdateProfile !== 'false';
    }
    if (req.file) {
      user.profilePhoto = `/uploads/users/${req.file.filename}`;
    }

    await user.save();
    return sendSuccess(res, 'User updated successfully', { user: formatUser(user) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Soft Delete User
// @route   POST /api/admin/users/delete
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendError(res, 'userId is required', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) return sendError(res, 'User not found', null, 404);

    user.isDeleted = true;
    user.isActive = false;
    await user.save();

    return sendSuccess(res, 'User deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Toggle User Active Status
// @route   POST /api/admin/users/toggle-status
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendError(res, 'userId is required', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) return sendError(res, 'User not found', null, 404);

    user.isActive = !user.isActive;
    await user.save();

    return sendSuccess(res, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, {
      user: formatUser(user)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Reset / Change User Password
// @route   POST /api/admin/users/reset-password
export const resetUserPassword = async (req, res) => {
  try {
    const { userId, newPassword, sendEmail = false } = req.body;
    if (!userId) return sendError(res, 'userId is required', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) return sendError(res, 'User not found', null, 404);

    const plainPassword = newPassword || generateTempPassword();
    user.password = await hashPassword(plainPassword);
    await user.save();

    if (sendEmail === true || sendEmail === 'true') {
      await sendLoginCredentialsEmail(user.email, user.name, plainPassword, user._id);
    }

    return sendSuccess(res, 'User password reset successfully', {
      temporaryPassword: newPassword ? undefined : plainPassword
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword
};
