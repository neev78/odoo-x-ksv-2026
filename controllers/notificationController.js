const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');

const buildQuery = (user) => ({
  $or: [
    { recipient: user._id },
    { recipient: null, roles: { $size: 0 } },
    { recipient: null, roles: user.role },
  ],
});

// @route GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find(buildQuery(req.user))
    .sort({ createdAt: -1 }).limit(30).lean();
  const unread = notifications.filter((n) => !n.read).length;
  res.json({ success: true, unread, count: notifications.length, data: notifications });
});

// @route PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
});

// @route PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(buildQuery(req.user), { read: true });
  res.json({ success: true });
});

module.exports = { getNotifications, markRead, markAllRead };
