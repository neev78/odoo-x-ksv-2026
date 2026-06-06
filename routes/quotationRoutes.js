const express = require('express');
const router = express.Router();
const {
  getQuotations, compareQuotations, createQuotation, updateQuotation, deleteQuotation,
} = require('../controllers/quotationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/compare/:rfqId', protect, compareQuotations);

router.route('/')
  .get(protect, getQuotations)
  // Vendors submit; Procurement Officers/Admins may also create on a vendor's behalf
  .post(protect, authorize('Vendor', 'Procurement Officer', 'Admin'), createQuotation);

router.route('/:id')
  .put(protect, updateQuotation)
  .delete(protect, authorize('Admin', 'Procurement Officer'), deleteQuotation);

module.exports = router;
