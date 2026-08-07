import { Course } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const formatCourse = (c) => ({
  id: c._id,
  title: c.title,
  details: c.details,
  price: c.price,
  gstPercent: c.gstPercent,
  gstAmount: c.gstAmount,
  total: c.total,
  image: c.image
});

// @desc    List active courses for users
// @route   POST /api/user/courses/list
export const listCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isDeleted: false, isActive: true }).sort({ createdAt: -1 });

    return sendSuccess(res, 'Courses fetched successfully', {
      courses: courses.map(formatCourse)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get course detail
// @route   POST /api/user/courses/get
export const getCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return sendError(res, 'courseId is required', null, 400);

    const course = await Course.findOne({ _id: courseId, isDeleted: false, isActive: true });
    if (!course) return sendError(res, 'Course not found', null, 404);

    return sendSuccess(res, 'Course fetched successfully', { course: formatCourse(course) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default { listCourses, getCourse };
