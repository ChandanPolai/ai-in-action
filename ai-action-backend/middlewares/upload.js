import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadAdminDir = path.join(__dirname, '../uploads/admin');
const uploadUserDir = path.join(__dirname, '../uploads/users');
const uploadRecordingDir = path.join(__dirname, '../uploads/recordings');

const uploadExcelDir = path.join(__dirname, '../uploads/excel');

[uploadAdminDir, uploadUserDir, uploadRecordingDir, uploadExcelDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed!'), false);
  }
};

const videoFilter = (req, file, cb) => {
  const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'application/octet-stream'];
  if (file.mimetype.startsWith('video/') || allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const makeStorage = (dir, prefix) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });

export const uploadAdminAvatar = multer({
  storage: makeStorage(uploadAdminDir, 'admin-avatar'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadUserAvatar = multer({
  storage: makeStorage(uploadUserDir, 'user-avatar'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadRecordingVideo = multer({
  storage: makeStorage(uploadRecordingDir, 'recording'),
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 }
});

const excelFilter = (req, file, cb) => {
  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
    'text/plain',
    'application/octet-stream'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || ['.xlsx', '.xls', '.csv'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel/CSV files are allowed (.xlsx, .xls, .csv)'), false);
  }
};

export const uploadExcelFile = multer({
  storage: makeStorage(uploadExcelDir, 'users-excel'),
  fileFilter: excelFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export default {
  uploadAdminAvatar,
  uploadUserAvatar,
  uploadRecordingVideo,
  uploadExcelFile
};
