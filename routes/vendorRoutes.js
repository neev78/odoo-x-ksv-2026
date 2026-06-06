const express = require('express');
const router = express.Router();
const { getVendors, getVendor, createVendor, updateVendor, deleteVendor } = require('../controllers/vendorController');
const { protect, authorize } = require('../middleware/auth');

const managers = authorize('Admin', 'Procurement Officer');

router.route('/')
  .get(protect, getVendors)
  .post(protect, managers, createVendor);

router.route('/:id')
  .get(protect, getVendor)
  .put(protect, managers, updateVendor)
  .delete(protect, authorize('Admin'), deleteVendor);

module.exports = router;
