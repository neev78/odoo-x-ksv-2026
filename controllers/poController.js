const PurchaseOrder = require('../models/PurchaseOrder');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity, notify } = require('../utils/logger');
const { generateDocument } = require('../utils/pdfGenerator');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

const getPurchaseOrders = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const q = {};
  if (status) q.status = status;
  if (search) q.poNumber = { $regex: escapeRegex(search), $options: 'i' };
  if (req.user.role === 'Vendor' && req.user.vendorRef) q.vendor = req.user.vendorRef;

  const { page, limit, skip } = parsePagination(req.query);
  const [pos, total] = await Promise.all([
    PurchaseOrder.find(q)
      .populate('vendor', 'companyName vendorId gstNumber email phone address')
      .populate('rfq', 'rfqNumber title')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PurchaseOrder.countDocuments(q),
  ]);
  res.json(paginatedResponse(pos, total, page, limit));
});

const getPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id)
    .populate('vendor', 'companyName vendorId gstNumber email phone address')
    .populate('rfq', 'rfqNumber title').lean();
  if (!po) throw AppError.notFound('Purchase Order not found');
  res.json({ success: true, data: po });
});

const generatePO = asyncHandler(async (req, res) => {
  const { quotationId } = req.body;
  if (!quotationId) throw AppError.badRequest('quotationId is required');
  const quotation = await Quotation.findById(quotationId).populate('rfq vendor');
  if (!quotation) throw AppError.notFound('Quotation not found');
  const rfq = quotation.rfq;
  if (!rfq || rfq.status !== 'Approved') throw AppError.badRequest('PO can only be generated from an approved RFQ');
  const existing = await PurchaseOrder.findOne({ quotation: quotation._id });
  if (existing) throw AppError.conflict('A PO already exists for this quotation');

  const subTotal = quotation.pricePerUnit * quotation.quantity;
  const po = await PurchaseOrder.create({
    rfq: rfq._id, quotation: quotation._id, vendor: quotation.vendor._id,
    productName: rfq.productName, quantity: quotation.quantity, unit: rfq.unit,
    pricePerUnit: quotation.pricePerUnit, taxPercent: quotation.taxPercent,
    taxAmount: quotation.taxAmount, subTotal, totalAmount: quotation.totalAmount,
    createdBy: req.user._id,
  });
  rfq.status = 'Closed';
  await rfq.save();

  await logActivity({ user: req.user, action: 'PO Generated', description: `Generated ${po.poNumber}`, entityType: 'PurchaseOrder', entityId: po.poNumber });
  await notify({ roles: ['Vendor', 'Admin'], title: 'Purchase Order Issued', message: `${po.poNumber} issued`, type: 'General' });
  
  const populated = await PurchaseOrder.findById(po._id).populate('vendor', 'companyName vendorId gstNumber email phone address').populate('rfq');

  // Send Email with PDF attachment
  try {
    const { sendEmail } = require('../utils/email');
    const { poIssuedTemplate } = require('../utils/emailTemplates');
    
    // Generate PDF buffer
    const chunks = [];
    const stream = require('stream').PassThrough();
    const pdfPromise = new Promise(async (resolve, reject) => {
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      try {
        await generateDocument('PO', populated, stream);
      } catch (err) {
        reject(err);
      }
    });
    const pdfBuffer = await pdfPromise;

    const html = poIssuedTemplate(populated.vendor.companyName, populated.poNumber, populated.totalAmount);
    await sendEmail({
      to: populated.vendor.email,
      subject: `Purchase Order Issued: ${populated.poNumber}`,
      html: html,
      attachments: [{ filename: `${populated.poNumber}.pdf`, content: pdfBuffer }]
    });
  } catch (err) {
    console.error('Failed to send PO email:', err);
  }

  res.status(201).json({ success: true, data: populated });
});

const updatePO = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw AppError.notFound('Purchase Order not found');
  if (req.body.status) po.status = req.body.status;
  await po.save();
  await logActivity({ user: req.user, action: 'PO Updated', description: `${po.poNumber} -> ${po.status}`, entityType: 'PurchaseOrder', entityId: po.poNumber });
  res.json({ success: true, data: po });
});

const downloadPOPdf = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id).populate('vendor');
  if (!po) throw AppError.notFound('Purchase Order not found');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${po.poNumber}.pdf"`);
  await generateDocument('PO', po, res);
});

module.exports = { getPurchaseOrders, getPurchaseOrder, generatePO, updatePO, downloadPOPdf };
