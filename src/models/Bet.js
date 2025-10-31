const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  gameId: {
    type: String,
    required: true
  },
  gameType: {
    type: String,
    enum: ['slots', 'blackjack', 'roulette', 'baccarat', 'lottery', 'sports'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  odds: {
    type: Number,
    default: null
  },
  potentialWin: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'cancelled'],
    default: 'pending'
  },
  payout: {
    type: Number,
    default: 0
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  settledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
betSchema.index({ userId: 1, createdAt: -1 });
betSchema.index({ gameId: 1, status: 1 });
betSchema.index({ status: 1 });

module.exports = mongoose.model('Bet', betSchema);
