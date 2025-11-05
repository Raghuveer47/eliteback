const express = require('express');
const router = express.Router();
const { register, login, me, syncUser, forgotPassword, resetPassword, verifyResetOTP, resetPasswordWithToken } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);
router.post('/sync-user', syncUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password-with-token', resetPasswordWithToken);

module.exports = router;


