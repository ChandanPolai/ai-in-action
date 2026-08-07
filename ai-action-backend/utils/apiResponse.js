/**
 * Universal Response Helper for AI in Action API
 * Guarantees standard 3-key format: { status, message, data }
 */

export const sendResponse = (res, statusCode, status, message, data = null) => {
  return res.status(statusCode).json({
    status: Boolean(status),
    message: message || (status ? 'Success' : 'Error occurred'),
    data: data
  });
};

export const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
  return sendResponse(res, statusCode, true, message, data);
};

export const sendError = (res, message = 'An error occurred', data = null, statusCode = 400) => {
  return sendResponse(res, statusCode, false, message, data);
};

export default {
  sendResponse,
  sendSuccess,
  sendError
};
