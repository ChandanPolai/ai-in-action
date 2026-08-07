import mongoose from 'mongoose';

const meetingReviewSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: '',
      trim: true
    }
  },
  { timestamps: true }
);

meetingReviewSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

const MeetingReview = mongoose.model('MeetingReview', meetingReviewSchema);
export default MeetingReview;
