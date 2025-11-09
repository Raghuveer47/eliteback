const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  me, 
  syncUser, 
  forgotPassword, 
  verifyOTP,
  resetPassword, 
  resendOTP,
  verifyResetOTP, 
  resetPasswordWithToken 
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateUser, me); // Protected route - requires authentication
router.post('/sync-user', syncUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOTP);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password-with-token', resetPasswordWithToken);

module.exports = router;


