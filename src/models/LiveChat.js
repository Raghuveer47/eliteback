const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'agent', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const liveChatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  agentId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended', 'timeout'],
    default: 'waiting'
  },
  messages: [chatMessageSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  endedBy: {
    type: String,
    default: null
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
liveChatSchema.index({ userId: 1, createdAt: -1 });
liveChatSchema.index({ status: 1, startedAt: -1 });

// Auto-timeout after 2 minutes of inactivity
liveChatSchema.methods.checkTimeout = function() {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  if (this.status === 'waiting' && this.lastActivityAt < twoMinutesAgo) {
    this.status = 'timeout';
    this.endedAt = new Date();
    this.messages.push({
      senderId: 'system',
      senderType: 'system',
      message: 'Chat ended - All agents are currently busy. Please create a support ticket for assistance.',
      timestamp: new Date()
    });
    return true;
  }
  return false;
};

module.exports = mongoose.model('LiveChat', liveChatSchema);

