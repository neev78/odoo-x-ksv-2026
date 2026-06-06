const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity, notify } = require('../utils/logger');
const AppError = require('../utils/AppError');

// @route GET /api/approvals/queue
// RFQs that are awaiting a manager decision (have quotations, not yet decided)
const getApprovalQueue = asyncHandler(async (req, res) => {
  const rfqs = await RFQ.find({ status: { $in: ['Open', 'Closed', 'Sent'] } })
    .populate('createdBy', 'name')
    .sort({ deadline: 1 })
    .lean();

  // attach quotation count
  const withCounts = await Promise.all(
    rfqs.map(async (rfq) => {
      const count = await Quotation.countDocuments({ rfq: rfq._id });
      return { ...rfq, quotationCount: count };
    })
  );
  res.json({ success: true, count: withCounts.length, data: withCounts });
});

// @route GET /api/approvals/history
const getApprovalHistory = asyncHandler(async (req, res) => {
  const rfqs = await RFQ.find({ status: { $in: ['Approved', 'Rejected'] } })
    .populate('approval.decidedBy', 'name')
    .populate('createdBy', 'name')
    .sort({ 'approval.decidedAt': -1 })
    .lean();
  res.json({ success: true, count: rfqs.length, data: rfqs });
});

// @route POST /api/approvals/:rfqId/approve
// body: { remarks, acceptedQuotation }
const approveRFQ = asyncHandler(async (req, res) => {
  const { remarks = '', acceptedQuotation } = req.body;
  const rfq = await RFQ.findById(req.params.rfqId);
  if (!rfq) throw AppError.notFound('RFQ not found');

  if (rfq.status === 'Approved' || rfq.status === 'Rejected') {
    throw AppError.badRequest(`RFQ has already been ${rfq.status.toLowerCase()}`);
  }

  rfq.status = 'Approved';
  rfq.approval = { decidedBy: req.user._id, remarks, decidedAt: new Date() };
  await rfq.save();

  // Accept the winning quotation, reject the rest
  if (acceptedQuotation) {
    await Quotation.findByIdAndUpdate(acceptedQuotation, { status: 'Accepted' });
    await Quotation.updateMany(
      { rfq: rfq._id, _id: { $ne: acceptedQuotation } },
      { status: 'Rejected' }
    );
  }

  await logActivity({ user: req.user, action: 'Approval Completed', description: `Approved RFQ ${rfq.rfqNumber}`, entityType: 'RFQ', entityId: rfq.rfqNumber });
  await notify({ roles: ['Procurement Officer', 'Admin'], title: 'RFQ Approved', message: `${rfq.rfqNumber} approved by ${req.user.name}`, type: 'Approval Completed' });

  res.json({ success: true, message: 'RFQ approved', data: rfq });
});

// @route POST /api/approvals/:rfqId/reject
const rejectRFQ = asyncHandler(async (req, res) => {
  const { remarks = '' } = req.body;
  const rfq = await RFQ.findById(req.params.rfqId);
  if (!rfq) throw AppError.notFound('RFQ not found');

  if (rfq.status === 'Approved' || rfq.status === 'Rejected') {
    throw AppError.badRequest(`RFQ has already been ${rfq.status.toLowerCase()}`);
  }

  rfq.status = 'Rejected';
  rfq.approval = { decidedBy: req.user._id, remarks, decidedAt: new Date() };
  await rfq.save();
  await Quotation.updateMany({ rfq: rfq._id }, { status: 'Rejected' });

  await logActivity({ user: req.user, action: 'Approval Rejected', description: `Rejected RFQ ${rfq.rfqNumber}`, entityType: 'RFQ', entityId: rfq.rfqNumber });
  await notify({ roles: ['Procurement Officer', 'Admin'], title: 'RFQ Rejected', message: `${rfq.rfqNumber} rejected by ${req.user.name}`, type: 'Approval Completed' });

  res.json({ success: true, message: 'RFQ rejected', data: rfq });
});

// @route POST /api/approvals/:rfqId/request-changes
const requestChanges = asyncHandler(async (req, res) => {
  const { remarks = '' } = req.body;
  const rfq = await RFQ.findById(req.params.rfqId);
  if (!rfq) throw AppError.notFound('RFQ not found');

  rfq.status = 'Open';
  rfq.approval = { decidedBy: req.user._id, remarks: `Changes requested: ${remarks}`, decidedAt: new Date() };
  await rfq.save();

  await logActivity({ user: req.user, action: 'Changes Requested', description: `Requested changes on RFQ ${rfq.rfqNumber}`, entityType: 'RFQ', entityId: rfq.rfqNumber });
  await notify({ roles: ['Procurement Officer'], title: 'Changes Requested', message: `${rfq.rfqNumber}: ${remarks}`, type: 'Approval Pending' });

  res.json({ success: true, message: 'Changes requested', data: rfq });
});

module.exports = { getApprovalQueue, getApprovalHistory, approveRFQ, rejectRFQ, requestChanges };
