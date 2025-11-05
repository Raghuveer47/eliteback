const mongoose = require('mongoose');

const paymentConfigSchema = new mongoose.Schema({
  // Payment method type
  method: {
    type: String,
    enum: ['phonepe', 'bank_transfer', 'upi', 'paytm', 'gpay'],
    required: true,
    unique: true
  },
  
  // Is this payment method active?
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Display name
  displayName: {
    type: String,
    required: true
  },
  
  // PhonePe / UPI specific fields
  upiId: {
    type: String,
    default: null
  },
  
  qrCodeUrl: {
    type: String,
    default: null
  },
  
  // Bank Transfer specific fields
  bankDetails: {
    accountHolderName: {
      type: String,
      default: null
    },
    accountNumber: {
      type: String,
      default: null
    },
    ifscCode: {
      type: String,
      default: null
    },
    bankName: {
      type: String,
      default: null
    },
    branchName: {
      type: String,
      default: null
    }
  },
  
  // Instructions for users
  instructions: {
    type: String,
    default: ''
  },
  
  // Minimum and maximum deposit amounts
  minAmount: {
    type: Number,
    default: 100
  },
  
  maxAmount: {
    type: Number,
    default: 100000
  },
  
  // Processing time
  processingTime: {
    type: String,
    default: '5-10 minutes'
  },
  
  // Display order
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentConfigSchema.index({ method: 1 });
paymentConfigSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('PaymentConfig', paymentConfigSchema);

