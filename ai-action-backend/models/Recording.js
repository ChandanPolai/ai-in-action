import mongoose from 'mongoose';

/**
 * Session Recording with explicit video access control.
 * Present users do NOT automatically get access.
 * Admin must explicitly allow users via allowedUsers.
 */
const recordingSchema = new mongoose.Schema(
  {
    sessionTitle: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    dayNumber: {
      type: Number,
      required: [true, 'Day number is required'],
      default: 1
    },
    sessionNumber: {
      type: Number,
      required: [true, 'Session number is required'],
      default: 1
    },
    videoUrl: {
      type: String,
      default: '',
      trim: true
    },
    videoFile: {
      type: String,
      default: ''
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null
    },
    // Global play limit for every allowed user (default 1)
    maxPlayCount: {
      type: Number,
      default: 1,
      min: 1
    },
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    deniedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

recordingSchema.index({ dayNumber: 1, sessionNumber: 1 });
recordingSchema.index({ allowedUsers: 1 });

const Recording = mongoose.model('Recording', recordingSchema);
export default Recording;
