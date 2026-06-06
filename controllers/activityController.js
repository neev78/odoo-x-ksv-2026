const Activity = require('../models/Activity');
const asyncHandler = require('../middleware/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

// @route GET /api/activities
const getActivities = asyncHandler(async (req, res) => {
  const { action } = req.query;
  const q = {};
  if (action) q.action = { $regex: escapeRegex(action), $options: 'i' };

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [activities, total] = await Promise.all([
    Activity.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Activity.countDocuments(q),
  ]);
  res.json(paginatedResponse(activities, total, page, limit));
});

module.exports = { getActivities };
