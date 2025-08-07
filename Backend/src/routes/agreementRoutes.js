const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAgreements, getAgreementById, createSalesAgreement, createAgencyAgreement, createPurchaseAgreement, createReceiptAgreement, deleteAgreement, bankidSign, bankidCollectStatus, uploadAgreementDocument, updateSalesAgreement, updatePurchaseAgreement, updateAgencyAgreement } = require('../controllers/agreementController');
const { checkPermission } = require('../middleware/rbacMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/documents/' });

// Get all agreements
router.get('/', protect, checkPermission('AGREEMENTS', 'read'), getAgreements);

// Get single agreement by ID (protected)
router.get('/:id', protect, checkPermission('AGREEMENTS', 'read'), getAgreementById);

// Get agreement for signing (public route)
router.get('/sign/:id', getAgreementById);

// Create sales agreement
router.post('/sales', protect, checkPermission('AGREEMENTS', 'create'), createSalesAgreement);

// Sign sales agreement
router.post('/sales/sign', protect, checkPermission('AGREEMENTS', 'create'), createSalesAgreement);

// Create agency agreement
router.post('/agency', protect, checkPermission('AGREEMENTS', 'create'), createAgencyAgreement);

// Create purchase agreement
router.post('/purchase', protect, checkPermission('AGREEMENTS', 'create'), createPurchaseAgreement);

// Sign purchase agreement
router.post('/purchase/sign', protect, checkPermission('AGREEMENTS', 'create'), createPurchaseAgreement);

// Create receipt agreement
router.post('/receipt', protect, checkPermission('AGREEMENTS', 'create'), createReceiptAgreement);

// BankID sign and collect endpoints (public)
router.post('/bankid-sign', bankidSign);
router.post('/bankid-collect', bankidCollectStatus);

// Delete agreement and related customers
router.delete('/:id', protect, checkPermission('AGREEMENTS', 'delete'), deleteAgreement);

// Upload document for an agreement
router.post('/:id/upload-document', protect, checkPermission('AGREEMENTS', 'update'), upload.single('document'), uploadAgreementDocument);

// Update sales agreement
router.put('/sales/:id', protect, updateSalesAgreement);

// Update purchase agreement
router.put('/purchase/:id', protect, updatePurchaseAgreement);

// Update agency agreement
router.put('/agency/:id', protect, updateAgencyAgreement);

module.exports = router;
