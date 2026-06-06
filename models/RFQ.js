const mongoose = require('mongoose');
const Counter = require('./Counter');
const { RFQ_STATUSES, VENDOR_CATEGORIES } = require('../utils/constants');

const rfqSchema = new mongoose.Schema(
  {
    rfqNumber: { type: String, unique: true, index: true },
    title: { type: String, required: [true, 'RFQ title is required'], trim: true },
    description: { type: String, default: '' },
    productName: { type: String, required: true },
    productCategory: {
      type: String,
      enum: VENDOR_CATEGORIES,
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'Units' },
    specifications: { type: String, default: '' },
    attachment: { type: String, default: '' },
    deadline: { type: Date, required: true },
    assignedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    status: { type: String, enum: RFQ_STATUSES, default: 'Draft' },
    approval: {
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      remarks: { type: String, default: '' },
      decidedAt: { type: Date, default: null },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

rfqSchema.pre('save', async function (next) {
  if (this.rfqNumber) return next();
  const seq = await Counter.next('rfq');
  this.rfqNumber = `RFQ-${String(seq).padStart(4, '0')}`;
  next();
});

rfqSchema.statics.STATUS = RFQ_STATUSES;

module.exports = mongoose.model('RFQ', rfqSchema);
