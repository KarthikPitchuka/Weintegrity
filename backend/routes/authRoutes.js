import express from 'express';
import { register, login, getMe, updatePassword, logout, updateProfile, verifyEmail, resendVerification, forgotPassword, resetPassword, verifyResetOTP, sendActionOTP, sendEmployeeVerificationOTP, uploadProfilePicture, removeProfilePicture, sendPasswordChangeOTP } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

import { upload } from '../controllers/documentController.js';

const router = express.Router();

// Public routes
// router.post('/register', auditLog('USER_REGISTER'), register); // Public registration disabled
router.post('/login', auditLog('USER_LOGIN'), login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/send-action-otp', protect, sendActionOTP);
router.post('/send-employee-otp', protect, sendEmployeeVerificationOTP); // Send OTP to employee's email
router.post('/password-otp', protect, sendPasswordChangeOTP);
router.get('/me', protect, getMe);
router.put('/password', protect, auditLog('PASSWORD_UPDATE'), updatePassword);
router.put('/profile', protect, auditLog('PROFILE_UPDATE'), updateProfile);
router.post('/profile-picture', protect, upload.single('profilePicture'), auditLog('PROFILE_PICTURE_UPDATE'), uploadProfilePicture);
router.delete('/profile-picture', protect, auditLog('PROFILE_PICTURE_REMOVE'), removeProfilePicture);
router.post('/logout', protect, auditLog('USER_LOGOUT'), logout);

export default router;



