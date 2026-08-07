import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';

import connectDB from './config/db.js';
import { sendSuccess } from './utils/apiResponse.js';
import { apiLimiter, authLimiter } from './middlewares/rateLimiter.js';

import adminAuthRoutes from './routes/admin/authRoutes.js';
import adminUserRoutes from './routes/admin/userRoutes.js';
import adminDashboardRoutes from './routes/admin/dashboardRoutes.js';
import adminMeetingRoutes from './routes/admin/meetingRoutes.js';
import adminAttendanceRoutes from './routes/admin/attendanceRoutes.js';
import adminRecordingRoutes from './routes/admin/recordingRoutes.js';

import userAuthRoutes from './routes/user/authRoutes.js';
import userMeetingRoutes from './routes/user/meetingRoutes.js';
import userAttendanceRoutes from './routes/user/attendanceRoutes.js';
import userRecordingRoutes from './routes/user/recordingRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

connectDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiters temporarily disabled
// app.use('/api/', apiLimiter);
// app.use('/api/admin/auth/', authLimiter);
// app.use('/api/user/auth/', authLimiter);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/uploads/admin', express.static(path.join(__dirname, 'uploads/admin')));
app.use('/uploads/users', express.static(path.join(__dirname, 'uploads/users')));
// Recordings are served only via authenticated stream — no public download URL
// app.use('/uploads/recordings', express.static(path.join(__dirname, 'uploads/recordings')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/adminapp', express.static(path.join(__dirname, 'adminapp')));
app.use('/userapp', express.static(path.join(__dirname, 'userapp')));

const healthHandler = (req, res) => {
  return sendSuccess(res, 'AI in Action Backend API is running smoothly', {
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`
  });
};
app.post('/api/health', healthHandler);
app.get('/api/health', healthHandler);

// Admin APIs
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/meetings', adminMeetingRoutes);
app.use('/api/admin/attendance', adminAttendanceRoutes);
app.use('/api/admin/recordings', adminRecordingRoutes);

// User APIs
app.use('/api/user/auth', userAuthRoutes);
app.use('/api/user/meetings', userMeetingRoutes);
app.use('/api/user/attendance', userAttendanceRoutes);
app.use('/api/user/recordings', userRecordingRoutes);

// SPA Fallbacks
app.get(['/adminapp', '/adminapp/*'], (req, res) => {
  const adminIndex = path.join(__dirname, 'adminapp', 'index.html');
  if (fs.existsSync(adminIndex)) {
    res.sendFile(adminIndex);
  } else {
    res.send('Admin application build not found. Run npm run build:admin');
  }
});

app.get(['/userapp', '/userapp/*'], (req, res) => {
  const userIndex = path.join(__dirname, 'userapp', 'index.html');
  if (fs.existsSync(userIndex)) {
    res.sendFile(userIndex);
  } else {
    res.send('User application build not found. Run npm run build:user');
  }
});

app.get('/', (req, res) => {
  res.redirect('/adminapp/');
});

app.use((req, res) => {
  res.status(404).json({
    status: false,
    message: 'Endpoint or Route not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AI in Action server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
