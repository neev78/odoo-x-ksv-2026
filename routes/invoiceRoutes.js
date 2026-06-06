const express = require('express');
const router = express.Router();
const {
  getInvoices, getInvoice, generateInvoice, updateInvoice, downloadInvoicePdf, emailInvoice,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

const officers = authorize('Admin', 'Procurement Officer');

router.route('/')
  .get(protect, getInvoices)
  .post(protect, officers, generateInvoice);

router.get('/:id/pdf', protect, downloadInvoicePdf);
router.post('/:id/email', protect, officers, emailInvoice);
router.route('/:id')
  .get(protect, getInvoice)
  .put(protect, officers, updateInvoice);

module.exports = router;
