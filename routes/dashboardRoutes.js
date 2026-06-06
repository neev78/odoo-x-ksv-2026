const express = require('express');
const router = express.Router();
const { getStats, getCharts, getSummary } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, getStats);
router.get('/charts', protect, getCharts);
router.get('/summary', protect, getSummary);

module.exports = router;
