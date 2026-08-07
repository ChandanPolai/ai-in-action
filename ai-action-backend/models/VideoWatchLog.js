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
    playCount: {
      type: Number,
      default: 0
    },
    // Extra plays granted by admin after user request
    extraPlaysAllowed: {
      type: Number,
      default: 0
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
