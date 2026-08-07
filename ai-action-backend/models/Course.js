import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true
    },
    details: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    gstPercent: {
      type: Number,
      default: 18,
      min: 0
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    image: {
      type: String,
      default: ''
    },
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

courseSchema.index({ isDeleted: 1, isActive: 1 });

const Course = mongoose.model('Course', courseSchema);
export default Course;
