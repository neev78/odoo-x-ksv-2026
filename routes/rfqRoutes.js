const express = require('express');
const router = express.Router();
const { getRFQs, getRFQ, createRFQ, updateRFQ, deleteRFQ } = require('../controllers/rfqController');
const { protect, authorize } = require('../middleware/auth');

const officers = authorize('Admin', 'Procurement Officer');

router.route('/')
  .get(protect, getRFQs)
  .post(protect, officers, createRFQ);

router.route('/:id')
  .get(protect, getRFQ)
  .put(protect, officers, updateRFQ)
  .delete(protect, officers, deleteRFQ);

module.exports = router;
