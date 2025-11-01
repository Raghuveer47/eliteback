const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken({ sub: user.userId, id: user._id.toString(), email: user.email });
    return res.json({ success: true, token, user: { id: user._id.toString(), userId: user.userId, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '', balance: user.balance, country: user.country || 'India', referralCode: user.referralCode || null } });
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


