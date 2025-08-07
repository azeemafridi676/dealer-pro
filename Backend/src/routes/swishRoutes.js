const express = require('express');
const router = express.Router();
const { createSwishPayment, getSwishPayments, deleteSwishPayment } = require('../controllers/swishController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// Create a new Swish payment
router.post('/', protect, checkPermission('SWISH', 'create'), createSwishPayment);

// Get Swish payments
router.get('/', protect, checkPermission('SWISH', 'read'), getSwishPayments);

// Delete a Swish payment
router.delete('/:swishId', protect, checkPermission('SWISH', 'delete'), deleteSwishPayment);

module.exports = router; 