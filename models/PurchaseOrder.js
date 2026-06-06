const mongoose = require('mongoose');
const Counter = require('./Counter');
const { PO_STATUSES } = require('../utils/constants');

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true, index: true },
    rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'Units' },
    pricePerUnit: { type: Number, required: true },
    taxPercent: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    subTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: PO_STATUSES, default: 'Issued' },
    invoiced: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre('save', async function (next) {
  if (this.poNumber) return next();
  const seq = await Counter.next('po');
  this.poNumber = `PO-${String(seq).padStart(4, '0')}`;
  next();
});

purchaseOrderSchema.statics.STATUS = PO_STATUSES;

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
