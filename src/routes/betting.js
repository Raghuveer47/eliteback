const express = require('express');
const router = express.Router();
const {
  placeBet,
  processBetResult,
  getTransactions,
  getBets,
  getGameStats,
  createTransaction,
  getUserBalance,
  updateUserBalance,
  getPendingDeposits,
  approveDeposit,
  rejectDeposit,
  getAllUsers,
  updateUserStatus,
  getAllTransactions,
  recordCasinoBet,
  recordCasinoWin,
  recordCasinoLoss,
  syncUserFromSupabase,
  approveWithdrawal,
  rejectWithdrawal
} = require('../controllers/bettingController');

const {
  getActivePaymentMethods,
  getAllPaymentConfigs,
  upsertPaymentConfig,
  deletePaymentConfig,
  initializeDefaultPaymentMethods
} = require('../controllers/paymentConfigController');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Betting API is working!', timestamp: new Date() });
});

// Place a bet
router.post('/bet', placeBet);

// Process bet result
router.post('/bet/result', processBetResult);

// Get user balance
router.get('/balance/:userId', getUserBalance);

// Update user balance
router.post('/balance/update', updateUserBalance);

// Get user transactions
router.get('/transactions/:userId', getTransactions);

// Get user bets
router.get('/bets/:userId', getBets);

// Get game statistics
router.get('/stats/:userId/:gameType', getGameStats);

// Create transaction (for deposits, withdrawals, etc.)
router.post('/transaction', createTransaction);

// Admin endpoints
router.get('/admin/pending-deposits', getPendingDeposits);
router.post('/admin/approve-deposit/:transactionId', approveDeposit);
router.post('/admin/reject-deposit/:transactionId', rejectDeposit);
router.post('/admin/approve-withdrawal/:transactionId', approveWithdrawal);
router.post('/admin/reject-withdrawal/:transactionId', rejectWithdrawal);
router.get('/admin/users', getAllUsers);
router.post('/admin/update-user-status', updateUserStatus);
router.get('/admin/transactions', getAllTransactions);

// Casino endpoints
router.post('/casino/bet', recordCasinoBet);
router.post('/casino/win', recordCasinoWin);
router.post('/casino/loss', recordCasinoLoss);

// User sync endpoint (called after Supabase registration)
router.post('/sync-user', syncUserFromSupabase);

// Payment Configuration endpoints
router.get('/payment-config', getActivePaymentMethods); // For users
router.get('/admin/payment-config', getAllPaymentConfigs); // For admin
router.post('/admin/payment-config', upsertPaymentConfig); // Create/Update
router.delete('/admin/payment-config/:method', deletePaymentConfig); // Delete
router.post('/admin/payment-config/initialize', initializeDefaultPaymentMethods); // Initialize defaults

module.exports = router;
