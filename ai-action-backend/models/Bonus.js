import mongoose from 'mongoose';

/**
 * Bonus rewards created by admin and assigned to selected users.
 */
const bonusSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Bonus title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
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

bonusSchema.index({ isDeleted: 1, isActive: 1 });
bonusSchema.index({ assignedUsers: 1 });

const Bonus = mongoose.model('Bonus', bonusSchema);
export default Bonus;
