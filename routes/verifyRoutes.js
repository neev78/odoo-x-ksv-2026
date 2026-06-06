const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

// @route GET /api/verify/:kind/:id
router.get('/:kind/:id', asyncHandler(async (req, res) => {
  const { kind, id } = req.params;
  
  try {
    let doc = null;
    let title = '';
    let number = '';
    
    if (kind.toLowerCase() === 'po') {
      doc = await PurchaseOrder.findById(id).populate('vendor', 'companyName');
      if (doc) {
        title = 'Purchase Order';
        number = doc.poNumber;
      }
    } else if (kind.toLowerCase() === 'invoice') {
      doc = await Invoice.findById(id).populate('vendor', 'companyName');
      if (doc) {
        title = 'Tax Invoice';
        number = doc.invoiceNumber;
      }
    }
    
    if (!doc) {
      return res.status(404).send(`
        <html><body style="font-family:sans-serif; text-align:center; padding: 50px;">
          <h1 style="color:#dc2626;">Verification Failed</h1>
          <p>Document not found or invalid.</p>
        </body></html>
      `);
    }
    
    // Valid Document
    res.send(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 30px; max-width: 400px; width: 100%; text-align: center; }
          .icon { font-size: 48px; color: #16a34a; margin-bottom: 10px; }
          .title { font-weight: bold; font-size: 20px; color: #1e293b; margin: 0; }
          .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
          .detail { background: #f1f5f9; border-radius: 8px; padding: 15px; margin-top: 20px; text-align: left; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .detail-row:last-child { margin-bottom: 0; }
          .label { color: #64748b; }
          .value { font-weight: 600; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2 class="title">Verified Authentic</h2>
          <p class="subtitle">This document was issued by VENDOR BRIDGE.</p>
          
          <div class="detail">
            <div class="detail-row">
              <span class="label">Type</span>
              <span class="value">${title}</span>
            </div>
            <div class="detail-row">
              <span class="label">Number</span>
              <span class="value">${number}</span>
            </div>
            <div class="detail-row">
              <span class="label">Vendor</span>
              <span class="value">${doc.vendor ? doc.vendor.companyName : 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount</span>
              <span class="value">Rs. ${doc.totalAmount ? doc.totalAmount.toLocaleString('en-IN') : '0'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status</span>
              <span class="value">${doc.status || doc.paymentStatus || 'Valid'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date Issued</span>
              <span class="value">${new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
}));

module.exports = router;
