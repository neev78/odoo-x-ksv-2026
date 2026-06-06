const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity } = require('../utils/logger');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

// @route GET /api/users  (Admin)
const getUsers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const q = {};
  if (role) q.role = role;
  if (search) {
    const safe = escapeRegex(search);
    q.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ];
  }
  const { page, limit, skip } = parsePagination(req.query);
  const [users, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(q),
  ]);
  res.json(paginatedResponse(users, total, page, limit));
});

// @route POST /api/users  (Admin)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email) throw AppError.badRequest('Name and email are required');
  const exists = await User.findOne({ email: (email || '').toLowerCase() });
  if (exists) throw AppError.conflict('Email already in use');

  const user = await User.create({ name, email, password: password || 'password123', role, phone });
  await logActivity({ user: req.user, action: 'User Created', description: `Created user ${user.name} (${user.role})`, entityType: 'User', entityId: user._id });
  res.status(201).json({ success: true, data: user });
});

// @route PUT /api/users/:id  (Admin)
const updateUser = asyncHandler(async (req, res) => {
  const { name, role, status, phone } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  await logActivity({ user: req.user, action: 'User Updated', description: `Updated user ${user.name}`, entityType: 'User', entityId: user._id });
  res.json({ success: true, data: user });
});

// @route DELETE /api/users/:id  (Admin)
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    throw AppError.badRequest('You cannot delete your own account');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw AppError.notFound('User not found');
  await logActivity({ user: req.user, action: 'User Deleted', description: `Deleted user ${user.name}`, entityType: 'User' });
  res.json({ success: true, message: 'User deleted' });
});

module.exports = { getUsers, createUser, updateUser, deleteUser };
