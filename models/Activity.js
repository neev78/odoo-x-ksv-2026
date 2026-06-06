const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: 'System' },
    action: { type: String, required: true }, // e.g. "RFQ Created"
    description: { type: String, default: '' },
    entityType: { type: String, default: '' }, // Vendor / RFQ / Quotation ...
    entityId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
