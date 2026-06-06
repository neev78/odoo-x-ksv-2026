const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity } = require('../utils/logger');
const { sendEmail } = require('../utils/email');
const AppError = require('../utils/AppError');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  phone: user.phone,
  vendorRef: user.vendorRef,
});

// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  if (!name || !email || !password) {
    throw AppError.badRequest('Name, email and password are required');
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw AppError.badRequest('Passwords do not match');
  }
  if (password.length < 6) {
    throw AppError.badRequest('Password must be at least 6 characters');
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw AppError.conflict('An account with this email already exists');

  const requestedRole = User.ROLES.includes(role) ? role : 'Procurement Officer';
  const user = await User.create({ name, email, password, role: requestedRole });

  await logActivity({ user, action: 'User Registered', description: `${user.name} registered as ${user.role}`, entityType: 'User', entityId: user._id });

  res.status(201).json({ success: true, token: signToken(user), user: sanitize(user) });
});

// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw AppError.badRequest('Please provide email and password');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw AppError.unauthorized('Invalid email or password');
  }
  if (user.status !== 'Active') {
    throw AppError.forbidden('Your account is inactive. Contact admin.');
  }

  await logActivity({ user, action: 'User Login', description: `${user.name} logged in`, entityType: 'User', entityId: user._id });

  res.json({ success: true, token: signToken(user), user: sanitize(user) });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
});

// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'VENDOR BRIDGE - Password Reset',
    text: `You requested a password reset. Use this link (valid 1 hour): ${resetUrl}`,
    html: `<p>You requested a password reset for VENDOR BRIDGE.</p><p><a href="${resetUrl}">Click here to reset your password</a> (valid for 1 hour).</p>`,
  });

  res.json({
    success: true,
    message: 'Password reset link sent to your email.',
    devResetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
  });
});

// @route POST /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  if (!password || password.length < 6) throw AppError.badRequest('Password must be at least 6 characters');
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw AppError.badRequest('Passwords do not match');
  }

  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) throw AppError.badRequest('Invalid or expired reset token');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  await logActivity({ user, action: 'Password Reset', description: `${user.name} reset their password` });

  res.json({ success: true, message: 'Password reset successful.', token: signToken(user), user: sanitize(user) });
});

module.exports = { register, login, getMe, forgotPassword, resetPassword };
