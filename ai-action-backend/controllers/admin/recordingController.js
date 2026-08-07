import { Recording, User, VideoWatchLog, VideoPlayRequest, AppSettings } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatRecording = (r, stats = null) => ({
  id: r._id,
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
 * Check if a user can watch a recording.
 * Denied list always wins. Allowed list is required — no auto-grant for present.
 */
export const canUserWatchRecording = (recording, userId) => {
  const uid = userId.toString();
  const denied = (recording.deniedUsers || []).map((id) => id.toString());
  if (denied.includes(uid)) return false;
  const allowed = (recording.allowedUsers || []).map((id) => id.toString());
  return allowed.includes(uid);
};

// @desc    Create Recording
// @route   POST /api/admin/recordings/create
export const createRecording = async (req, res) => {
  try {
    const {
      sessionTitle,
      description,
      dayNumber = 1,
      sessionNumber = 1,
      videoUrl = '',
      meetingId = null,
      maxPlayCount,
      allowedUsers = [],
      deniedUsers = []
    } = req.body;

    if (!sessionTitle) {
      return sendError(res, 'Session title is required', null, 400);
    }

    const videoFile = req.file ? `/uploads/recordings/${req.file.filename}` : '';

    if (!videoUrl && !videoFile) {
      return sendError(res, 'Provide a video URL or upload a video file', null, 400);
    }

    let allowed = allowedUsers;
    let denied = deniedUsers;
    if (typeof allowedUsers === 'string') {
      try { allowed = JSON.parse(allowedUsers); } catch { allowed = allowedUsers ? [allowedUsers] : []; }
    }
    if (typeof deniedUsers === 'string') {
      try { denied = JSON.parse(deniedUsers); } catch { denied = deniedUsers ? [deniedUsers] : []; }
    }

    const defaultLimit = await getDefaultMaxPlayCount();
    const playLimit = Math.max(1, Number(maxPlayCount) || defaultLimit);

    const recording = await Recording.create({
      sessionTitle: sessionTitle.trim(),
      description: description || '',
      dayNumber: Number(dayNumber) || 1,
      sessionNumber: Number(sessionNumber) || 1,
      videoUrl: videoUrl || '',
      videoFile,
      meetingId: meetingId || null,
      maxPlayCount: playLimit,
      allowedUsers: Array.isArray(allowed) ? allowed : [],
      deniedUsers: Array.isArray(denied) ? denied : [],
      uploadDate: new Date(),
      createdBy: req.admin._id
    });
    await recording.populate('allowedUsers', 'name email');
    await recording.populate('deniedUsers', 'name email');

    return sendSuccess(res, 'Recording created successfully', { recording: formatRecording(recording) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List Recordings
// @route   POST /api/admin/recordings/list
export const listRecordings = async (req, res) => {
  try {
    const { search = '', dayNumber, page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (dayNumber) query.dayNumber = Number(dayNumber);
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ sessionTitle: regex }, { description: regex }];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [recordings, total] = await Promise.all([
      Recording.find(query)
        .populate('allowedUsers', 'name email profilePhoto')
        .populate('deniedUsers', 'name email profilePhoto')
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
      .populate('allowedUsers', 'name email profilePhoto')
      .populate('deniedUsers', 'name email profilePhoto')
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
      sessionTitle,
      description,
      dayNumber,
      sessionNumber,
      videoUrl,
      meetingId,
      maxPlayCount
    } = req.body;

    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    if (sessionTitle !== undefined) recording.sessionTitle = sessionTitle.trim();
    if (description !== undefined) recording.description = description;
    if (dayNumber !== undefined) recording.dayNumber = Number(dayNumber);
    if (sessionNumber !== undefined) recording.sessionNumber = Number(sessionNumber);
    if (videoUrl !== undefined) recording.videoUrl = videoUrl;
    if (meetingId !== undefined) recording.meetingId = meetingId || null;
    if (maxPlayCount !== undefined) recording.maxPlayCount = Math.max(1, Number(maxPlayCount) || 1);
    if (req.file) recording.videoFile = `/uploads/recordings/${req.file.filename}`;
    await recording.save();
    await recording.populate('allowedUsers', 'name email profilePhoto');
    await recording.populate('deniedUsers', 'name email profilePhoto');

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

// @desc    Set video access permissions (core feature)
// @route   POST /api/admin/recordings/set-access
export const setRecordingAccess = async (req, res) => {
  try {
    const { recordingId, allowedUsers = [], deniedUsers = [], mode = 'replace' } = req.body;

    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    const allowed = Array.isArray(allowedUsers) ? allowedUsers : [];
    const denied = Array.isArray(deniedUsers) ? deniedUsers : [];

    if (mode === 'add') {
      const currentAllowed = new Set(recording.allowedUsers.map((id) => id.toString()));
      allowed.forEach((id) => currentAllowed.add(id.toString()));
      recording.allowedUsers = [...currentAllowed];

      const currentDenied = new Set(recording.deniedUsers.map((id) => id.toString()));
      denied.forEach((id) => currentDenied.add(id.toString()));
      // Remove from denied if being allowed
      allowed.forEach((id) => currentDenied.delete(id.toString()));
      recording.deniedUsers = [...currentDenied];
    } else if (mode === 'remove') {
      const removeSet = new Set(allowed.map((id) => id.toString()));
      recording.allowedUsers = recording.allowedUsers.filter((id) => !removeSet.has(id.toString()));
      if (denied.length) {
        const denyRemove = new Set(denied.map((id) => id.toString()));
        recording.deniedUsers = recording.deniedUsers.filter((id) => !denyRemove.has(id.toString()));
      }
    } else {
      // replace
      recording.allowedUsers = allowed;
      recording.deniedUsers = denied;
    }

    await recording.save();
    await recording.populate('allowedUsers', 'name email profilePhoto isActive');
    await recording.populate('deniedUsers', 'name email profilePhoto');

    return sendSuccess(res, 'Video access updated successfully', { recording: formatRecording(recording) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get all users with access flags for a recording
// @route   POST /api/admin/recordings/access-matrix
export const getAccessMatrix = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    const users = await User.find({ isDeleted: false, isActive: true }).select('name email profilePhoto').sort({ name: 1 });
    const allowedSet = new Set(recording.allowedUsers.map((id) => id.toString()));
    const deniedSet = new Set(recording.deniedUsers.map((id) => id.toString()));

    const matrix = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      profilePhoto: u.profilePhoto,
      canWatch: allowedSet.has(u._id.toString()) && !deniedSet.has(u._id.toString()),
      isAllowed: allowedSet.has(u._id.toString()),
      isDenied: deniedSet.has(u._id.toString())
    }));

    return sendSuccess(res, 'Access matrix fetched successfully', {
      recording: formatRecording(recording),
      matrix
    });
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
  setRecordingAccess,
  getAccessMatrix,
  getRecordingAnalytics,
  listPlayRequests,
  reviewPlayRequest,
  getVideoSettings,
  updateVideoSettings,
  canUserWatchRecording
};
