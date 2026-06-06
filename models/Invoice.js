const mongoose = require('mongoose');
const Counter = require('./Counter');
const { INVOICE_STATUSES } = require('../utils/constants');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'Units' },
    pricePerUnit: { type: Number, required: true },
    taxPercent: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    subTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    dueDate: { type: Date },
    paymentStatus: { type: String, enum: INVOICE_STATUSES, default: 'Pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

invoiceSchema.pre('save', async function (next) {
  if (this.invoiceNumber) return next();
  const seq = await Counter.next('invoice');
  this.invoiceNumber = `INV-${String(seq).padStart(4, '0')}`;
  next();
});

invoiceSchema.statics.STATUS = INVOICE_STATUSES;

module.exports = mongoose.model('Invoice', invoiceSchema);
