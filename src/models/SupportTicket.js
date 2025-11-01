const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'admin', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
});

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['account', 'payment', 'technical', 'gaming', 'kyc', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: String,
    default: null
  },
  messages: [supportMessageSchema],
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

