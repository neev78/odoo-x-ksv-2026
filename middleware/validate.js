const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Middleware: validate that req.params.id (or a custom param) is a valid MongoDB ObjectId.
 * Usage: router.get('/:id', validateObjectId(), getVendor)
 *
 * @param {string} [paramName='id']
 */
function validateObjectId(paramName = 'id') {
  return (req, _res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return next(AppError.badRequest(`Invalid ${paramName}: ${req.params[paramName]}`));
    }
    next();
  };
}

/**
 * Middleware: ensure required body fields are present and non-empty.
 * Usage: router.post('/', requireFields('name', 'email'), createUser)
 *
 * @param  {...string} fields
 */
function requireFields(...fields) {
  return (req, _res, next) => {
    const missing = fields.filter(
      (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
    );
    if (missing.length) {
      return next(
        AppError.badRequest(`Missing required field(s): ${missing.join(', ')}`)
      );
    }
    next();
  };
}

module.exports = { validateObjectId, requireFields };
