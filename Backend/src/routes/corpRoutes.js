const express = require('express');
const router = express.Router();
const {
    createCorporation,
    updateCorporation,
    deleteCorporation,
    getAllCorporations,
    getUsersByCorporation,
    getAllowedResources,
    getRolesByCorporation,
    updateUserOfCorporation,
    createUserInCorporation,
    getFullCorporationDetails,
    getCurrentCorporationDetails
} = require('../controllers/corpController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// Corporation management routes
router.post('/', protect, checkPermission('CORPORATIONS', 'create'), createCorporation);
router.put('/:corp_id', protect, checkPermission('CORPORATIONS', 'update'), updateCorporation);
router.delete('/:corp_id', protect, checkPermission('CORPORATIONS', 'delete'), deleteCorporation);
router.get('/', protect, checkPermission('CORPORATIONS', 'read'), getAllCorporations);
router.get('/resources', protect, checkPermission('CORPORATIONS', 'read'), getAllowedResources);

// Add this new route for getting current corporation details
router.get('/current', protect, getCurrentCorporationDetails);

// New route for getting full corporation details
router.get('/:corp_id/full-details', protect, checkPermission('CORPORATIONS', 'read'), getFullCorporationDetails);

// Corporation user management routes
router.get('/:corp_id/users', protect, checkPermission('CORPORATIONS', 'read'), getUsersByCorporation);
router.put('/user/:user_id', protect, checkPermission('CORPORATIONS', 'update'), updateUserOfCorporation);
router.post('/users', protect, checkPermission('CORPORATIONS', 'create'), createUserInCorporation);

// Corporation role management routes
router.get('/:corp_id/roles', protect, checkPermission('CORPORATIONS', 'read'), getRolesByCorporation);

module.exports = router; 