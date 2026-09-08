import { Bonus } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

// @desc    List bonuses assigned to the logged-in user
// @route   POST /api/user/bonuses/list
export const listMyBonuses = async (req, res) => {
  try {
    const userId = req.user._id;

    const bonuses = await Bonus.find({
      isDeleted: false,
      isActive: { $ne: false },
      assignedUsers: userId
    })
      .select('title description amount image createdAt')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Bonuses fetched successfully', {
      bonuses: bonuses.map((b) => ({
        id: b._id,
        title: b.title,
        description: b.description,
        amount: Number(b.amount || 0),
        image: b.image,
        createdAt: b.createdAt
      }))
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
