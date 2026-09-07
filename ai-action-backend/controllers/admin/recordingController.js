import { Recording, User, VideoWatchLog, VideoPlayRequest, AppSettings, Attendance, Meeting, Workshop } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { grantAbsenteesForRecording } from '../../utils/videoAccess.js';

const formatRecording = (r, stats = null) => ({
  id: r._id,
  workshopId: r.workshopId?._id || r.workshopId || null,
  workshop: r.workshopId && typeof r.workshopId === 'object' && r.workshopId.title
    ? { id: r.workshopId._id, title: r.workshopId.title }
    : null,
  sessionTitle: r.sessionTitle,
  description: r.description,
  dayNumber: r.dayNumber,
  sessionNumber: r.sessionNumber,
  videoUrl: r.videoUrl,
  videoFile: r.videoFile,
  uploadDate: r.uploadDate,
  meetingId: r.meetingId,
  maxPlayCount: r.maxPlayCount ?? 1,
  allowedUsers: r.allowedUsers,
  deniedUsers: r.deniedUsers,
  isActive: r.isActive !== false,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  ...(stats
    ? {
        totalPlays: stats.totalPlays || 0,
        uniqueViewers: stats.uniqueViewers || 0
      }
    : {})
});

const getDefaultMaxPlayCount = async () => {
  const settings = await AppSettings.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { defaultMaxPlayCount: 1 } },
    { upsert: true, new: true }
  );
  return Math.max(1, Number(settings.defaultMaxPlayCount) || 1);
};
/**
 * Check if a user can watch via workshop.assignedUsers.
 * Prefer populated workshopId.assignedUsers; fall back to legacy allowedUsers.
 */
export const canUserWatchRecording = (recording, userId) => {
  const uid = userId.toString();
  const workshop = recording.workshopId;

  if (workshop && typeof workshop === 'object' && Array.isArray(workshop.assignedUsers)) {
    return workshop.assignedUsers.some((id) => (id._id || id).toString() === uid);
  }

  const allowed = (recording.allowedUsers || []).map((id) => (id._id || id).toString());
  return allowed.includes(uid);
};

export const ensureWorkshopAccessPopulated = async (recording) => {
  if (!recording) return recording;
  if (
    recording.workshopId &&
    typeof recording.workshopId === 'object' &&
    Array.isArray(recording.workshopId.assignedUsers)
  ) {
    return recording;
  }
  if (recording.workshopId) {
    await recording.populate('workshopId', 'title assignedUsers isActive isDeleted');
  }
  return recording;
};

// @desc    Create Recording
// @route   POST /api/admin/recordings/create
export const createRecording = async (req, res) => {
  try {
    const {
      workshopId,
      sessionTitle,
      description,
      dayNumber = 1,
      sessionNumber = 1,
      videoUrl = '',
      meetingId = null,
      maxPlayCount,
      isActive = true
    } = req.body;

    if (workshopId) {
      const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
      if (!workshop) return sendError(res, 'Workshop not found', null, 404);
    }
    if (!sessionTitle) {
      return sendError(res, 'Session title is required', null, 400);
    }

    const videoFile = req.file ? `/uploads/recordings/${req.file.filename}` : '';

    if (!videoUrl && !videoFile) {
      return sendError(res, 'Provide a video URL or upload a video file', null, 400);
    }

    const defaultLimit = await getDefaultMaxPlayCount();
    const playLimit = Math.max(1, Number(maxPlayCount) || defaultLimit);

    const recording = await Recording.create({
      workshopId: workshopId || null,
      sessionTitle: sessionTitle.trim(),
      description: description || '',
      dayNumber: Number(dayNumber) || 1,
      sessionNumber: Number(sessionNumber) || 1,
      videoUrl: videoUrl || '',
      videoFile,
      meetingId: meetingId || null,
      maxPlayCount: playLimit,
      allowedUsers: [],
      deniedUsers: [],
      isActive: String(isActive) !== 'false' && isActive !== false,
      uploadDate: new Date(),
      createdBy: req.admin._id
    });
    await recording.populate('workshopId', 'title assignedUsers');

    await grantAbsenteesForRecording(recording);

    return sendSuccess(res, 'Recording created successfully', { recording: formatRecording(recording) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List Recordings
// @route   POST /api/admin/recordings/list
export const listRecordings = async (req, res) => {
  try {
    const { search = '', dayNumber, workshopId, isActive = 'all', page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (dayNumber) query.dayNumber = Number(dayNumber);
    if (workshopId) query.workshopId = workshopId;
    if (isActive === 'active') query.isActive = { $ne: false };
    if (isActive === 'inactive') query.isActive = false;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ sessionTitle: regex }, { description: regex }];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [recordings, total] = await Promise.all([
      Recording.find(query)
        .populate('workshopId', 'title assignedUsers')
        .populate('meetingId', 'title meetingDate')
        .sort({ dayNumber: 1, sessionNumber: 1, uploadDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Recording.countDocuments(query)
    ]);

    const recordingIds = recordings.map((r) => r._id);
    const watchStats = await VideoWatchLog.aggregate([
      { $match: { recordingId: { $in: recordingIds } } },
      {
        $group: {
          _id: '$recordingId',
          totalPlays: { $sum: '$playCount' },
          uniqueViewers: { $sum: { $cond: [{ $gt: ['$playCount', 0] }, 1, 0] } }
        }
      }
    ]);
    const statsMap = new Map(watchStats.map((s) => [s._id.toString(), s]));

    return sendSuccess(res, 'Recordings fetched successfully', {
      recordings: recordings.map((r) => formatRecording(r, statsMap.get(r._id.toString()))),
      total,
      page: Number(page),
      limit: Number(limit)
    });  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get Recording
// @route   POST /api/admin/recordings/get
export const getRecording = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false })
      .populate('workshopId', 'title assignedUsers')
      .populate('meetingId', 'title meetingDate');

    if (!recording) return sendError(res, 'Recording not found', null, 404);

    return sendSuccess(res, 'Recording fetched successfully', { recording: formatRecording(recording) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update Recording
// @route   POST /api/admin/recordings/update
export const updateRecording = async (req, res) => {
  try {
    const {
      recordingId,
      workshopId,
      sessionTitle,
      description,
      dayNumber,
      sessionNumber,
      videoUrl,
      meetingId,
      maxPlayCount,
      isActive
    } = req.body;

    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    if (workshopId !== undefined) {
      if (!workshopId || workshopId === 'null' || workshopId === '') {
        recording.workshopId = null;
      } else {
        const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
        if (!workshop) return sendError(res, 'Workshop not found', null, 404);
        recording.workshopId = workshopId;
      }
    }
    if (sessionTitle !== undefined) recording.sessionTitle = sessionTitle.trim();
    if (description !== undefined) recording.description = description;
    if (dayNumber !== undefined) recording.dayNumber = Number(dayNumber);
    if (sessionNumber !== undefined) recording.sessionNumber = Number(sessionNumber);
    if (videoUrl !== undefined) recording.videoUrl = videoUrl;
    if (meetingId !== undefined) recording.meetingId = meetingId || null;
    if (maxPlayCount !== undefined) recording.maxPlayCount = Math.max(1, Number(maxPlayCount) || 1);
    if (isActive !== undefined) {
      recording.isActive = String(isActive) !== 'false' && isActive !== false;
    }
    if (req.file) recording.videoFile = `/uploads/recordings/${req.file.filename}`;
    await recording.save();

    await grantAbsenteesForRecording(recording);

    await recording.populate('workshopId', 'title assignedUsers');

    return sendSuccess(res, 'Recording updated successfully', { recording: formatRecording(recording) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Delete Recording
// @route   POST /api/admin/recordings/delete
export const deleteRecording = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    recording.isDeleted = true;
    await recording.save();

    return sendSuccess(res, 'Recording deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const toggleRecordingStatus = async (req, res) => {
  try {
    const { recordingId, isActive } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    if (isActive !== undefined) {
      recording.isActive = String(isActive) !== 'false' && isActive !== false;
    } else {
      recording.isActive = recording.isActive === false;
    }
    await recording.save();
    await recording.populate('workshopId', 'title');

    return sendSuccess(
      res,
      `Recording ${recording.isActive !== false ? 'activated' : 'deactivated'} successfully`,
      { recording: formatRecording(recording) }
    );
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// Legacy — access is managed on Workshop
export const setRecordingAccess = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    return sendError(
      res,
      'Video access is managed on the Workshop. Use /api/admin/workshops/set-access',
      { workshopId: recording.workshopId },
      400
    );
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const getAccessMatrix = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    return sendError(
      res,
      'Access matrix is on the Workshop. Use /api/admin/workshops/access-matrix',
      { workshopId: recording.workshopId },
      400
    );
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Watch analytics for one recording
// @route   POST /api/admin/recordings/analytics
export const getRecordingAnalytics = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    const logs = await VideoWatchLog.find({ recordingId })
      .populate('userId', 'name email mobile profilePhoto')
      .sort({ playCount: -1, lastWatchedAt: -1 });

    const totalPlays = logs.reduce((sum, l) => sum + (l.playCount || 0), 0);

    return sendSuccess(res, 'Analytics fetched', {
      recording: formatRecording(recording, {
        totalPlays,
        uniqueViewers: logs.filter((l) => l.playCount > 0).length
      }),
      viewers: logs.map((l) => ({
        id: l._id,
        playCount: l.playCount,
        extraPlaysAllowed: l.extraPlaysAllowed,
        maxAllowed: (recording.maxPlayCount || 1) + (l.extraPlaysAllowed || 0),
        lastWatchedAt: l.lastWatchedAt,
        user: l.userId
          ? {
              id: l.userId._id,
              name: l.userId.name,
              email: l.userId.email,
              mobile: l.userId.mobile,
              profilePhoto: l.userId.profilePhoto
            }
          : null
      }))
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List video play requests
// @route   POST /api/admin/recordings/play-requests
export const listPlayRequests = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 50 } = req.body;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      VideoPlayRequest.find(query)
        .populate('userId', 'name email mobile')
        .populate('recordingId', 'sessionTitle dayNumber sessionNumber maxPlayCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      VideoPlayRequest.countDocuments(query)
    ]);

    return sendSuccess(res, 'Play requests fetched', {
      requests: requests.map((r) => ({
        id: r._id,
        status: r.status,
        reason: r.reason,
        adminNote: r.adminNote,
        extraPlaysGranted: r.extraPlaysGranted,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        user: r.userId
          ? { id: r.userId._id, name: r.userId.name, email: r.userId.email, mobile: r.userId.mobile }
          : null,
        recording: r.recordingId
          ? {
              id: r.recordingId._id,
              sessionTitle: r.recordingId.sessionTitle,
              dayNumber: r.recordingId.dayNumber,
              sessionNumber: r.recordingId.sessionNumber,
              maxPlayCount: r.recordingId.maxPlayCount
            }
          : null
      })),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Approve / reject play request
// @route   POST /api/admin/recordings/review-play-request
export const reviewPlayRequest = async (req, res) => {
  try {
    const { requestId, action, extraPlays = 1, adminNote = '' } = req.body;
    if (!requestId) return sendError(res, 'requestId is required', null, 400);
    if (!['approve', 'reject'].includes(action)) {
      return sendError(res, 'action must be approve or reject', null, 400);
    }

    const request = await VideoPlayRequest.findById(requestId);
    if (!request) return sendError(res, 'Request not found', null, 404);
    if (request.status !== 'pending') {
      return sendError(res, 'Request already reviewed', null, 400);
    }

    if (action === 'reject') {
      request.status = 'rejected';
      request.adminNote = String(adminNote || '').trim();
      request.reviewedBy = req.admin._id;
      request.reviewedAt = new Date();
      await request.save();
      return sendSuccess(res, 'Request rejected', { request });
    }

    const plays = Math.max(1, Number(extraPlays) || 1);
    let log = await VideoWatchLog.findOne({
      recordingId: request.recordingId,
      userId: request.userId
    });
    if (!log) {
      log = await VideoWatchLog.create({
        recordingId: request.recordingId,
        userId: request.userId,
        playCount: 0,
        extraPlaysAllowed: 0
      });
    }
    log.extraPlaysAllowed = (log.extraPlaysAllowed || 0) + plays;
    await log.save();

    request.status = 'approved';
    request.extraPlaysGranted = plays;
    request.adminNote = String(adminNote || '').trim();
    request.reviewedBy = req.admin._id;
    request.reviewedAt = new Date();
    await request.save();

    return sendSuccess(res, `Approved — ${plays} extra play(s) granted`, {
      request,
      watchLog: {
        playCount: log.playCount,
        extraPlaysAllowed: log.extraPlaysAllowed
      }
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get / update global default play limit
// @route   POST /api/admin/recordings/settings
export const getVideoSettings = async (req, res) => {
  try {
    const settings = await AppSettings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { defaultMaxPlayCount: 1 } },
      { upsert: true, new: true }
    );
    return sendSuccess(res, 'Settings fetched', {
      defaultMaxPlayCount: settings.defaultMaxPlayCount
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateVideoSettings = async (req, res) => {
  try {
    const { defaultMaxPlayCount } = req.body;
    const value = Math.max(1, Number(defaultMaxPlayCount) || 1);
    const settings = await AppSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: { defaultMaxPlayCount: value } },
      { upsert: true, new: true }
    );
    return sendSuccess(res, 'Global play limit updated', {
      defaultMaxPlayCount: settings.defaultMaxPlayCount
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  createRecording,
  listRecordings,
  getRecording,
  updateRecording,
  deleteRecording,
  toggleRecordingStatus,
  setRecordingAccess,
  getAccessMatrix,
  getRecordingAnalytics,
  listPlayRequests,
  reviewPlayRequest,
  getVideoSettings,
  updateVideoSettings,
  canUserWatchRecording
};
