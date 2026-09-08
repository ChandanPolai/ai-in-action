import { Bonus, User } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatBonus = (b, extra = {}) => ({
  id: b._id,
  title: b.title,
  description: b.description,
  amount: Number(b.amount || 0),
  image: b.image,
  assignedUsers: b.assignedUsers,
  isActive: b.isActive !== false,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
  ...extra
});

// @desc    Create bonus
// @route   POST /api/admin/bonuses/create
export const createBonus = async (req, res) => {
  try {
    const { title, description = '', amount = 0, isActive = true } = req.body;

    if (!title || !String(title).trim()) {
      return sendError(res, 'Bonus title is required', null, 400);
    }

    const image = req.file ? `/uploads/bonuses/${req.file.filename}` : '';

    const bonus = await Bonus.create({
      title: String(title).trim(),
      description: description || '',
      amount: Math.max(0, Number(amount) || 0),
      image,
      assignedUsers: [],
      isActive: String(isActive) !== 'false' && isActive !== false,
      createdBy: req.admin._id
    });

    return sendSuccess(res, 'Bonus created successfully', { bonus: formatBonus(bonus) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List bonuses
// @route   POST /api/admin/bonuses/list
export const listBonuses = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (search) {
      query.title = new RegExp(String(search).trim(), 'i');
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [bonuses, total] = await Promise.all([
      Bonus.find(query)
        .populate('assignedUsers', 'name email profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Bonus.countDocuments(query)
    ]);

    return sendSuccess(res, 'Bonuses fetched successfully', {
      bonuses: bonuses.map((b) =>
        formatBonus(b, {
          assignedCount: (b.assignedUsers || []).length
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

// @desc    Get bonus
// @route   POST /api/admin/bonuses/get
export const getBonus = async (req, res) => {
  try {
    const { bonusId } = req.body;
    if (!bonusId) return sendError(res, 'bonusId is required', null, 400);

    const bonus = await Bonus.findOne({ _id: bonusId, isDeleted: false }).populate(
      'assignedUsers',
      'name email profilePhoto'
    );
    if (!bonus) return sendError(res, 'Bonus not found', null, 404);

    return sendSuccess(res, 'Bonus fetched successfully', {
      bonus: formatBonus(bonus, {
        assignedCount: (bonus.assignedUsers || []).length
      })
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update bonus
// @route   POST /api/admin/bonuses/update
export const updateBonus = async (req, res) => {
  try {
    const { bonusId, title, description, amount, isActive } = req.body;
    if (!bonusId) return sendError(res, 'bonusId is required', null, 400);

    const bonus = await Bonus.findOne({ _id: bonusId, isDeleted: false });
    if (!bonus) return sendError(res, 'Bonus not found', null, 404);

    if (title !== undefined) bonus.title = String(title).trim();
    if (description !== undefined) bonus.description = description;
    if (amount !== undefined) bonus.amount = Math.max(0, Number(amount) || 0);
    if (isActive !== undefined) {
      bonus.isActive = String(isActive) !== 'false' && isActive !== false;
    }
    if (req.file) bonus.image = `/uploads/bonuses/${req.file.filename}`;

    await bonus.save();
    await bonus.populate('assignedUsers', 'name email profilePhoto');

    return sendSuccess(res, 'Bonus updated successfully', { bonus: formatBonus(bonus) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Soft delete bonus
// @route   POST /api/admin/bonuses/delete
export const deleteBonus = async (req, res) => {
  try {
    const { bonusId } = req.body;
    if (!bonusId) return sendError(res, 'bonusId is required', null, 400);

    const bonus = await Bonus.findOne({ _id: bonusId, isDeleted: false });
    if (!bonus) return sendError(res, 'Bonus not found', null, 404);

    bonus.isDeleted = true;
    await bonus.save();

    return sendSuccess(res, 'Bonus deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Toggle bonus active status
// @route   POST /api/admin/bonuses/toggle-status
export const toggleBonusStatus = async (req, res) => {
  try {
    const { bonusId, isActive } = req.body;
    if (!bonusId) return sendError(res, 'bonusId is required', null, 400);

    const bonus = await Bonus.findOne({ _id: bonusId, isDeleted: false });
    if (!bonus) return sendError(res, 'Bonus not found', null, 404);

    if (isActive !== undefined) {
      bonus.isActive = String(isActive) !== 'false' && isActive !== false;
    } else {
      bonus.isActive = bonus.isActive === false;
    }
    await bonus.save();

    return sendSuccess(
      res,
      `Bonus ${bonus.isActive !== false ? 'activated' : 'deactivated'} successfully`,
      { bonus: formatBonus(bonus) }
    );
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Set bonus user access (multi-select replace/add/remove)
// @route   POST /api/admin/bonuses/set-access
export const setBonusAccess = async (req, res) => {
  try {
    const { bonusId, assignedUsers = [], mode = 'replace' } = req.body;
    if (!bonusId) return sendError(res, 'bonusId is required', null, 400);

    const bonus = await Bonus.findOne({ _id: bonusId, isDeleted: false });
    if (!bonus) return sendError(res, 'Bonus not found', null, 404);

    const users = Array.isArray(assignedUsers) ? assignedUsers : [];

    if (mode === 'add') {
      const current = new Set((bonus.assignedUsers || []).map((id) => id.toString()));
      users.forEach((id) => current.add(id.toString()));
      bonus.assignedUsers = [...current];
    } else if (mode === 'remove') {
      const removeSet = new Set(users.map((id) => id.toString()));
      bonus.assignedUsers = (bonus.assignedUsers || []).filter(
        (id) => !removeSet.has(id.toString())
      );
    } else {
      bonus.assignedUsers = users;
    }

    await bonus.save();
    await bonus.populate('assignedUsers', 'name email profilePhoto isActive');

    return sendSuccess(res, 'Bonus access updated successfully', {
      bonus: formatBonus(bonus, { assignedCount: (bonus.assignedUsers || []).length })
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Access matrix for bonus (all users + assigned flag)
// @route   POST /api/admin/bonuses/access-matrix
export const getBonusAccessMatrix = async (req, res) => {
  try {
    const { bonusId } = req.body;
    if (!bonusId) return sendError(res, 'bonusId is required', null, 400);

    const bonus = await Bonus.findOne({ _id: bonusId, isDeleted: false });
    if (!bonus) return sendError(res, 'Bonus not found', null, 404);

    const users = await User.find({ isDeleted: false, isActive: true })
      .select('name email mobileNumber profilePhoto')
      .sort({ name: 1 });

    const assignedSet = new Set((bonus.assignedUsers || []).map((id) => id.toString()));

    const matrix = users.map((u) => ({
      id: u._id,
      name: u.name,
      username: u.name,
      email: u.email,
      mobileNumber: u.mobileNumber,
      profilePhoto: u.profilePhoto,
      isAllowed: assignedSet.has(u._id.toString())
    }));

    return sendSuccess(res, 'Access matrix fetched', {
      bonus: { id: bonus._id, title: bonus.title },
      matrix
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
