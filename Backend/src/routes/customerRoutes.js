const express = require('express');
const router = express.Router();
const { getAllCustomers, createCustomer, deleteCustomer, getCustomerById, updateCustomer, searchPerson, searchCustomerByNumber, getCustomersByType } = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');

router.get('/', protect, checkPermission('CUSTOMERS', 'read'), getAllCustomers);
router.post('/', protect, checkPermission('CUSTOMERS', 'create'), createCustomer);
router.put('/:customerId', protect, checkPermission('CUSTOMERS', 'update'), updateCustomer);
router.delete('/:customerId', protect, checkPermission('CUSTOMERS', 'delete'), deleteCustomer);
router.get('/search/:customerNumber', protect, checkPermission('CUSTOMERS', 'read'), getCustomerById);
router.post('/search-person', protect, checkPermission('CUSTOMERS', 'read'), searchPerson);
router.get('/search-by-number', protect, checkPermission('CUSTOMERS', 'read'), searchCustomerByNumber);
router.get('/by-type', protect, checkPermission('CUSTOMERS', 'read'), getCustomersByType);
router.get('/type-exists', protect, checkPermission('CUSTOMERS', 'read'), getCustomersByType);

module.exports = router;
