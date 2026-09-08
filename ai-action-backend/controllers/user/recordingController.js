import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Recording, VideoWatchLog, VideoPlayRequest, Workshop } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { canUserWatchRecording, ensureWorkshopAccessPopulated } from '../admin/recordingController.js';
import { signVideoStreamToken } from '../../utils/videoStreamToken.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getOrCreateWatchLog = async (recordingId, userId) => {
  let log = await VideoWatchLog.findOne({ recordingId, userId });
  if (!log) {
    log = await VideoWatchLog.create({
      recordingId,
      userId,
      playCount: 0,
      extraPlaysAllowed: 0,
      watchHistory: []
    });
  }
  return log;
};

const getMaxAllowed = (recording, log) =>
  Number(recording.maxPlayCount || 1) + Number(log?.extraPlaysAllowed || 0);

const isExternalUrl = (url = '') =>
  /^https?:\/\//i.test(url) ||
  url.includes('youtube') ||
  url.includes('youtu.be') ||
  url.includes('vimeo');

// @desc    List workshops assigned to the current user
// @route   POST /api/user/recordings/workshops
export const listMyWorkshops = async (req, res) => {
  try {
    const userId = req.user._id;

    const workshops = await Workshop.find({
      isDeleted: false,
      isActive: { $ne: false },
      assignedUsers: userId
    })
      .select('title description image createdAt')
      .sort({ createdAt: -1 });

    const ids = workshops.map((w) => w._id);
    const counts = await Recording.aggregate([
      {
        $match: {
          workshopId: { $in: ids },
          isDeleted: false,
          isActive: { $ne: false }
        }
      },
      { $group: { _id: '$workshopId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return sendSuccess(res, 'Workshops fetched successfully', {
      workshops: workshops.map((w) => ({
        id: w._id,
        title: w.title,
        description: w.description,
        image: w.image,
        videoCount: countMap.get(w._id.toString()) || 0,
        createdAt: w.createdAt
      }))
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List recordings the user is allowed to watch (+ play usage)
// @route   POST /api/user/recordings/list
export const listMyRecordings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workshopId } = req.body || {};

    const workshopQuery = {
      isDeleted: false,
      isActive: { $ne: false },
      assignedUsers: userId
    };
    if (workshopId) workshopQuery._id = workshopId;

    const workshops = await Workshop.find(workshopQuery).select('_id title');
    if (workshopId && !workshops.length) {
      return sendError(res, 'Workshop not found or you do not have access', null, 403);
    }

    const workshopIds = workshops.map((w) => w._id);
    const workshopTitleMap = new Map(workshops.map((w) => [w._id.toString(), w.title]));

    const recordings = await Recording.find({
      isDeleted: false,
      isActive: { $ne: false },
      workshopId: { $in: workshopIds }
    })
      .populate('workshopId', 'title assignedUsers')
      .sort({ dayNumber: 1, sessionNumber: 1 });

    const ids = recordings.map((r) => r._id);
    const logs = await VideoWatchLog.find({ recordingId: { $in: ids }, userId });
    const logMap = new Map(logs.map((l) => [l.recordingId.toString(), l]));

    const pendingReqs = await VideoPlayRequest.find({
      recordingId: { $in: ids },
      userId,
      status: 'pending'
    });
    const pendingSet = new Set(pendingReqs.map((p) => p.recordingId.toString()));

    const byDay = {};
    const list = recordings
      .filter((r) => canUserWatchRecording(r, userId))
      .map((r) => {
        const log = logMap.get(r._id.toString());
        const maxAllowed = getMaxAllowed(r, log);
        const playCount = log?.playCount || 0;
        const inProgress = Boolean(log?.inProgress);
        const remaining = Math.max(0, maxAllowed - playCount);
        const canPlay = remaining > 0 || inProgress;
        const workshopTitle =
          (r.workshopId && r.workshopId.title) ||
          workshopTitleMap.get((r.workshopId?._id || r.workshopId)?.toString()) ||
          '';
        const item = {
          id: r._id,
          workshopId: r.workshopId?._id || r.workshopId || null,
          workshopTitle,
          sessionTitle: r.sessionTitle,
          description: r.description,
          dayNumber: r.dayNumber,
          sessionNumber: r.sessionNumber,
          uploadDate: r.uploadDate,
          hasAccess: true,
          maxPlayCount: r.maxPlayCount || 1,
          playCount,
          remainingPlays: remaining,
          canPlay,
          inProgress,
          lastPositionSec: Number(log?.lastPositionSec || 0),
          hasPendingRequest: pendingSet.has(r._id.toString())
        };
        const key = `Day ${r.dayNumber}`;
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(item);
        return item;
      });

    return sendSuccess(res, 'Recordings fetched successfully', {
      recordings: list,
      byDay,
      workshop: workshopId && workshops[0]
        ? { id: workshops[0]._id, title: workshops[0].title }
        : null
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Open / resume watch (does NOT count a play until complete)
// @route   POST /api/user/recordings/watch
export const watchRecording = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({
      _id: recordingId,
      isDeleted: false,
      isActive: { $ne: false }
    });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    await ensureWorkshopAccessPopulated(recording);

    if (!canUserWatchRecording(recording, req.user._id)) {
      return sendError(res, 'You do not have permission to watch this recording. Contact admin.', null, 403);
    }

    const hasFile = Boolean(recording.videoFile);
    const hasUrl = Boolean(recording.videoUrl);
    if (!hasFile && !hasUrl) {
      return sendError(res, 'Video is not available yet', null, 404);
    }

    const log = await getOrCreateWatchLog(recordingId, req.user._id);
    const maxAllowed = getMaxAllowed(recording, log);
    const playCount = log.playCount || 0;
    const inProgress = Boolean(log.inProgress);

    // Limit only blocks a *new* watch after all completions are used up
    if (!inProgress && playCount >= maxAllowed) {
      const pending = await VideoPlayRequest.findOne({
        recordingId,
        userId: req.user._id,
        status: 'pending'
      });
      return sendError(
        res,
        'Play limit reached. Request admin for more plays.',
        {
          code: 'PLAY_LIMIT_REACHED',
          playCount,
          maxAllowed,
          remainingPlays: 0,
          hasPendingRequest: Boolean(pending)
        },
        403
      );
    }

    if (!log.inProgress) {
      log.inProgress = true;
      log.lastPositionSec = 0;
    }
    log.lastWatchedAt = new Date();
    await log.save();

    const remaining = Math.max(0, maxAllowed - log.playCount);

    // Uploaded files: short-lived stream token (no permanent URL / no login token in video src)
    let playbackUrl = '';
    let streamPath = '';
    let streamToken = '';
    let isStream = false;
    let fileSize = 0;

    if (hasFile) {
      isStream = true;
      streamPath = `/api/user/recordings/stream/${recording._id}`;
      streamToken = signVideoStreamToken({
        userId: req.user._id,
        recordingId: recording._id
      });
      playbackUrl = '';
      try {
        const relative = String(recording.videoFile).replace(/^\//, '');
        const filePath = path.join(__dirname, '../..', relative);
        if (fs.existsSync(filePath)) {
          fileSize = fs.statSync(filePath).size;
        }
      } catch {
        fileSize = 0;
      }
    } else if (hasUrl) {
      playbackUrl = recording.videoUrl;
      isStream = false;
    }

    return sendSuccess(res, 'Access granted', {
      recording: {
        id: recording._id,
        sessionTitle: recording.sessionTitle,
        description: recording.description,
        dayNumber: recording.dayNumber,
        sessionNumber: recording.sessionNumber,
        playbackUrl,
        streamPath,
        streamToken,
        fileSize,
        isStream,
        isExternal: isExternalUrl(playbackUrl),
        playCount: log.playCount,
        maxAllowed,
        remainingPlays: remaining,
        inProgress: true,
        lastPositionSec: Number(log.lastPositionSec || 0)
      }
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Save resume position (pause / close) — does not consume a play
// @route   POST /api/user/recordings/progress
export const saveWatchProgress = async (req, res) => {
  try {
    const { recordingId, positionSec = 0 } = req.body || {};
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const log = await VideoWatchLog.findOne({
      recordingId,
      userId: req.user._id
    });
    if (!log || !log.inProgress) {
      return sendSuccess(res, 'No active watch session', { saved: false });
    }

    const pos = Math.max(0, Number(positionSec) || 0);
    log.lastPositionSec = pos;
    log.lastWatchedAt = new Date();
    await log.save();

    return sendSuccess(res, 'Progress saved', {
      saved: true,
      lastPositionSec: log.lastPositionSec
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Mark video completed — increments playCount once
// @route   POST /api/user/recordings/complete
export const completeWatch = async (req, res) => {
  try {
    const { recordingId } = req.body || {};
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({
      _id: recordingId,
      isDeleted: false,
      isActive: { $ne: false }
    });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    await ensureWorkshopAccessPopulated(recording);
    if (!canUserWatchRecording(recording, req.user._id)) {
      return sendError(res, 'Access denied', null, 403);
    }

    const log = await getOrCreateWatchLog(recordingId, req.user._id);
    const maxAllowed = getMaxAllowed(recording, log);

    if (!log.inProgress) {
      return sendSuccess(res, 'Already counted or no active session', {
        counted: false,
        playCount: log.playCount || 0,
        maxAllowed,
        remainingPlays: Math.max(0, maxAllowed - (log.playCount || 0)),
        inProgress: false
      });
    }

    log.playCount = (log.playCount || 0) + 1;
    log.inProgress = false;
    log.lastPositionSec = 0;
    log.lastWatchedAt = new Date();
    log.watchHistory.push({ watchedAt: new Date() });
    await log.save();

    const remaining = Math.max(0, maxAllowed - log.playCount);

    return sendSuccess(res, 'Play counted — video completed', {
      counted: true,
      playCount: log.playCount,
      maxAllowed,
      remainingPlays: remaining,
      inProgress: false
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Authenticated video stream (inline, no attachment)
// @route   GET /api/user/recordings/stream/:recordingId
export const streamRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await Recording.findOne({
      _id: recordingId,
      isDeleted: false,
      isActive: { $ne: false }
    });
    if (!recording) return res.status(404).json({ status: false, message: 'Recording not found' });

    await ensureWorkshopAccessPopulated(recording);

    if (!canUserWatchRecording(recording, req.user._id)) {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }

    if (!recording.videoFile) {
      return res.status(404).json({ status: false, message: 'No uploaded video file' });
    }

    const log = await VideoWatchLog.findOne({ recordingId, userId: req.user._id });
    if (!log || !log.inProgress) {
      return res.status(403).json({
        status: false,
        message: 'Start watch session first'
      });
    }

    const relative = recording.videoFile.replace(/^\//, '');
    const filePath = path.join(__dirname, '../..', relative);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: false, message: 'Video file missing on server' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.webm'
        ? 'video/webm'
        : ext === '.ogg'
          ? 'video/ogg'
          : ext === '.mov'
            ? 'video/quicktime'
            : 'video/mp4';

    const range = req.headers.range;
    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    // Help deter hotlinking / casual download tools
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', fileSize);
      return res.status(200).end();
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize
      });
      file.pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }
};

// @desc    Request extra plays after limit reached
// @route   POST /api/user/recordings/request-play
export const requestMorePlays = async (req, res) => {
  try {
    const { recordingId, reason = '' } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({
      _id: recordingId,
      isDeleted: false,
      isActive: { $ne: false }
    });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

    await ensureWorkshopAccessPopulated(recording);

    if (!canUserWatchRecording(recording, req.user._id)) {
      return sendError(res, 'You do not have permission for this recording', null, 403);
    }

    const log = await getOrCreateWatchLog(recordingId, req.user._id);
    const maxAllowed = getMaxAllowed(recording, log);
    if ((log.playCount || 0) < maxAllowed) {
      return sendError(res, 'You still have plays remaining. No request needed.', null, 400);
    }

    const existing = await VideoPlayRequest.findOne({
      recordingId,
      userId: req.user._id,
      status: 'pending'
    });
    if (existing) {
      return sendError(res, 'You already have a pending request for this video', null, 400);
    }

    const request = await VideoPlayRequest.create({
      recordingId,
      userId: req.user._id,
      reason: String(reason || '').trim().slice(0, 500),
      status: 'pending'
    });

    return sendSuccess(res, 'Play request sent to admin', { request }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    My play requests
// @route   POST /api/user/recordings/my-requests
export const myPlayRequests = async (req, res) => {
  try {
    const requests = await VideoPlayRequest.find({ userId: req.user._id })
      .populate('recordingId', 'sessionTitle dayNumber sessionNumber')
      .sort({ createdAt: -1 })
      .limit(50);

    return sendSuccess(res, 'Requests fetched', {
      requests: requests.map((r) => ({
        id: r._id,
        status: r.status,
        reason: r.reason,
        adminNote: r.adminNote,
        extraPlaysGranted: r.extraPlaysGranted,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        recording: r.recordingId
          ? {
              id: r.recordingId._id,
              sessionTitle: r.recordingId.sessionTitle,
              dayNumber: r.recordingId.dayNumber,
              sessionNumber: r.recordingId.sessionNumber
            }
          : null
      }))
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  listMyRecordings,
  listMyWorkshops,
  watchRecording,
  saveWatchProgress,
  completeWatch,
  streamRecording,
  requestMorePlays,
  myPlayRequests
};
