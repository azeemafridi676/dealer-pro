
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changeUserPassword
} = require('../controllers/userController.js');

// All routes are protected and require authentication
router.use(protect);

// Get all users in the same corporation
router.get('/', checkPermission('USERS Management', 'read'), getAllUsers);

// Get a single user by ID
router.get('/:userId', checkPermission('USERS Management', 'read'), getUserById);

// Create a new user
router.post('/', checkPermission('USERS Management', 'create'), createUser);

// Update a user
router.put('/:userId', checkPermission('USERS Management', 'update'), updateUser);

// Delete a user (soft delete)
router.delete('/:userId', checkPermission('USERS Management', 'delete'), deleteUser);

// Change user password
router.put('/:userId/password', checkPermission('USERS Management', 'update'), changeUserPassword);

module.exports = router; 