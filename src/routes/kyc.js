const express = require('express');
const router = express.Router();
const {
  submitKYC,
  sendKYCOTP,
  verifyKYCOTP,
  getKYCStatus,
  getAllKYCSubmissions,
  updateKYCStatus
} = require('../controllers/kycController');

// User routes
router.post('/submit', submitKYC);
router.post('/send-otp', sendKYCOTP);
router.post('/verify-otp', verifyKYCOTP);
router.get('/status/:userId', getKYCStatus);

// Admin routes
router.get('/admin/submissions', getAllKYCSubmissions);
router.patch('/admin/:userId/status', updateKYCStatus);

module.exports = router;

