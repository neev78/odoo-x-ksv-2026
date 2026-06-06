/**
 * Simple in-memory rate limiter (no external dependency).
 * Good enough for single-instance deployments and hackathon demos.
 * For production with multiple instances, swap to express-rate-limit + Redis store.
 */

const buckets = new Map();

/**
 * Create a rate-limiting middleware.
 * @param {object} opts
 * @param {number} opts.windowMs   Time window in milliseconds (default 15 min)
 * @param {number} opts.max        Max requests per window (default 100)
 * @param {string} [opts.message]  Custom error message
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, message } = {}) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!buckets.has(key)) {
      buckets.set(key, { count: 1, start: now });
      return next();
    }

    const bucket = buckets.get(key);
    if (now - bucket.start > windowMs) {
      // Window expired → reset
      bucket.count = 1;
      bucket.start = now;
      return next();
    }

    bucket.count++;
    if (bucket.count > max) {
      res.set('Retry-After', Math.ceil((bucket.start + windowMs - now) / 1000));
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.',
      });
    }

    next();
  };
}

// Periodically clean up expired buckets to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > 30 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = rateLimit;
