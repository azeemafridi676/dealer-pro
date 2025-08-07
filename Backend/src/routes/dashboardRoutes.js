const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getDashboardData } = require('../controllers/dashboardController');

// Get dashboard data
router.get('/', protect, getDashboardData);

module.exports = router;
