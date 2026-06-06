/**
 * Custom application error class.
 * Throw these in controllers / middleware and the central errorHandler
 * will format the response automatically.
 */
class AppError extends Error {
  /**
   * @param {string} message  Human-readable error message
   * @param {number} statusCode  HTTP status code (default 500)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes expected errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }

  // Convenience factory methods
  static badRequest(msg = 'Bad request')       { return new AppError(msg, 400); }
  static unauthorized(msg = 'Unauthorized')    { return new AppError(msg, 401); }
  static forbidden(msg = 'Forbidden')          { return new AppError(msg, 403); }
  static notFound(msg = 'Resource not found')  { return new AppError(msg, 404); }
  static conflict(msg = 'Conflict')            { return new AppError(msg, 409); }
}

module.exports = AppError;
