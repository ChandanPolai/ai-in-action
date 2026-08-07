import { Course } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

const calcTotals = (price, gstPercent) => {
  const p = Math.max(0, Number(price) || 0);
  const g = Math.max(0, Number(gstPercent) || 0);
  const gstAmount = Math.round(((p * g) / 100) * 100) / 100;
  const total = Math.round((p + gstAmount) * 100) / 100;
  return { price: p, gstPercent: g, gstAmount, total };
};

const formatCourse = (c) => ({
  id: c._id,
  title: c.title,
  details: c.details,
  price: c.price,
  gstPercent: c.gstPercent,
  gstAmount: c.gstAmount,
  total: c.total,
  image: c.image,
  isActive: c.isActive,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt
});

// @desc    Create course
// @route   POST /api/admin/courses/create
export const createCourse = async (req, res) => {
  try {
    const { title, details = '', price = 0, gstPercent = 18, isActive = true } = req.body;

    if (!title || !String(title).trim()) {
      return sendError(res, 'Course title is required', null, 400);
    }

    const totals = calcTotals(price, gstPercent);
    const image = req.file ? `/uploads/courses/${req.file.filename}` : '';

    const course = await Course.create({
      title: String(title).trim(),
      details: details || '',
      ...totals,
      image,
      isActive: String(isActive) !== 'false' && isActive !== false,
      createdBy: req.admin._id
    });

    return sendSuccess(res, 'Course created successfully', { course: formatCourse(course) }, 201);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    List courses
// @route   POST /api/admin/courses/list
export const listCourses = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.body;
    const query = { isDeleted: false };

    if (search) {
      query.title = new RegExp(String(search).trim(), 'i');
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [courses, total] = await Promise.all([
      Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Course.countDocuments(query)
    ]);

    return sendSuccess(res, 'Courses fetched successfully', {
      courses: courses.map(formatCourse),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Get course
// @route   POST /api/admin/courses/get
export const getCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return sendError(res, 'courseId is required', null, 400);

    const course = await Course.findOne({ _id: courseId, isDeleted: false });
    if (!course) return sendError(res, 'Course not found', null, 404);

    return sendSuccess(res, 'Course fetched successfully', { course: formatCourse(course) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Update course
// @route   POST /api/admin/courses/update
export const updateCourse = async (req, res) => {
  try {
    const { courseId, title, details, price, gstPercent, isActive } = req.body;
    if (!courseId) return sendError(res, 'courseId is required', null, 400);

    const course = await Course.findOne({ _id: courseId, isDeleted: false });
    if (!course) return sendError(res, 'Course not found', null, 404);

    if (title !== undefined) course.title = String(title).trim();
    if (details !== undefined) course.details = details;
    if (isActive !== undefined) {
      course.isActive = String(isActive) !== 'false' && isActive !== false;
    }

    const nextPrice = price !== undefined ? price : course.price;
    const nextGst = gstPercent !== undefined ? gstPercent : course.gstPercent;
    const totals = calcTotals(nextPrice, nextGst);
    course.price = totals.price;
    course.gstPercent = totals.gstPercent;
    course.gstAmount = totals.gstAmount;
    course.total = totals.total;

    if (req.file) {
      course.image = `/uploads/courses/${req.file.filename}`;
    }

    await course.save();
    return sendSuccess(res, 'Course updated successfully', { course: formatCourse(course) });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Delete course
// @route   POST /api/admin/courses/delete
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return sendError(res, 'courseId is required', null, 400);

    const course = await Course.findOne({ _id: courseId, isDeleted: false });
    if (!course) return sendError(res, 'Course not found', null, 404);

    course.isDeleted = true;
    await course.save();

    return sendSuccess(res, 'Course deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export default {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse
};
