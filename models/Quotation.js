const mongoose = require('mongoose');
const Counter = require('./Counter');
const { QUOTATION_STATUSES } = require('../utils/constants');

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, unique: true, index: true },
    rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    pricePerUnit: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    taxPercent: { type: Number, default: 18 }, // GST %
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    deliveryTimeline: { type: Number, required: true }, // in days
    warranty: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: QUOTATION_STATUSES, default: 'Submitted' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Compute tax + total before save
quotationSchema.pre('validate', function (next) {
  const base = (this.pricePerUnit || 0) * (this.quantity || 0);
  this.taxAmount = +((base * (this.taxPercent || 0)) / 100).toFixed(2);
  this.totalAmount = +(base + this.taxAmount).toFixed(2);
  next();
});

quotationSchema.pre('save', async function (next) {
  if (this.quotationNumber) return next();
  const seq = await Counter.next('quotation');
  this.quotationNumber = `QT-${String(seq).padStart(4, '0')}`;
  next();
});

quotationSchema.statics.STATUS = QUOTATION_STATUSES;

module.exports = mongoose.model('Quotation', quotationSchema);
