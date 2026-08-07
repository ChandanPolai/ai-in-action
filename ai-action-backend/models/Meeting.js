import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    meetingDate: {
      type: Date,
      required: [true, 'Meeting date is required']
    },
    meetingTime: {
      type: String,
      required: [true, 'Meeting start time is required'],
      trim: true
    },
    startTime: {
      type: String,
      default: '',
      trim: true
    },
    endTime: {
      type: String,
      default: '',
      trim: true
    },
    zoomLink: {
      type: String,
      required: [true, 'Zoom meeting link is required'],
      trim: true
    },
    dayNumber: {
      type: Number,
      default: 1
    },
    sessionNumber: {
      type: Number,
      default: 1
    },
    organizationType: {
      type: String,
      enum: ['day-wise', 'session-wise'],
      default: 'day-wise'
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['upcoming', 'live', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    reviewEmailSent: {
      type: Boolean,
      default: false
    },
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

meetingSchema.index({ meetingDate: 1, status: 1 });
meetingSchema.index({ assignedUsers: 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
