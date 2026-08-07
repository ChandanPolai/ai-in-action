import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Recording, VideoWatchLog, VideoPlayRequest } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { canUserWatchRecording } from '../admin/recordingController.js';

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

// @desc    List recordings the user is allowed to watch (+ play usage)
// @route   POST /api/user/recordings/list
export const listMyRecordings = async (req, res) => {
  try {
    const userId = req.user._id;

    const recordings = await Recording.find({
      isDeleted: false,
      allowedUsers: userId,
      deniedUsers: { $ne: userId }
    }).sort({ dayNumber: 1, sessionNumber: 1 });

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
        const remaining = Math.max(0, maxAllowed - playCount);
        const item = {
          id: r._id,
          sessionTitle: r.sessionTitle,
          description: r.description,
          dayNumber: r.dayNumber,
          sessionNumber: r.sessionNumber,
          uploadDate: r.uploadDate,
          hasAccess: true,
          maxPlayCount: r.maxPlayCount || 1,
          playCount,
          remainingPlays: remaining,
          canPlay: remaining > 0,
          hasPendingRequest: pendingSet.has(r._id.toString())
        };
        const key = `Day ${r.dayNumber}`;
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(item);
        return item;
      });

    return sendSuccess(res, 'Recordings fetched successfully', {
      recordings: list,
      byDay
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Start watch session (counts as 1 play). Enforces play limit.
// @route   POST /api/user/recordings/watch
export const watchRecording = async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) return sendError(res, 'recordingId is required', null, 400);

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

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

    if (playCount >= maxAllowed) {
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

    log.playCount = playCount + 1;
    log.lastWatchedAt = new Date();
    log.watchHistory.push({ watchedAt: new Date() });
    await log.save();

    const remaining = Math.max(0, maxAllowed - log.playCount);

    // Uploaded files: authenticated stream only (no public URL / no download link)
    let playbackUrl = '';
    let streamPath = '';
    let isStream = false;

    if (hasFile) {
      isStream = true;
      streamPath = `/api/user/recordings/stream/${recording._id}`;
      playbackUrl = streamPath;
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
        isStream,
        isExternal: isExternalUrl(playbackUrl),
        playCount: log.playCount,
        maxAllowed,
        remainingPlays: remaining
      }
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
    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return res.status(404).json({ status: false, message: 'Recording not found' });

    if (!canUserWatchRecording(recording, req.user._id)) {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }

    if (!recording.videoFile) {
      return res.status(404).json({ status: false, message: 'No uploaded video file' });
    }

    const log = await VideoWatchLog.findOne({ recordingId, userId: req.user._id });
    if (!log || log.playCount < 1) {
      return res.status(403).json({ status: false, message: 'Start watch session first' });
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

    const recording = await Recording.findOne({ _id: recordingId, isDeleted: false });
    if (!recording) return sendError(res, 'Recording not found', null, 404);

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
  watchRecording,
  streamRecording,
  requestMorePlays,
  myPlayRequests
};
