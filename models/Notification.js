const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // null recipient => broadcast to all staff
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    roles: [{ type: String }], // target roles for broadcast
    title: { type: String, required: true },
    message: { type: String, default: '' },
    type: {
      type: String,
      enum: [
        'New RFQ',
        'Quotation Submitted',
        'Approval Pending',
        'Approval Completed',
        'Invoice Generated',
        'General',
      ],
      default: 'General',
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
