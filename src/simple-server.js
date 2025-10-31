const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple betting test route
app.post('/api/betting/test', (req, res) => {
  res.json({
    success: true,
    message: 'Betting API is working!',
    data: req.body,
    timestamp: new Date()
  });
});

// Simple bet placement (without database for now)
app.post('/api/betting/bet', (req, res) => {
  const { userId, gameId, gameType, amount, details } = req.body;
  
  res.json({
    success: true,
    message: 'Bet placed successfully',
    bet: {
      id: `bet_${Date.now()}`,
      userId,
      gameId,
      gameType,
      amount,
      status: 'pending',
      createdAt: new Date()
    }
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Betting API: http://localhost:${PORT}/api/betting`);
});

module.exports = app;
