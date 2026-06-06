const asyncHandler = require('../middleware/asyncHandler');
const RFQ = require('../models/RFQ');
const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');

// @route POST /api/chat
const processChat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const query = message.toLowerCase();
  
  let reply = "I'm sorry, I couldn't understand that. You can ask me things like 'how many open rfqs do we have', 'active vendors', or 'stats'.";

  if (query.includes('rfq') || query.includes('request for quotation')) {
    const openCount = await RFQ.countDocuments({ status: { $in: ['Open', 'Sent'] } });
    const draftCount = await RFQ.countDocuments({ status: 'Draft' });
    reply = `Currently, there are **${openCount} active RFQs** (Open/Sent) and **${draftCount} Drafts** in the system.`;
  } 
  else if (query.includes('vendor')) {
    const vendorCount = await Vendor.countDocuments({ status: 'Active' });
    reply = `We have **${vendorCount} Active Vendors** registered in our procurement network.`;
  }
  else if (query.includes('po') || query.includes('purchase order')) {
    const issuedCount = await PurchaseOrder.countDocuments({ status: 'Issued' });
    const completedCount = await PurchaseOrder.countDocuments({ status: 'Completed' });
    reply = `There are **${issuedCount} Issued Purchase Orders** awaiting fulfillment, and **${completedCount} Completed POs**.`;
  }
  else if (query.includes('stat') || query.includes('summary')) {
    const rfq = await RFQ.countDocuments();
    const po = await PurchaseOrder.countDocuments();
    const vendors = await Vendor.countDocuments();
    reply = `**System Summary:**\n- **Total RFQs:** ${rfq}\n- **Total POs:** ${po}\n- **Total Vendors:** ${vendors}`;
  }
  else if (query.includes('hello') || query.includes('hi')) {
    reply = "Hello! I am your **VendorBridge Copilot**. I can help you retrieve stats about RFQs, Purchase Orders, and Vendors. What would you like to know?";
  }

  // Add a small artificial delay to simulate "AI thinking"
  setTimeout(() => {
    res.json({ success: true, reply });
  }, 600);
});

module.exports = { processChat };
