const express = require('express');
const router = express.Router();
const {
  getApprovalQueue, getApprovalHistory, approveRFQ, rejectRFQ, requestChanges,
} = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/auth');

const approvers = authorize('Manager', 'Admin');

router.get('/queue', protect, getApprovalQueue);
router.get('/history', protect, getApprovalHistory);
router.post('/:rfqId/approve', protect, approvers, approveRFQ);
router.post('/:rfqId/reject', protect, approvers, rejectRFQ);
router.post('/:rfqId/request-changes', protect, approvers, requestChanges);

module.exports = router;
