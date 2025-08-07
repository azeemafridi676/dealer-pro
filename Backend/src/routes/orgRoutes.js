const express = require('express');
const router = express.Router();
const { searchOrg, getAll, getById, deleteById, registerFullOrganization, publicSearchOrg, updateFullOrganization } = require('../controllers/orgController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// Search organization from API
router.post('/search', protect, checkPermission('CORPORATIONS', 'read'), searchOrg);

// Register full organization (creates org, corp, and admin user)
router.post('/register', protect, checkPermission('CORPORATIONS', 'create'), registerFullOrganization);

// Update full organization
router.put('/update', protect, checkPermission('CORPORATIONS', 'update'), updateFullOrganization);

// Get all organizations (summary)
router.get('/', protect, checkPermission('CORPORATIONS', 'read'), getAll);

// Get organization by ID (full detail)
router.get('/:legalId', protect, checkPermission('CORPORATIONS', 'read'), getById);

// Delete organization by ID
router.delete('/:legalId', protect, checkPermission('CORPORATIONS', 'delete'), deleteById);

// Public search organization (no auth)
router.post('/public-search', publicSearchOrg);

// Public check if org exists in DB
router.post('/check-exists', require('../controllers/orgController').checkOrgExists);

module.exports = router;
