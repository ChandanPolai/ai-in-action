import rateLimit from 'express-rate-limit';

const TOO_MANY =
  'You have requested too many times. Please wait a bit and try again.';

const AUTH_TOO_MANY =
  'You have tried too many times. Please wait 15 minutes and try again.';

const jsonHandler = (req, res, _next, options) => {
  const payload =
    typeof options.message === 'object' && options.message !== null
      ? options.message
      : { status: false, message: String(options.message || TOO_MANY) };

  res.status(options.statusCode).json({
    status: false,
    message: payload.message || TOO_MANY,
    code: 'RATE_LIMIT'
  });
};

/** General API — stop spam / abuse across the app */
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.API_RATE_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: TOO_MANY },
  handler: jsonHandler,
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    // Health checks + long video streams should not burn the quota
    return url.includes('/health') || /\/stream\//.test(url);
  }
});

/** Login / forgot / reset — stricter against brute force */
export const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_MAX) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: AUTH_TOO_MANY },
  handler: jsonHandler
});

export default {
  apiLimiter,
  authLimiter
};
