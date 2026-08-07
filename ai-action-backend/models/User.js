import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    secondaryMobileNumber: {
      type: String,
      default: '',
      trim: true
    },
    countryCode: {
      type: String,
      default: '+91',
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6
    },
    profilePhoto: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    canUpdateProfile: {
      type: Boolean,
      default: true
    },
    resetPasswordToken: {
      type: String,
      default: ''
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ mobileNumber: 1, isDeleted: 1 });
userSchema.index({ secondaryMobileNumber: 1, isDeleted: 1 });

const User = mongoose.model('User', userSchema);
export default User;
