const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: false,
    unique: false,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  firstName: {
    type: String,
    required: false,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD']
  },
  isVerified: {
    type: Boolean,
    default: true // Auto-verify for demo
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active'
  },
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  totalWagered: {
    type: Number,
    default: 0
  },
  totalWon: {
    type: Number,
    default: 0
  },
  activeBets: {
    type: Number,
    default: 0
  },
  country: {
    type: String,
    default: 'IN'
  },
  referralCode: {
    type: String,
    index: true,
    unique: false,
    sparse: true
  },
  referredBy: {
    type: String,
    index: true,
    default: null
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Auto-approve for demo
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update balance method
userSchema.methods.updateBalance = function(amount) {
  this.balance += amount;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
