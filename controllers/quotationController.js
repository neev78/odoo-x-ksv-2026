const Quotation = require('../models/Quotation');
const RFQ = require('../models/RFQ');
const Vendor = require('../models/Vendor');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity, notify } = require('../utils/logger');
const AppError = require('../utils/AppError');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

// @route GET /api/quotations
const getQuotations = asyncHandler(async (req, res) => {
  const { rfq, status, vendor } = req.query;
  const q = {};
  if (rfq) q.rfq = rfq;
  if (status) q.status = status;
  if (vendor) q.vendor = vendor;

  if (req.user.role === 'Vendor' && req.user.vendorRef) {
    q.vendor = req.user.vendorRef;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [quotations, total] = await Promise.all([
    Quotation.find(q)
      .populate('vendor', 'companyName vendorId rating performanceScore')
      .populate('rfq', 'rfqNumber title productName status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Quotation.countDocuments(q),
  ]);

  res.json(paginatedResponse(quotations, total, page, limit));
});

// @route GET /api/quotations/compare/:rfqId
// Returns all quotations for an RFQ with comparison highlights
const compareQuotations = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findById(req.params.rfqId).lean();
  if (!rfq) throw AppError.notFound('RFQ not found');

  const quotations = await Quotation.find({ rfq: req.params.rfqId })
    .populate('vendor', 'companyName vendorId rating performanceScore')
    .sort({ totalAmount: 1 })
    .lean();

  let best = { lowestPriceId: null, fastestId: null, topRatedId: null };
  if (quotations.length) {
    best.lowestPriceId = quotations.reduce((a, b) => (a.totalAmount <= b.totalAmount ? a : b))._id;
    best.fastestId = quotations.reduce((a, b) => (a.deliveryTimeline <= b.deliveryTimeline ? a : b))._id;
    best.topRatedId = quotations.reduce((a, b) =>
      ((a.vendor && a.vendor.rating) || 0) >= ((b.vendor && b.vendor.rating) || 0) ? a : b
    )._id;
  }

  res.json({ success: true, rfq, data: quotations, highlights: best });
});

// @route POST /api/quotations
const createQuotation = asyncHandler(async (req, res) => {
  let { rfq, vendor, pricePerUnit, quantity, taxPercent, deliveryTimeline, warranty, notes, status } = req.body;

  const rfqDoc = await RFQ.findById(rfq);
  if (!rfqDoc) throw AppError.notFound('RFQ not found');

  // Vendor users can only quote as themselves, using RFQ quantity
  if (req.user.role === 'Vendor') {
    if (!req.user.vendorRef) throw AppError.badRequest('Your account is not linked to a vendor profile');
    vendor = req.user.vendorRef;
  }
  if (!quantity) quantity = rfqDoc.quantity;

  const vendorDoc = await Vendor.findById(vendor);
  if (!vendorDoc) throw AppError.notFound('Vendor not found');

  // Check for duplicate quotation from same vendor on same RFQ
  const existingQuote = await Quotation.findOne({ rfq, vendor });
  if (existingQuote) throw AppError.conflict('This vendor has already submitted a quotation for this RFQ');

  const quotation = await Quotation.create({
    rfq, vendor, pricePerUnit, quantity,
    taxPercent: taxPercent !== undefined ? taxPercent : 18,
    deliveryTimeline, warranty, notes,
    status: status || 'Submitted',
    submittedBy: req.user._id,
  });

  // Move RFQ to Open when first quotation arrives
  if (rfqDoc.status === 'Sent' || rfqDoc.status === 'Draft') {
    rfqDoc.status = 'Open';
    await rfqDoc.save();
  }

  await logActivity({ user: req.user, action: 'Quotation Submitted', description: `${vendorDoc.companyName} submitted ${quotation.quotationNumber} for ${rfqDoc.rfqNumber}`, entityType: 'Quotation', entityId: quotation.quotationNumber });
  await notify({ roles: ['Procurement Officer', 'Manager', 'Admin'], title: 'Quotation Submitted', message: `${vendorDoc.companyName} quoted on ${rfqDoc.rfqNumber}`, type: 'Quotation Submitted' });

  const populated = await quotation.populate('vendor', 'companyName vendorId rating');
  res.status(201).json({ success: true, data: populated });
});

// @route PUT /api/quotations/:id
const updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw AppError.notFound('Quotation not found');

  const fields = ['pricePerUnit', 'quantity', 'taxPercent', 'deliveryTimeline', 'warranty', 'notes', 'status'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) quotation[f] = req.body[f];
  });
  await quotation.save();

  await logActivity({ user: req.user, action: 'Quotation Updated', description: `Updated ${quotation.quotationNumber} (${quotation.status})`, entityType: 'Quotation', entityId: quotation.quotationNumber });
  res.json({ success: true, data: quotation });
});

// @route DELETE /api/quotations/:id
const deleteQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findByIdAndDelete(req.params.id);
  if (!quotation) throw AppError.notFound('Quotation not found');
  await logActivity({ user: req.user, action: 'Quotation Deleted', description: `Deleted ${quotation.quotationNumber}`, entityType: 'Quotation', entityId: quotation.quotationNumber });
  res.json({ success: true, message: 'Quotation deleted' });
});

module.exports = { getQuotations, compareQuotations, createQuotation, updateQuotation, deleteQuotation };
