import mongoose from 'mongoose';

const videoWatchLogSchema = new mongoose.Schema(
  {
    recordingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recording',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Completed full watches only (not open/pause)
    playCount: {
      type: Number,
      default: 0
    },
    // Extra plays granted by admin after user request
    extraPlaysAllowed: {
      type: Number,
      default: 0
    },
    // True while user has an unfinished watch they can resume
    inProgress: {
      type: Boolean,
      default: false
    },
    lastPositionSec: {
      type: Number,
      default: 0,
      min: 0
    },
    lastWatchedAt: {
      type: Date,
      default: null
    },
    watchHistory: [
      {
        watchedAt: { type: Date, default: Date.now },
        _id: false
      }
    ]
  },
  { timestamps: true }
);

videoWatchLogSchema.index({ recordingId: 1, userId: 1 }, { unique: true });

const VideoWatchLog = mongoose.model('VideoWatchLog', videoWatchLogSchema);
export default VideoWatchLog;
