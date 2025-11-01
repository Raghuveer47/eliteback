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
    default: false // Require KYC verification
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
    enum: ['not_submitted', 'pending', 'approved', 'rejected'],
    default: 'not_submitted'
  },
  kycData: {
    phoneNumber: { type: String, default: null },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    documentType: { type: String, enum: ['aadhaar', 'pan', null], default: null },
    documentNumber: { type: String, default: null },
    documentImage: { type: String, default: null }, // Cloudinary URL
    submittedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null }
  },
  kycBonusReceived: {
    type: Boolean,
    default: false
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
