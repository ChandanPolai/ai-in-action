import mongoose from 'mongoose';

/**
 * Future-ready notification log for Email / WhatsApp modules.
 * Architecture placeholder — channels can be extended without schema refactor.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'sms', 'in-app'],
      required: true
    },
    type: {
      type: String,
      enum: [
        'login-credentials',
        'meeting-reminder',
        'meeting-review',
        'attendance',
        'recording-access',
        'password-reset',
        'general'
      ],
      default: 'general'
    },
    title: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      default: ''
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending'
    },
    sentAt: {
      type: Date,
      default: null
    },
    error: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
