import { Complaint } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatMine = (c) => ({
  id: c._id,
  type: c.type,
  subject: c.subject,
  message: c.message,
  image: c.image,
  status: c.status,
  adminReply: c.adminReply,
  repliedAt: c.repliedAt,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt
});

// @desc    User create complaint / suggestion
// @route   POST /api/user/complaints/create
export const createComplaint = async (req, res) => {
  try {
    const { type = 'complaint', subject, message } = req.body;

    if (!['complaint', 'suggestion', 'feedback'].includes(type)) {
      return sendError(res, 'Type must be complaint, suggestion, or feedback', null, 400);
    }
    if (!subject || !String(subject).trim()) {
      return sendError(res, 'Subject is required', null, 400);
    }
    if (!message || !String(message).trim()) {
      return sendError(res, 'Message is required', null, 400);
    }

    const image = req.file ? `/uploads/complaints/${req.file.filename}` : '';

    const item = await Complaint.create({
      userId: req.user._id,
      type,
      subject: String(subject).trim(),
      message: String(message).trim(),
      image,
      status: 'pending'
    });

    return sendSuccess(res, 'Submitted successfully', { complaint: formatMine(item) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    User list own complaints / suggestions
// @route   POST /api/user/complaints/list
export const listMyComplaints = async (req, res) => {
  try {
    const { type = 'all' } = req.body;
    const query = { userId: req.user._id, isDeleted: false };
    if (type && type !== 'all') query.type = type;

    const items = await Complaint.find(query).sort({ createdAt: -1 });

    return sendSuccess(res, 'Fetched successfully', {
      complaints: items.map(formatMine)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default { createComplaint, listMyComplaints };
