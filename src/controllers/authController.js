const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendEmail, getPasswordResetEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

const Transaction = require('../models/Transaction');

// POST /api/auth/register { email, password, firstName, lastName, country, referralCode }
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, country, referralCode } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' });

    let existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Use email as userId for simplicity (unique)
    let user = await User.create({ userId: email.toLowerCase(), email: email.toLowerCase(), password, firstName, lastName, country: country || 'India' });

    // Generate a simple referral code for new user
    try {
      user.referralCode = (user._id.toString().slice(-6) + Math.floor(Math.random()*90+10)).toUpperCase();
      await user.save();
    } catch {}

    // Handle referral bonus: referrer +250, new user +100
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        // Credit referrer
        referrer.balance = (referrer.balance || 0) + 250;
        await referrer.save();
        await Transaction.create({
          userId: referrer.userId,
          type: 'bonus',
          amount: 250,
          currency: 'INR',
          status: 'completed',
          description: 'Referral Bonus (+250)',
          reference: `REFERRER_${Date.now()}`,
          metadata: { referredUser: user.userId }
        });

        // Credit new user
        user.balance = (user.balance || 0) + 100;
        user.referredBy = referrer.userId;
        await user.save();
        await Transaction.create({
          userId: user.userId,
          type: 'bonus',
          amount: 100,
          currency: 'INR',
          status: 'completed',
          description: 'Referral Signup Bonus (+100)',
          reference: `REF_SIGNUP_${Date.now()}`,
          metadata: { referrer: referrer.userId }
        });
      }
    }
    const token = signToken({ sub: user.userId, id: user._id.toString(), email: user.email });
    return res.json({ success: true, token, user: { id: user._id.toString(), userId: user.userId, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '', balance: user.balance, country: user.country || 'India', referralCode: user.referralCode || null } });
  } catch (e) {
    console.error('Auth register error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/login { email, password }
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
    // Check user status BEFORE password check (prevents password enumeration via status)
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been suspended. Please contact admin for more information.',
        statusCode: 'ACCOUNT_SUSPENDED',
        contactEmail: process.env.ADMIN_EMAIL || 'admin@spinzos.com'
      });
    }
    
    if (user.status === 'closed') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been closed. Please contact admin.',
        statusCode: 'ACCOUNT_CLOSED',
        contactEmail: process.env.ADMIN_EMAIL || 'admin@spinzos.com'
      });
    }
    
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
    // User is active and password correct - allow login
    const token = signToken({ sub: user.userId, id: user._id.toString(), email: user.email });
    return res.json({ success: true, token, user: { id: user._id.toString(), userId: user.userId, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '', balance: user.balance, country: user.country || 'India', referralCode: user.referralCode || null, status: user.status } });
  } catch (e) {
    console.error('Auth login error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/me (Authorization: Bearer <token>)
exports.me = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ success: false, message: 'Invalid token' }); }
    const user = await User.findOne({ userId: decoded.sub });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  // Backfill referralCode if missing so link never disappears
  if (!user.referralCode) {
    try {
      user.referralCode = (user._id.toString().slice(-6) + Math.floor(Math.random()*90+10)).toUpperCase();
      await user.save();
    } catch (e) {
      // ignore failures
    }
  }
    return res.json({ success: true, user: { id: user._id.toString(), userId: user.userId, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '', balance: user.balance, country: user.country || 'India', referralCode: user.referralCode || null, referredBy: user.referredBy || null } });
  } catch (e) {
    console.error('Auth me error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/sync-user - Update user info from frontend
exports.syncUser = async (req, res) => {
  try {
    const { userId, email, firstName, lastName } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user info
    if (email) user.email = email;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();

    console.log(`User synced: ${userId}`);

    res.json({ success: true, message: 'User synced' });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/forgot-password { email }
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // If user doesn't exist, tell them to register
    if (!user) {
      console.log(`Forgot password attempt for non-existent email: ${email} - User needs to register`);
      
      return res.json({ 
        success: false, 
        isNewUser: true,
        message: 'This email is not registered. Please create an account first.'
      });
    }

    // Existing user - generate one-time password reset token
    const resetToken = jwt.sign(
      { 
        email: email.toLowerCase(), 
        userId: user.userId,
        type: 'password_reset',
        timestamp: Date.now() // Makes each token unique
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Token valid for 1 hour
    );

    // Store token hash in OTP collection for one-time use validation
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Delete any existing password reset tokens for this email
    await OTP.deleteMany({ email: email.toLowerCase(), type: 'password_reset' });

    // Store token for one-time use
    await OTP.create({
      email: email.toLowerCase(),
      otp: resetToken, // Store full token for validation
      type: 'password_reset',
      expiresAt,
      verified: false
    });

    // Generate password reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password-link?token=${resetToken}`;
    
    console.log(`Password reset link for ${email}: ${resetLink}`);
    console.log(`Link expires in 1 hour and can only be used once`);
    
    // Send password reset email
    try {
      const emailHtml = getPasswordResetEmail(resetLink, email);
      await sendEmail(
        email,
        'Password Reset - Spinzos',
        emailHtml
      );
      console.log(`✅ Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Continue anyway - user might still have the link in development
    }
    
    res.json({ 
      success: true,
      isNewUser: false,
      message: 'Password reset link has been sent to your email',
      // In development, include the link for testing
      ...(process.env.NODE_ENV !== 'production' && { resetLink, resetToken })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/reset-password { email, otp, newPassword }
exports.resetPassword = async (req, res) => {
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

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'password_reset',
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      // Increment attempts if OTP exists but wrong
      await OTP.updateOne(
        { email: email.toLowerCase(), type: 'password_reset', verified: false },
        { $inc: { attempts: 1 } }
      );
      
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Mark OTP as verified and delete it
    otpRecord.verified = true;
    await otpRecord.save();
    await OTP.deleteMany({ email: email.toLowerCase(), type: 'password_reset' });

    console.log(`Password reset successful for: ${email}`);

    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/verify-reset-otp { email, otp }
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'password_reset',
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }

    res.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/reset-password-with-token { token, newPassword }
exports.resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset link' 
      });
    }

    // Check if token is for password reset
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset link' 
      });
    }

    // Check if token has already been used (one-time use)
    const tokenRecord = await OTP.findOne({
      email: decoded.email,
      otp: token,
      type: 'password_reset',
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!tokenRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'This reset link has already been used or has expired. Please request a new one.' 
      });
    }

    // Find user
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Mark token as used (verified) and delete it
    tokenRecord.verified = true;
    await tokenRecord.save();
    await OTP.deleteMany({ email: decoded.email, type: 'password_reset' });

    console.log(`Password reset successful via link for: ${decoded.email}`);

    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password with token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


