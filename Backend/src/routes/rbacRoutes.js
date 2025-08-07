const express = require('express');
const router = express.Router();
const { 
    getUserPermissions, 
    getAllRoles,
    createRole,
    updateRolePermissions
} = require('../controllers/rbacController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

// User Permissions
router.get('/user-permissions', protect, getUserPermissions);
router.get('/roles', protect, checkPermission('ROLES Management', 'read'), getAllRoles);
router.post('/roles', protect, checkPermission('ROLES Management', 'create'), createRole);
router.post('/roles/:roleId/permissions', protect, checkPermission('ROLES Management', 'update'), updateRolePermissions);

module.exports = router; 