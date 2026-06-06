const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

/**
 * Record an activity-log entry. Never throws (logging must not break flow).
 */
async function logActivity({ user, action, description = '', entityType = '', entityId = '' }) {
  try {
    await Activity.create({
      user: user ? user._id : null,
      userName: user ? user.name : 'System',
      action,
      description,
      entityType,
      entityId,
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
}

/**
 * Create a notification (broadcast by role, or to a specific recipient).
 */
async function notify({ recipient = null, roles = [], title, message = '', type = 'General' }) {
  try {
    await Notification.create({ recipient, roles, title, message, type });
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
}

module.exports = { logActivity, notify };
