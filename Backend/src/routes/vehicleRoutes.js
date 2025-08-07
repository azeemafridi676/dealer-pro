const express = require('express');
const router = express.Router();
const { createVehicle, getAll, getById, deleteById, searchVehicleByRegistration, uploadVehicleDocument, uploadVehicleNote, addOutlay, getAllOutlays, updateOutlay, deleteOutlay, updateVehicleNote, deleteVehicleNote } = require('../controllers/vehicleController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/rbacMiddleware');
const multer = require('multer');
const upload = multer();

router.post('/', protect, checkPermission('VEHICLES', 'create'), createVehicle);

// Search vehicle by registration number (without creating)
router.get('/search', protect, checkPermission('VEHICLES', 'read'), searchVehicleByRegistration);

// Get all vehicles (summary)
router.get('/', protect, checkPermission('VEHICLES', 'read'), getAll);

// Get vehicle by ID (full detail)
router.get('/:vehicleId', protect, checkPermission('VEHICLES', 'read'), getById);

// Delete vehicle by ID
router.delete('/:vehicleId', protect, checkPermission('VEHICLES', 'delete'), deleteById);

// Upload document for a vehicle
router.post('/:vehicleId/upload-document', protect, checkPermission('VEHICLES', 'update'), upload.single('document'), uploadVehicleDocument);

// Upload note for a vehicle
router.post('/:vehicleId/upload-note', protect, checkPermission('VEHICLES', 'update'), uploadVehicleNote);

router.post('/:vehicleId/outlay', protect, checkPermission('VEHICLES', 'update'), addOutlay);
router.get('/:vehicleId/outlay', protect, checkPermission('VEHICLES', 'read'), getAllOutlays);
router.put('/:vehicleId/outlay/:outlayId', protect, checkPermission('VEHICLES', 'update'), updateOutlay);
router.delete('/:vehicleId/outlay/:outlayId', protect, checkPermission('VEHICLES', 'delete'), deleteOutlay);

router.put('/:vehicleId/note/:noteId', protect, checkPermission('VEHICLES', 'update'), updateVehicleNote);
router.delete('/:vehicleId/note/:noteId', protect, checkPermission('VEHICLES', 'delete'), deleteVehicleNote);

module.exports = router;
