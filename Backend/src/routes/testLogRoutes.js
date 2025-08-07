const express = require('express');
const router = express.Router();
const { writeLog } = require('../controllers/testLogController');

// Test Log Routes
router.post('/logs', writeLog);

module.exports = router;