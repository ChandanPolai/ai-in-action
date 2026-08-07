import { Recording } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { canUserWatchRecording } from '../admin/recordingController.js';

// @desc    List recordings the user is allowed to watch
// @route   POST /api/user/recordings/list
export const listMyRecordings = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Fetch recordings where user is in allowedUsers and not in deniedUsers
    const recordings = await Recording.find({
      isDeleted: false,
      allowedUsers: req.user._id,
      deniedUsers: { $ne: req.user._id }
    }).sort({ dayNumber: 1, sessionNumber: 1 });

    const byDay = {};
    const list = recordings
      .filter((r) => canUserWatchRecording(r, userId))
      .map((r) => {
        const item = {
          id: r._id,
          sessionTitle: r.sessionTitle,
          description: r.description,
          dayNumber: r.dayNumber,
          sessionNumber: r.sessionNumber,
          uploadDate: r.uploadDate,
          hasAccess: true
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

// @desc    Get recording playback URL (access-controlled)
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

    const playbackUrl = recording.videoUrl || recording.videoFile;
    if (!playbackUrl) {
      return sendError(res, 'Video is not available yet', null, 404);
    }

    return sendSuccess(res, 'Access granted', {
      recording: {
        id: recording._id,
        sessionTitle: recording.sessionTitle,
        description: recording.description,
        dayNumber: recording.dayNumber,
        sessionNumber: recording.sessionNumber,
        playbackUrl
      }
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  listMyRecordings,
  watchRecording
};
