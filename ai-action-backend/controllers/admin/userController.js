import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../../models/index.js';
import { hashPassword } from '../../utils/password.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { sendLoginCredentialsEmail } from '../../utils/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const excelDir = path.join(__dirname, '../../uploads/excel');

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
  secondaryMobileNumber: user.secondaryMobileNumber || '',
  countryCode: user.countryCode,
  profilePhoto: user.profilePhoto || '',
  isActive: user.isActive,
  canUpdateProfile: user.canUpdateProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const normalizeMobile = (value) => String(value || '').replace(/[^\d+]/g, '').trim();

export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      mobileNumber,
      secondaryMobileNumber = '',
      countryCode,
      password,
      canUpdateProfile = true
    } = req.body;

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
      mobileNumber: normalizeMobile(mobileNumber),
      secondaryMobileNumber: normalizeMobile(secondaryMobileNumber),
      countryCode: countryCode || '+91',
      password: hashed,
      canUpdateProfile: canUpdateProfile !== false && canUpdateProfile !== 'false',
      profilePhoto: req.file ? `/uploads/users/${req.file.filename}` : ''
    });

    // Always email login credentials when account is created
    await sendLoginCredentialsEmail(user.email, user.name, plainPassword, user._id);

    return sendSuccess(res, 'User created successfully. Login credentials emailed.', {
      user: formatUser(user),
      temporaryPassword: password ? undefined : plainPassword,
      credentialsEmailed: true
    }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const listUsers = async (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { mobileNumber: regex },
        { secondaryMobileNumber: regex }
      ];
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

export const updateUser = async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      mobileNumber,
      secondaryMobileNumber,
      countryCode,
      canUpdateProfile,
      password
    } = req.body;
    if (!userId) return sendError(res, 'userId is required', null, 400);

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) return sendError(res, 'User not found', null, 404);

    if (email && email.toLowerCase().trim() !== user.email) {
      const exists = await User.findOne({
        email: email.toLowerCase().trim(),
        isDeleted: false,
        _id: { $ne: userId }
      });
      if (exists) return sendError(res, 'Email already in use by another user', null, 400);
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (mobileNumber !== undefined) user.mobileNumber = normalizeMobile(mobileNumber);
    if (secondaryMobileNumber !== undefined) {
      user.secondaryMobileNumber = normalizeMobile(secondaryMobileNumber);
    }
    if (countryCode) user.countryCode = countryCode.trim();
    if (canUpdateProfile !== undefined) {
      user.canUpdateProfile = canUpdateProfile !== false && canUpdateProfile !== 'false';
    }
    if (password && String(password).trim().length >= 6) {
      user.password = await hashPassword(String(password).trim());
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

/**
 * Preview Excel headers + sample rows for mapping UI
 * POST /api/admin/users/import-preview
 */
export const importUsersPreview = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Excel/CSV file is required', null, 400);
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return sendError(res, 'Excel file is empty', null, 400);
    }

    const headers = Object.keys(rows[0]);
    const sampleRows = rows.slice(0, 5);

    return sendSuccess(res, 'Excel preview ready', {
      fileName: req.file.originalname,
      storedFile: req.file.filename,
      headers,
      sampleRows,
      totalRows: rows.length
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

/**
 * Import users using column mapping
 * POST /api/admin/users/import
 * body: { storedFile, mapping: { name, email, mobileNumber, secondaryMobileNumber, countryCode, password }, sendCredentials }
 */
export const importUsers = async (req, res) => {
  try {
    const {
      storedFile,
      mapping,
      sendCredentials = false
    } = typeof req.body.mapping === 'string'
      ? {
          storedFile: req.body.storedFile,
          mapping: JSON.parse(req.body.mapping || '{}'),
          sendCredentials: req.body.sendCredentials
        }
      : req.body;

    if (!storedFile) {
      return sendError(res, 'storedFile is required. Upload preview first.', null, 400);
    }
    if (!mapping?.name || !mapping?.email || !mapping?.mobileNumber) {
      return sendError(res, 'Mapping must include name, email and mobileNumber columns', null, 400);
    }

    const filePath = path.join(excelDir, storedFile);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'Uploaded Excel file not found. Please upload again.', null, 404);
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const created = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row[mapping.name] || '').trim();
      const email = String(row[mapping.email] || '').trim().toLowerCase();
      const mobileNumber = normalizeMobile(row[mapping.mobileNumber]);
      const secondaryMobileNumber = mapping.secondaryMobileNumber
        ? normalizeMobile(row[mapping.secondaryMobileNumber])
        : '';
      const countryCode = mapping.countryCode
        ? String(row[mapping.countryCode] || '+91').trim() || '+91'
        : '+91';
      const passwordRaw = mapping.password ? String(row[mapping.password] || '').trim() : '';

      if (!name || !email || !mobileNumber) {
        skipped.push({ row: i + 2, reason: 'Missing name/email/mobile', email: email || '-' });
        continue;
      }

      const exists = await User.findOne({ email, isDeleted: false });
      if (exists) {
        skipped.push({ row: i + 2, reason: 'Email already exists', email });
        continue;
      }

      const plainPassword = passwordRaw.length >= 6 ? passwordRaw : generateTempPassword();
      const hashed = await hashPassword(plainPassword);

      const user = await User.create({
        name,
        email,
        mobileNumber,
        secondaryMobileNumber,
        countryCode,
        password: hashed,
        isActive: true
      });

      if (sendCredentials === true || sendCredentials === 'true') {
        await sendLoginCredentialsEmail(user.email, user.name, plainPassword, user._id);
      }

      created.push({ id: user._id, name: user.name, email: user.email });
    }

    return sendSuccess(res, 'Excel import completed', {
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Reset password for all active users and email credentials
// @route   POST /api/admin/users/send-credentials-all
export const sendCredentialsToAll = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false, isActive: true });
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const user of users) {
      try {
        const plainPassword = generateTempPassword();
        user.password = await hashPassword(plainPassword);
        await user.save();
        const result = await sendLoginCredentialsEmail(user.email, user.name, plainPassword, user._id);
        if (result?.success) sent += 1;
        else {
          failed += 1;
          errors.push({ email: user.email, error: result?.error || 'send failed' });
        }
      } catch (err) {
        failed += 1;
        errors.push({ email: user.email, error: err.message });
      }
    }

    return sendSuccess(res, `Credentials emailed to ${sent} user(s)`, {
      total: users.length,
      sent,
      failed,
      errors: errors.slice(0, 20)
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
  resetUserPassword,
  importUsersPreview,
  importUsers,
  sendCredentialsToAll
};
