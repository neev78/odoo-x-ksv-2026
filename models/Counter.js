const mongoose = require('mongoose');

/**
 * Simple atomic sequence counter used to generate human-readable
 * IDs (VND-0001, RFQ-0001, PO-0001, INV-0001, QT-0001).
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function (name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
