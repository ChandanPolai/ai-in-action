import mongoose from 'mongoose';

const videoPlayRequestSchema = new mongoose.Schema(
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
    reason: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    extraPlaysGranted: {
      type: Number,
      default: 1
    },
    adminNote: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

videoPlayRequestSchema.index({ recordingId: 1, userId: 1, status: 1 });

const VideoPlayRequest = mongoose.model('VideoPlayRequest', videoPlayRequestSchema);
export default VideoPlayRequest;
