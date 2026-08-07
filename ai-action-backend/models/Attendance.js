import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: [true, 'Meeting ID is required']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'absent'
    },
    joinedAt: {
      type: Date,
      default: null
    },
    markedBy: {
      type: String,
      enum: ['system', 'admin', 'user-join'],
      default: 'system'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index({ meetingId: 1, userId: 1 }, { unique: true });
attendanceSchema.index({ userId: 1, createdAt: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
