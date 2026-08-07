import { Recording, User } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatRecording = (r) => ({
  id: r._id,
  sessionTitle: r.sessionTitle,
  description: r.description,
  dayNumber: r.dayNumber,
  sessionNumber: r.sessionNumber,
  videoUrl: r.videoUrl,
  videoFile: r.videoFile,
  uploadDate: r.uploadDate,
  meetingId: r.meetingId,
  allowedUsers: r.allowedUsers,
  deniedUsers: r.deniedUsers,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt
});

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

    const recording = await Recording.create({
      sessionTitle: sessionTitle.trim(),
      description: description || '',
      dayNumber: Number(dayNumber) || 1,
      sessionNumber: Number(sessionNumber) || 1,
      videoUrl: videoUrl || '',
      videoFile,
      meetingId: meetingId || null,
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

    return sendSuccess(res, 'Recordings fetched successfully', {
      recordings: recordings.map(formatRecording),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
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
      meetingId
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

export default {
  createRecording,
  listRecordings,
  getRecording,
  updateRecording,
  deleteRecording,
  setRecordingAccess,
  getAccessMatrix,
  canUserWatchRecording
};
