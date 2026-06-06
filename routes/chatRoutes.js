const express = require('express');
const router = express.Router();
const { processChat } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.post('/', protect, processChat);

module.exports = router;
