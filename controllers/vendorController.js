const Vendor = require('../models/Vendor');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity } = require('../utils/logger');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, paginatedResponse } = require('../utils/paginate');

// @route GET /api/vendors
const getVendors = asyncHandler(async (req, res) => {
  const { search, category, status } = req.query;
  const q = {};
  if (category) q.category = category;
  if (status) q.status = status;
  if (search) {
    const safe = escapeRegex(search);
    q.$or = [
      { companyName: { $regex: safe, $options: 'i' } },
      { contactPerson: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { vendorId: { $regex: safe, $options: 'i' } },
      { gstNumber: { $regex: safe, $options: 'i' } },
    ];
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [vendors, total] = await Promise.all([
    Vendor.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Vendor.countDocuments(q),
  ]);

  res.json(paginatedResponse(vendors, total, page, limit));
});

// @route GET /api/vendors/:id
const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).lean();
  if (!vendor) throw AppError.notFound('Vendor not found');
  res.json({ success: true, data: vendor });
});

// @route POST /api/vendors
const createVendor = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user._id };
  const vendor = await Vendor.create(payload);
  await logActivity({ user: req.user, action: 'Vendor Added', description: `Added vendor ${vendor.companyName}`, entityType: 'Vendor', entityId: vendor.vendorId });
  res.status(201).json({ success: true, data: vendor });
});

// @route PUT /api/vendors/:id
const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw AppError.notFound('Vendor not found');

  const fields = ['companyName', 'contactPerson', 'email', 'phone', 'address', 'gstNumber', 'category', 'status', 'rating', 'performanceScore'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) vendor[f] = req.body[f];
  });
  await vendor.save();

  await logActivity({ user: req.user, action: 'Vendor Updated', description: `Updated vendor ${vendor.companyName}`, entityType: 'Vendor', entityId: vendor.vendorId });
  res.json({ success: true, data: vendor });
});

// @route DELETE /api/vendors/:id
const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndDelete(req.params.id);
  if (!vendor) throw AppError.notFound('Vendor not found');
  await logActivity({ user: req.user, action: 'Vendor Deleted', description: `Deleted vendor ${vendor.companyName}`, entityType: 'Vendor', entityId: vendor.vendorId });
  res.json({ success: true, message: 'Vendor deleted' });
});

module.exports = { getVendors, getVendor, createVendor, updateVendor, deleteVendor };
