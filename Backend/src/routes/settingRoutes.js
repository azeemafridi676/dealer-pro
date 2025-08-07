const express = require('express');
const router = express.Router();
const { getTheme, updateTheme, getLogo, updateLogo, removeLogo } = require('../controllers/settingController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for logo upload
const fs = require('fs');
const uploadDir = 'uploads/logos';

// Create uploads/logos directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and SVG files are allowed.'));
    }
  }
});

// Get theme route
router.get('/', protect, getTheme);

// Update theme route
router.put('/', protect, updateTheme);

// Get logo route
router.get('/logo', protect, getLogo);

// Update logo route
router.put('/logo', protect, upload.single('logo'), updateLogo);

// Remove logo route
router.delete('/logo', protect, removeLogo);

module.exports = router;
