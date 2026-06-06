const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity, notify } = require('../utils/logger');
const { generateDocument } = require('../utils/pdfGenerator');
const { sendEmail } = require('../utils/email');
const { PassThrough } = require('stream');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

// @route GET /api/invoices
const getInvoices = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const q = {};
  if (status) q.paymentStatus = status;
  if (search) q.invoiceNumber = { $regex: escapeRegex(search), $options: 'i' };
  if (req.user.role === 'Vendor' && req.user.vendorRef) q.vendor = req.user.vendorRef;

  const { page, limit, skip } = parsePagination(req.query);
  const [invoices, total] = await Promise.all([
    Invoice.find(q)
      .populate('vendor', 'companyName vendorId gstNumber email phone address')
      .populate('purchaseOrder', 'poNumber')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Invoice.countDocuments(q),
  ]);
  res.json(paginatedResponse(invoices, total, page, limit));
});

// @route GET /api/invoices/:id
const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('vendor', 'companyName vendorId gstNumber email phone address')
    .populate('purchaseOrder', 'poNumber').lean();
  if (!invoice) throw AppError.notFound('Invoice not found');
  res.json({ success: true, data: invoice });
});

// @route POST /api/invoices
const generateInvoice = asyncHandler(async (req, res) => {
  const { purchaseOrderId } = req.body;
  if (!purchaseOrderId) throw AppError.badRequest('purchaseOrderId is required');
  const po = await PurchaseOrder.findById(purchaseOrderId).populate('vendor');
  if (!po) throw AppError.notFound('Purchase Order not found');
  const existing = await Invoice.findOne({ purchaseOrder: po._id });
  if (existing) throw AppError.conflict('An invoice already exists for this PO');

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await Invoice.create({
    purchaseOrder: po._id, vendor: po.vendor._id,
    productName: po.productName, quantity: po.quantity, unit: po.unit,
    pricePerUnit: po.pricePerUnit, taxPercent: po.taxPercent,
    taxAmount: po.taxAmount, subTotal: po.subTotal,
    totalAmount: po.totalAmount, dueDate, createdBy: req.user._id,
  });

  po.invoiced = true;
  po.status = 'Completed';
  await po.save();

  await logActivity({ user: req.user, action: 'Invoice Generated', description: `Generated ${invoice.invoiceNumber} from ${po.poNumber}`, entityType: 'Invoice', entityId: invoice.invoiceNumber });
  await notify({ roles: ['Admin', 'Manager'], title: 'Invoice Generated', message: `${invoice.invoiceNumber} created`, type: 'Invoice Generated' });

  const populated = await invoice.populate('vendor', 'companyName vendorId');
  res.status(201).json({ success: true, data: populated });
});

// @route PUT /api/invoices/:id
const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  if (req.body.paymentStatus) invoice.paymentStatus = req.body.paymentStatus;
  if (req.body.dueDate) invoice.dueDate = req.body.dueDate;
  await invoice.save();
  await logActivity({ user: req.user, action: 'Invoice Updated', description: `${invoice.invoiceNumber} -> ${invoice.paymentStatus}`, entityType: 'Invoice', entityId: invoice.invoiceNumber });
  res.json({ success: true, data: invoice });
});

// @route GET /api/invoices/:id/pdf
const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('vendor');
  if (!invoice) throw AppError.notFound('Invoice not found');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
  await generateDocument('INVOICE', invoice, res);
});

// @route POST /api/invoices/:id/email
const emailInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('vendor');
  if (!invoice) throw AppError.notFound('Invoice not found');
  const to = req.body.to || (invoice.vendor && invoice.vendor.email);
  if (!to) throw AppError.badRequest('No recipient email available');

  const buffer = await new Promise(async (resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    try {
      await generateDocument('INVOICE', invoice, stream);
    } catch(err) {
      reject(err);
    }
  });

  const result = await sendEmail({
    to,
    subject: `Invoice ${invoice.invoiceNumber} - VENDOR BRIDGE`,
    text: `Please find attached invoice ${invoice.invoiceNumber} for Rs.${invoice.totalAmount}.`,
    html: `<p>Dear ${invoice.vendor.companyName},</p><p>Please find attached invoice <b>${invoice.invoiceNumber}</b> for <b>Rs.${invoice.totalAmount.toLocaleString('en-IN')}</b>.</p><p>Regards,<br/>VENDOR BRIDGE</p>`,
    attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: buffer }],
  });

  await logActivity({ user: req.user, action: 'Invoice Emailed', description: `Emailed ${invoice.invoiceNumber} to ${to}`, entityType: 'Invoice', entityId: invoice.invoiceNumber });

  res.json({
    success: true,
    message: result.simulated
      ? `Email simulated (SMTP not configured). Would send to ${to}.`
      : `Invoice emailed to ${to}.`,
  });
});

module.exports = { getInvoices, getInvoice, generateInvoice, updateInvoice, downloadInvoicePdf, emailInvoice };
