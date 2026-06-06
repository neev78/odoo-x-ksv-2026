/**
 * Wraps async controllers so thrown errors flow to the error handler
 * without try/catch boilerplate everywhere.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
