import { Workshop, User, Recording } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatWorkshop = (w, extra = {}) => ({
  id: w._id,
  title: w.title,
  description: w.description,
  image: w.image,
  assignedUsers: w.assignedUsers,
  isActive: w.isActive !== false,
  createdAt: w.createdAt,
  updatedAt: w.updatedAt,
  ...extra
});

// @desc    Create workshop
// @route   POST /api/admin/workshops/create
export const createWorkshop = async (req, res) => {
  try {
    const { title, description = '', isActive = true } = req.body;

    if (!title || !String(title).trim()) {
      return sendError(res, 'Workshop title is required', null, 400);
    }

    const image = req.file ? `/uploads/workshops/${req.file.filename}` : '';

    const workshop = await Workshop.create({
      title: String(title).trim(),
      description: description || '',
      image,
      assignedUsers: [],
      isActive: String(isActive) !== 'false' && isActive !== false,
      createdBy: req.admin._id
    });

    return sendSuccess(res, 'Workshop created successfully', { workshop: formatWorkshop(workshop) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List workshops
// @route   POST /api/admin/workshops/list
export const listWorkshops = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (search) {
      query.title = new RegExp(String(search).trim(), 'i');
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [workshops, total] = await Promise.all([
      Workshop.find(query)
        .populate('assignedUsers', 'name email profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Workshop.countDocuments(query)
    ]);

    const ids = workshops.map((w) => w._id);
    const counts = await Recording.aggregate([
      { $match: { workshopId: { $in: ids }, isDeleted: false } },
      { $group: { _id: '$workshopId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return sendSuccess(res, 'Workshops fetched successfully', {
      workshops: workshops.map((w) =>
        formatWorkshop(w, {
          videoCount: countMap.get(w._id.toString()) || 0,
          assignedCount: (w.assignedUsers || []).length
        })
      ),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get workshop
// @route   POST /api/admin/workshops/get
export const getWorkshop = async (req, res) => {
  try {
    const { workshopId } = req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);

    const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false }).populate(
      'assignedUsers',
      'name email profilePhoto'
    );
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);

    const videoCount = await Recording.countDocuments({ workshopId, isDeleted: false });

    return sendSuccess(res, 'Workshop fetched successfully', {
      workshop: formatWorkshop(workshop, {
        videoCount,
        assignedCount: (workshop.assignedUsers || []).length
      })
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update workshop
// @route   POST /api/admin/workshops/update
export const updateWorkshop = async (req, res) => {
  try {
    const { workshopId, title, description, isActive } = req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);

    const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);

    if (title !== undefined) workshop.title = String(title).trim();
    if (description !== undefined) workshop.description = description;
    if (isActive !== undefined) {
      workshop.isActive = String(isActive) !== 'false' && isActive !== false;
    }
    if (req.file) workshop.image = `/uploads/workshops/${req.file.filename}`;

    await workshop.save();
    await workshop.populate('assignedUsers', 'name email profilePhoto');

    return sendSuccess(res, 'Workshop updated successfully', { workshop: formatWorkshop(workshop) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Soft delete workshop
// @route   POST /api/admin/workshops/delete
export const deleteWorkshop = async (req, res) => {
  try {
    const { workshopId } = req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);

    const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);

    // Detach recordings — do not delete video data
    const detachResult = await Recording.updateMany(
      { workshopId, isDeleted: false },
      { $set: { workshopId: null } }
    );

    workshop.isDeleted = true;
    await workshop.save();

    return sendSuccess(res, 'Workshop deleted successfully. Attached recordings were kept and unassigned.', {
      detachedRecordings: detachResult.modifiedCount || 0
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Toggle workshop active status
// @route   POST /api/admin/workshops/toggle-status
export const toggleWorkshopStatus = async (req, res) => {
  try {
    const { workshopId, isActive } = req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);

    const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);

    if (isActive !== undefined) {
      workshop.isActive = String(isActive) !== 'false' && isActive !== false;
    } else {
      workshop.isActive = workshop.isActive === false;
    }
    await workshop.save();

    return sendSuccess(
      res,
      `Workshop ${workshop.isActive !== false ? 'activated' : 'deactivated'} successfully`,
      { workshop: formatWorkshop(workshop) }
    );
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Set workshop user access (multi-select replace/add/remove)
// @route   POST /api/admin/workshops/set-access
export const setWorkshopAccess = async (req, res) => {
  try {
    const { workshopId, assignedUsers = [], mode = 'replace' } = req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);

    const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);

    const users = Array.isArray(assignedUsers) ? assignedUsers : [];

    if (mode === 'add') {
      const current = new Set((workshop.assignedUsers || []).map((id) => id.toString()));
      users.forEach((id) => current.add(id.toString()));
      workshop.assignedUsers = [...current];
    } else if (mode === 'remove') {
      const removeSet = new Set(users.map((id) => id.toString()));
      workshop.assignedUsers = (workshop.assignedUsers || []).filter(
        (id) => !removeSet.has(id.toString())
      );
    } else {
      workshop.assignedUsers = users;
    }

    await workshop.save();
    await workshop.populate('assignedUsers', 'name email profilePhoto isActive');

    return sendSuccess(res, 'Workshop access updated successfully', {
      workshop: formatWorkshop(workshop, { assignedCount: (workshop.assignedUsers || []).length })
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Access matrix for workshop (all users + assigned flag)
// @route   POST /api/admin/workshops/access-matrix
export const getWorkshopAccessMatrix = async (req, res) => {
  try {
    const { workshopId } = req.body;
    if (!workshopId) return sendError(res, 'workshopId is required', null, 400);

    const workshop = await Workshop.findOne({ _id: workshopId, isDeleted: false });
    if (!workshop) return sendError(res, 'Workshop not found', null, 404);

    const users = await User.find({ isDeleted: false, isActive: true })
      .select('name email mobileNumber profilePhoto')
      .sort({ name: 1 });

    const assignedSet = new Set((workshop.assignedUsers || []).map((id) => id.toString()));

    const matrix = users.map((u) => ({
      id: u._id,
      name: u.name,
      username: u.name,
      email: u.email,
      mobileNumber: u.mobileNumber,
      profilePhoto: u.profilePhoto,
      isAllowed: assignedSet.has(u._id.toString()),
      canWatch: assignedSet.has(u._id.toString())
    }));

    return sendSuccess(res, 'Access matrix fetched', {
      workshop: { id: workshop._id, title: workshop.title },
      matrix
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
