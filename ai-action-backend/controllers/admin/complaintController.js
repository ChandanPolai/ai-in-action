import { Complaint } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatItem = (c) => ({
  id: c._id,
  type: c.type,
  subject: c.subject,
  message: c.message,
  image: c.image,
  status: c.status,
  adminReply: c.adminReply,
  repliedAt: c.repliedAt,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  user: c.userId
    ? {
        id: c.userId._id || c.userId,
        name: c.userId.name,
        email: c.userId.email,
        mobileNumber: c.userId.mobileNumber
      }
    : null
});

// @desc    Admin list complaints / suggestions
// @route   POST /api/admin/complaints/list
export const listComplaints = async (req, res) => {
  try {
    const { type = 'all', status = 'all', search = '', page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (type && type !== 'all') query.type = type;
    if (status && status !== 'all') query.status = status;
    if (search) {
      const regex = new RegExp(String(search).trim(), 'i');
      query.$or = [{ subject: regex }, { message: regex }];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Complaint.find(query)
        .populate('userId', 'name email mobileNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Complaint.countDocuments(query)
    ]);

    return sendSuccess(res, 'Complaints fetched successfully', {
      complaints: items.map(formatItem),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Admin update status / reply
// @route   POST /api/admin/complaints/update
export const updateComplaint = async (req, res) => {
  try {
    const { complaintId, status, adminReply } = req.body;
    if (!complaintId) return sendError(res, 'complaintId is required', null, 400);

    const item = await Complaint.findOne({ _id: complaintId, isDeleted: false });
    if (!item) return sendError(res, 'Complaint not found', null, 404);

    if (status) {
      if (!['pending', 'in-progress', 'resolved', 'closed'].includes(status)) {
        return sendError(res, 'Invalid status', null, 400);
      }
      item.status = status;
    }

    if (adminReply !== undefined) {
      item.adminReply = String(adminReply || '').trim();
      item.repliedBy = req.admin._id;
      item.repliedAt = new Date();
    }

    await item.save();
    await item.populate('userId', 'name email mobileNumber');

    return sendSuccess(res, 'Updated successfully', { complaint: formatItem(item) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Admin soft delete
// @route   POST /api/admin/complaints/delete
export const deleteComplaint = async (req, res) => {
  try {
    const { complaintId } = req.body;
    if (!complaintId) return sendError(res, 'complaintId is required', null, 400);

    const item = await Complaint.findOne({ _id: complaintId, isDeleted: false });
    if (!item) return sendError(res, 'Complaint not found', null, 404);

    item.isDeleted = true;
    await item.save();

    return sendSuccess(res, 'Deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default { listComplaints, updateComplaint, deleteComplaint };
