const express = require('express');
const router = express.Router();
const { 
    createInvoice,
    getInvoices,
    deleteInvoice,
    updateInvoiceStatuses
} = require('../controllers/receiptController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// Create a new invoice
router.post('/', protect, checkPermission('INVOICES', 'create'), createInvoice);

// Get invoices
router.get('/', protect, checkPermission('INVOICES', 'read'), getInvoices);

// Delete an invoice
router.delete('/:invoiceId', protect, checkPermission('INVOICES', 'delete'), deleteInvoice);

// Update invoice statuses
router.post('/update-status', protect, checkPermission('INVOICES', 'update'), updateInvoiceStatuses);

module.exports = router;
