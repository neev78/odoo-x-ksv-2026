const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders, getPurchaseOrder, generatePO, updatePO, downloadPOPdf,
} = require('../controllers/poController');
const { protect, authorize } = require('../middleware/auth');

const officers = authorize('Admin', 'Procurement Officer');

router.route('/')
  .get(protect, getPurchaseOrders)
  .post(protect, officers, generatePO);

router.get('/:id/pdf', protect, downloadPOPdf);
router.route('/:id')
  .get(protect, getPurchaseOrder)
  .put(protect, officers, updatePO);

module.exports = router;
