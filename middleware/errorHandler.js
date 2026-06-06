/* eslint-disable no-unused-vars */
const AppError = require('../utils/AppError');

// 404 handler for unknown API routes
const notFound = (req, res, next) => {
  next(AppError.notFound(`Route not found: ${req.originalUrl}`));
};

// Central error handler
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no explicit status was set
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose bad ObjectId / CastError
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field '${err.path}'`;
  }

  // Mongoose validation error → merge all field messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // MongoDB duplicate key (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for '${field}'. It already exists.`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // Log in non-production
  if (process.env.NODE_ENV !== 'production') {
    console.error('⚠️  Error:', err.message);
    if (!err.isOperational) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Include stack trace in development only
    ...(process.env.NODE_ENV !== 'production' && !err.isOperational && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
