const mongoose = require('mongoose');
const Counter = require('./Counter');
const { VENDOR_CATEGORIES, VENDOR_STATUSES } = require('../utils/constants');

const vendorSchema = new mongoose.Schema(
  {
    vendorId: { type: String, unique: true, index: true },
    companyName: { type: String, required: [true, 'Company name is required'], trim: true },
    contactPerson: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true },
    status: {
      type: String,
      enum: VENDOR_STATUSES,
      default: 'Active',
    },
    rating: { type: Number, min: 0, max: 5, default: 3 },
    performanceScore: { type: Number, min: 0, max: 100, default: 70 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate vendorId like VND-0001
vendorSchema.pre('save', async function (next) {
  if (this.vendorId) return next();
  const seq = await Counter.next('vendor');
  this.vendorId = `VND-${String(seq).padStart(4, '0')}`;
  next();
});

vendorSchema.statics.CATEGORIES = VENDOR_CATEGORIES;

module.exports = mongoose.model('Vendor', vendorSchema);
