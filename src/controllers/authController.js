const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');

// Email service selection based on configuration
let sendOTPEmail, sendWelcomeEmail;

// Priority: SendGrid (Twilio) > Resend > SMTP
if (process.env.SENDGRID_API_KEY) {
  const twilioService = require('../utils/twilioService');
  sendOTPEmail = twilioService.sendOTPEmail;
  sendWelcomeEmail = twilioService.sendWelcomeEmail;
  console.log('✅ Using Twilio SendGrid email service');
} else if (process.env.RESEND_API_KEY) {
  const resendService = require('../utils/resendEmailService');
  sendOTPEmail = resendService.sendOTPEmail;
  sendWelcomeEmail = resendService.sendWelcomeEmail;
  console.log('✅ Using Resend email service');
} else {
  const emailService = require('../utils/emailService');
  sendOTPEmail = emailService.sendOTPEmail;
  sendWelcomeEmail = emailService.sendWelcomeEmail;
  console.log('✅ Using SMTP email service');
}

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // Create new user with userId
    const user = new User({
      userId: email || `user_${Date.now()}`,
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      balance: 0
    });

        await user.save();

    // Generate token
    const token = generateToken({ userId: user._id });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        userId: user.userId || user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        currency: user.currency,
        isVerified: user.isVerified,
        status: user.status || 'active',
        country: user.country,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`Login attempt for: ${email}`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`Login failed: User not found for ${email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log(`User found: ${user.email}, checking password...`);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login failed: Invalid password for ${email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    console.log(`Password verified for ${email}`);

    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = generateToken({ userId: user._id });

    console.log(`Login successful for ${email}, token generated`);

    const userResponse = {
      id: user._id,
      userId: user.userId || user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      balance: user.balance,
      currency: user.currency,
      isVerified: user.isVerified,
      status: user.status || 'active',
      country: user.country,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    console.log('Sending user data:', userResponse);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Get current user
const me = async (req, res) => {
  try {
    // req.user is set by auth middleware (full user object)
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('Get me endpoint called for user:', user.email);

    res.json({
      success: true,
      user: {
        id: user._id,
        userId: user.userId || user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        currency: user.currency,
        isVerified: user.isVerified,
        status: user.status || 'active',
        country: user.country,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Sync user (for external auth systems)
const syncUser = async (req, res) => {
  try {
    const { userId, email, firstName, lastName, balance } = req.body;
    
    let user = await User.findOne({ userId });

    if (!user) {
      // Create new user
      user = new User({
        userId,
        email: email?.toLowerCase(),
        firstName: firstName || 'User',
        lastName: lastName || '',
        balance: balance || 0
      });
      await user.save();
    } else {
      // Update existing user
      user.email = email?.toLowerCase() || user.email;
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      if (balance !== undefined) user.balance = balance;
      user.lastLogin = new Date();
      await user.save();
    }

    res.json({
      success: true,
      message: 'User synced successfully',
      user: {
        id: user._id,
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        currency: user.currency
      }
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Store OTPs in memory (in production, use Redis)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Forgot Password - Generate OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email',
        isNewUser: true
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt,
      userId: user._id.toString(),
      attempts: 0
    });

    console.log(`Password Reset OTP for ${email}: ${otp}`);

    // Try to send email
    const emailSent = await sendOTPEmail(email, otp, 10);

    // Check if SMTP is properly configured
    const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASSWORD;

    if (!isSmtpConfigured) {
      console.warn('⚠️  SMTP not configured - OTP will be shown in response');
    }

    // Show OTP in response if:
    // 1. Development mode, OR
    // 2. Email sending failed, OR  
    // 3. SMTP is not configured
    const showOtpInResponse = process.env.NODE_ENV === 'development' || !emailSent || !isSmtpConfigured;

    res.json({
      success: true,
      message: emailSent ? 'OTP sent to your email' : 'OTP generated (check console or contact support)',
      otp: showOtpInResponse ? otp : undefined,
      expiresIn: 600, // 10 minutes in seconds
      emailSent,
      smtpConfigured: isSmtpConfigured
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    const storedData = otpStore.get(email.toLowerCase());

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired or not found. Please request a new one.' 
      });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Check attempts
    if (storedData.attempts >= 5) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ 
        success: false, 
        message: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts += 1;
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please try again.',
        attemptsLeft: 5 - storedData.attempts
      });
    }
    
    res.json({ 
      success: true,
      message: 'OTP verified successfully',
      resetToken: generateToken({ 
        userId: storedData.userId, 
        type: 'password_reset' 
      })
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, OTP, and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const storedData = otpStore.get(email.toLowerCase());

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired or not found. Please request a new one.' 
      });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    // Find user and update password
    const user = await User.findById(storedData.userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log(`Resetting password for user: ${user.email}, ID: ${user._id}`);
    console.log(`User status before reset: ${user.status}`);

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.lastLogin = new Date();
    
    // Ensure user is active
    if (user.status !== 'active') {
      user.status = 'active';
    }
    
    await user.save();

    console.log(`Password updated and saved for ${user.email}`);
    console.log(`User status after reset: ${user.status}`);

    // Verify password was saved correctly by testing it
    const testMatch = await user.comparePassword(newPassword);
    console.log(`Password verification test: ${testMatch ? 'PASS' : 'FAIL'}`);

    if (!testMatch) {
      console.error(`WARNING: Password was not saved correctly for ${email}`);
      return res.status(500).json({
        success: false,
        message: 'Password reset failed. Please try again.'
      });
    }

    // Delete OTP
    otpStore.delete(email.toLowerCase());

    console.log(`Password reset successful for ${email}`);
    console.log(`User can now login with new password`);

    // Generate a fresh token for immediate login
    const token = generateToken({ userId: user._id });

    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now login with your new password.',
      token, // Optional: can auto-login user
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        currency: user.currency,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
        success: false, 
      message: 'Server error. Please try again.' 
      });
    }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email' 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt,
      userId: user._id.toString(),
      attempts: 0
    });

    console.log(`Resent OTP for ${email}: ${otp}`);

    // Try to send email
    const emailSent = await sendOTPEmail(email, otp, 10);

    // Check if SMTP is properly configured
    const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASSWORD;

    const showOtpInResponse = process.env.NODE_ENV === 'development' || !emailSent || !isSmtpConfigured;

    res.json({
      success: true,
      message: emailSent ? 'OTP resent to your email' : 'OTP generated (check console or contact support)',
      otp: showOtpInResponse ? otp : undefined,
      expiresIn: 600,
      emailSent,
      smtpConfigured: isSmtpConfigured
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

module.exports = {
  register,
  login,
  me,
  syncUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
  resendOTP,
  // Aliases for routes
  verifyResetOTP: verifyOTP,
  resetPasswordWithToken: resetPassword
};

