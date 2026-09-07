import mongoose from 'mongoose';

/**
 * Session Recording belonging to a Workshop.
 * Access is controlled via workshop.assignedUsers (not per-video).
 */
const recordingSchema = new mongoose.Schema(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      default: null
    },
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
    maxPlayCount: {
      type: Number,
      default: 1,
      min: 1
    },
    // Legacy fields — access now uses workshop.assignedUsers
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
    isActive: {
      type: Boolean,
      default: true
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
recordingSchema.index({ workshopId: 1 });
recordingSchema.index({ allowedUsers: 1 });

const Recording = mongoose.model('Recording', recordingSchema);
export default Recording;
