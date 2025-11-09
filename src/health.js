// Health check endpoint to keep Render awake
const express = require('express');
const router = express.Router();

// Simple health check - fast response for Render
router.get('/health', (req, res) => {
  // Send immediate response
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    port: process.env.PORT || 3001
  });
});

// Root health check
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Elite Bet Backend API',
    version: '1.0.0'
  });
});

module.exports = router;

