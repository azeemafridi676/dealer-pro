const express = require('express');
const {
    loginUser,
    signUpUser,
    tokenCheck,
    getUserById,
    getAllUsers,
    getUserInfo,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    sendOrgRegistrationOtp,
    verifyOrgRegistrationOtp
} = require('../controllers/authController');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer();

router.post('/login', loginUser);
router.post('/signup', signUpUser);
router.get('/profile/detail', protect, getUserInfo);
router.post('/token-check', tokenCheck);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/users', protect, getAllUsers);
router.get('/users/:user_id', protect, getUserInfo);
// change password
router.post('/change-password',protect, changePassword);
// Update profile (handle multipart/form-data)
router.post('/profile/update-profile', protect, upload.single('profileImage'), updateProfile);
router.post('/org-registration/send-otp', sendOrgRegistrationOtp);
router.post('/org-registration/verify-otp', verifyOrgRegistrationOtp);

module.exports = router;