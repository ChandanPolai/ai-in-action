import mongoose from 'mongoose';

/**
 * Workshop groups session recordings.
 * Users assigned here can watch all videos under this workshop.
 */
const workshopSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Workshop title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    image: {
      type: String,
      default: ''
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isActive: {
      type: Boolean,
      default: true
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
  { timestamps: true }
);

workshopSchema.index({ isDeleted: 1, isActive: 1 });
workshopSchema.index({ assignedUsers: 1 });

const Workshop = mongoose.model('Workshop', workshopSchema);
export default Workshop;
