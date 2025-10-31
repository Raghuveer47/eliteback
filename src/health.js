// Health check endpoint to keep Render awake
const express = require('express');
const router = express.Router();

// Simple health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production'
  });
});

module.exports = router;

