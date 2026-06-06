const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Activity = require('../models/Activity');
const asyncHandler = require('../middleware/asyncHandler');

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// @route GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const [totalVendors, activeRFQs, pendingApprovals, approvedRFQs, purchaseOrders, invoices] =
    await Promise.all([
      Vendor.countDocuments(),
      RFQ.countDocuments({ status: { $in: ['Sent', 'Open'] } }),
      RFQ.countDocuments({ status: { $in: ['Open', 'Closed', 'Sent'] } }),
      RFQ.countDocuments({ status: 'Approved' }),
      PurchaseOrder.countDocuments(),
      Invoice.countDocuments(),
    ]);

  const poAgg = await PurchaseOrder.aggregate([
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalProcurementValue = poAgg.length ? poAgg[0].total : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthAgg = await PurchaseOrder.aggregate([
    { $match: { createdAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const monthlySpending = monthAgg.length ? monthAgg[0].total : 0;

  // Invoice totals
  const invoiceAgg = await Invoice.aggregate([
    { $group: { _id: '$paymentStatus', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
  ]);
  const invoiceByStatus = {};
  invoiceAgg.forEach((i) => { invoiceByStatus[i._id] = { total: i.total, count: i.count }; });

  res.json({
    success: true,
    data: {
      totalVendors, activeRFQs, pendingApprovals, approvedRFQs,
      purchaseOrders, invoices, monthlySpending, totalProcurementValue,
      invoiceByStatus,
    },
  });
});

// @route GET /api/dashboard/charts
const getCharts = asyncHandler(async (req, res) => {
  const now = new Date();
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendAgg = await PurchaseOrder.aggregate([
    { $match: { createdAt: { $gte: sixAgo } } },
    { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: '$totalAmount' } } },
  ]);
  const trendMap = {};
  trendAgg.forEach((t) => { trendMap[`${t._id.y}-${t._id.m}`] = t.total; });
  const trendLabels = [], trendValues = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendLabels.push(`${monthLabels[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`);
    trendValues.push(trendMap[`${d.getFullYear()}-${d.getMonth() + 1}`] || 0);
  }

  const categoryAgg = await PurchaseOrder.aggregate([
    { $lookup: { from: 'rfqs', localField: 'rfq', foreignField: '_id', as: 'rfq' } },
    { $unwind: '$rfq' },
    { $group: { _id: '$rfq.productCategory', total: { $sum: '$totalAmount' } } },
    { $sort: { total: -1 } },
  ]);

  const statusAgg = await RFQ.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const topVendors = await Vendor.find().sort({ performanceScore: -1 }).limit(6)
    .select('companyName performanceScore rating').lean();

  res.json({
    success: true,
    data: {
      monthlyTrend: { labels: trendLabels, values: trendValues },
      spendingByCategory: { labels: categoryAgg.map((c) => c._id || 'Other'), values: categoryAgg.map((c) => c.total) },
      rfqStatus: { labels: statusAgg.map((s) => s._id), values: statusAgg.map((s) => s.count) },
      vendorPerformance: { labels: topVendors.map((v) => v.companyName), values: topVendors.map((v) => v.performanceScore) },
    },
  });
});

// @route GET /api/dashboard/summary
const getSummary = asyncHandler(async (req, res) => {
  const recentActivities = await Activity.find().sort({ createdAt: -1 }).limit(8).lean();
  const vendorByCategory = await Vendor.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const recentPOs = await PurchaseOrder.find()
    .populate('vendor', 'companyName')
    .sort({ createdAt: -1 }).limit(5).lean();

  res.json({ success: true, data: { recentActivities, vendorByCategory, recentPOs } });
});

module.exports = { getStats, getCharts, getSummary };
