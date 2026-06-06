const RFQ = require('../models/RFQ');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity, notify } = require('../utils/logger');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

// @route GET /api/rfqs
const getRFQs = asyncHandler(async (req, res) => {
  const { search, status, category } = req.query;
  const q = {};
  if (status) q.status = status;
  if (category) q.productCategory = category;
  if (search) {
    const safe = escapeRegex(search);
    q.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { rfqNumber: { $regex: safe, $options: 'i' } },
      { productName: { $regex: safe, $options: 'i' } },
    ];
  }

  // Vendor users only see RFQs assigned to them
  if (req.user.role === 'Vendor' && req.user.vendorRef) {
    q.assignedVendors = req.user.vendorRef;
    q.status = q.status || { $in: ['Sent', 'Open', 'Closed', 'Approved'] };
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [rfqs, total] = await Promise.all([
    RFQ.find(q)
      .populate('assignedVendors', 'companyName vendorId rating')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RFQ.countDocuments(q),
  ]);

  res.json(paginatedResponse(rfqs, total, page, limit));
});

// @route GET /api/rfqs/:id
const getRFQ = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findById(req.params.id)
    .populate('assignedVendors', 'companyName vendorId email rating')
    .populate('createdBy', 'name')
    .populate('approval.decidedBy', 'name')
    .lean();
  if (!rfq) throw AppError.notFound('RFQ not found');
  res.json({ success: true, data: rfq });
});

async function sendRfqEmails(rfqDoc) {
  try {
    const { sendEmail } = require('../utils/email');
    const { rfqAssignmentTemplate } = require('../utils/emailTemplates');
    const rfq = await RFQ.findById(rfqDoc._id).populate('assignedVendors');
    if (!rfq || !rfq.assignedVendors || rfq.assignedVendors.length === 0) return;
    
    for (const vendor of rfq.assignedVendors) {
      if (vendor.email) {
        const html = rfqAssignmentTemplate(vendor.companyName, rfq.rfqNumber, rfq.title, rfq.deadline);
        await sendEmail({
          to: vendor.email,
          subject: `New Request for Quotation: ${rfq.rfqNumber}`,
          html: html
        });
      }
    }
  } catch (err) {
    console.error('Failed to send RFQ emails:', err);
  }
}

// @route POST /api/rfqs
const createRFQ = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user._id };
  const rfq = await RFQ.create(payload);

  await logActivity({ user: req.user, action: 'RFQ Created', description: `Created RFQ ${rfq.rfqNumber} - ${rfq.title}`, entityType: 'RFQ', entityId: rfq.rfqNumber });
  if (rfq.status === 'Sent' || rfq.status === 'Open') {
    await notify({ roles: ['Vendor'], title: 'New RFQ Available', message: `${rfq.rfqNumber}: ${rfq.title}`, type: 'New RFQ' });
    sendRfqEmails(rfq); // Async email send
  }
  res.status(201).json({ success: true, data: rfq });
});

// @route PUT /api/rfqs/:id
const updateRFQ = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findById(req.params.id);
  if (!rfq) throw AppError.notFound('RFQ not found');

  const fields = ['title', 'description', 'productName', 'productCategory', 'quantity', 'unit', 'specifications', 'attachment', 'deadline', 'assignedVendors', 'status'];
  const prevStatus = rfq.status;
  fields.forEach((f) => {
    if (req.body[f] !== undefined) rfq[f] = req.body[f];
  });
  await rfq.save();

  await logActivity({ user: req.user, action: 'RFQ Updated', description: `Updated RFQ ${rfq.rfqNumber}`, entityType: 'RFQ', entityId: rfq.rfqNumber });
  if (prevStatus === 'Draft' && (rfq.status === 'Sent' || rfq.status === 'Open')) {
    await notify({ roles: ['Vendor'], title: 'New RFQ Available', message: `${rfq.rfqNumber}: ${rfq.title}`, type: 'New RFQ' });
    sendRfqEmails(rfq); // Async email send
  }
  res.json({ success: true, data: rfq });
});

// @route DELETE /api/rfqs/:id
const deleteRFQ = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findByIdAndDelete(req.params.id);
  if (!rfq) throw AppError.notFound('RFQ not found');
  await logActivity({ user: req.user, action: 'RFQ Deleted', description: `Deleted RFQ ${rfq.rfqNumber}`, entityType: 'RFQ', entityId: rfq.rfqNumber });
  res.json({ success: true, message: 'RFQ deleted' });
});

module.exports = { getRFQs, getRFQ, createRFQ, updateRFQ, deleteRFQ };
