const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Bet = require('../models/Bet');
const User = require('../models/User');

// Place a bet (works with Supabase user ID)
const placeBet = async (req, res) => {
  try {
    const { userId, gameId, gameType, amount, details } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get or create user
    let currentUser = await User.findOne({ userId: userId });
    
    if (!currentUser) {
      // Create user entry if doesn't exist
      currentUser = await User.create({
        userId: userId,
        email: details?.email || `user_${userId}@example.com`,
        firstName: details?.firstName || 'User',
        lastName: details?.lastName || '',
        balance: 0 // No automatic bonus
      });
    } else {
      // Update email if user exists with placeholder email and we have real email
      const isPlaceholderEmail = currentUser.email === 'user@example.com' || 
                                  currentUser.email.includes('@example.com');
      
      if (isPlaceholderEmail && details?.email && !details.email.includes('@example.com')) {
        console.log(`Updating user ${userId} email from ${currentUser.email} to ${details.email}`);
        currentUser.email = details.email;
        if (details.firstName) currentUser.firstName = details.firstName;
        if (details.lastName) currentUser.lastName = details.lastName;
        await currentUser.save();
      }
    }
    if (currentUser.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct from balance
    currentUser.balance -= amount;
    currentUser.totalWagered += amount;
    await currentUser.save();

    // Create bet
    const bet = new Bet({
      userId,
      gameId,
      gameType,
      amount,
      details,
      status: 'pending'
    });

    await bet.save();

    // Create bet transaction
    const betTransaction = new Transaction({
      userId,
      type: 'bet',
      amount: -amount, // Negative for bet
      currency: currentUser.currency || 'INR',
      status: 'completed',
      description: `${gameType} - Bet placed`,
      reference: `BET_${bet._id}`,
      gameId,
      gameType,
      betId: bet._id.toString(),
      metadata: {
        gameId,
        gameType,
        betAmount: amount,
        details
      },
      completedAt: new Date()
    });

    await betTransaction.save();

    res.json({
      success: true,
      message: 'Bet placed successfully',
      bet: {
        id: bet._id,
        gameId: bet.gameId,
        gameType: bet.gameType,
        amount: bet.amount,
        status: bet.status,
        createdAt: bet.createdAt
      },
      newBalance: currentUser.balance
    });
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Process bet result (win/loss)
const processBetResult = async (req, res) => {
  try {
    const { betId, userId, result, payout, details } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find bet
    const bet = await Bet.findOne({ _id: betId, userId });
    if (!bet) {
      return res.status(404).json({ message: 'Bet not found' });
    }

    if (bet.status !== 'pending') {
      return res.status(400).json({ message: 'Bet already processed' });
    }

    // Get user
    let user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update bet
    bet.status = result; // 'won' or 'lost'
    bet.payout = payout || 0;
    bet.settledAt = new Date();
    bet.details = { ...bet.details, ...details };

    await bet.save();

    // Create win transaction and update balance if won
    if (result === 'won' && payout > 0) {
      user.balance += payout;
      user.totalWon += payout;
      
      const winTransaction = new Transaction({
        userId,
        type: 'win',
        amount: payout,
        currency: user.currency || 'INR',
        status: 'completed',
        description: `${bet.gameType} - Win`,
        reference: `WIN_${bet._id}`,
        gameId: bet.gameId,
        gameType: bet.gameType,
        betId: bet._id.toString(),
        metadata: {
          gameId: bet.gameId,
          gameType: bet.gameType,
          betAmount: bet.amount,
          payout,
          profit: payout - bet.amount,
          details
        },
        completedAt: new Date()
      });

      await Promise.all([winTransaction.save(), user.save()]);
    }

    res.json({
      success: true,
      message: `Bet ${result} successfully`,
      bet: {
        id: bet._id,
        status: bet.status,
        payout: bet.payout,
        settledAt: bet.settledAt
      },
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Process bet result error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create transaction (for deposits, withdrawals, etc.)
const createTransaction = async (req, res) => {
  try {
    const { userId, type, amount, description, metadata } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get or create user
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({
        userId: userId,
        email: metadata?.details?.email || metadata?.email || `user_${userId}@example.com`,
        firstName: metadata?.details?.firstName || metadata?.firstName || 'User',
        lastName: metadata?.details?.lastName || metadata?.lastName || '',
        balance: 0
      });
    }

    // Determine transaction status based on metadata
    const requiresApproval = metadata?.requiresAdminApproval || false;
    const status = requiresApproval ? 'pending' : 'completed';
    
    // Update balance ONLY if transaction is completed (not pending)
    let newBalance = user.balance;
    if (status === 'completed') {
      if (type === 'deposit') {
        newBalance += amount;
        user.totalDeposited += amount;
      } else if (type === 'withdrawal') {
        if (user.balance < amount) {
          return res.status(400).json({ message: 'Insufficient balance' });
        }
        newBalance -= amount;
        user.totalWithdrawn += amount;
      } else if (type === 'bet') {
        if (user.balance < amount) {
          return res.status(400).json({ message: 'Insufficient balance' });
        }
        newBalance -= amount;
        user.totalWagered += amount;
      } else if (type === 'win') {
        newBalance += amount;
        user.totalWon += amount;
      }
      
      user.balance = newBalance;
      await user.save();
    }

    const transaction = new Transaction({
      userId,
      type,
      amount: type === 'bet' || type === 'withdrawal' ? -amount : amount,
      currency: user.currency || 'INR',
      status: status,
      description,
      reference: `${type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: metadata || {},
      completedAt: status === 'completed' ? new Date() : null
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction created successfully',
      transaction: {
        id: transaction._id,
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        reference: transaction.reference,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      },
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user balance
const getUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to find by userId first, then by email, then by _id
    let user = await User.findOne({ userId });
    
    // If not found by userId, try finding by email (in case userId is an email)
    if (!user && userId.includes('@')) {
      user = await User.findOne({ email: userId });
    }
    
    // If still not found, try as MongoDB _id
    if (!user) {
      try {
        user = await User.findById(userId);
      } catch (err) {
        // Not a valid ObjectId, continue to create new user
      }
    }
    
    if (!user) {
      // Create default user if doesn't exist
      user = await User.create({
        userId: userId,
        email: userId.includes('@') ? userId : `user_${userId}@example.com`,
        firstName: 'User',
        lastName: '',
        balance: 0
      });
    }

    // Add cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      success: true,
      balance: user.balance,
      stats: {
        totalDeposited: user.totalDeposited,
        totalWithdrawn: user.totalWithdrawn,
        totalWagered: user.totalWagered,
        totalWon: user.totalWon
      }
    });
  } catch (error) {
    console.error('Get user balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user balance
const updateUserBalance = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    let user = await User.findOne({ userId });
    
    if (!user) {
      user = await User.create({
        userId: userId,
        email: `user_${userId}@example.com`,
        firstName: 'User',
        lastName: '',
        balance: 0
      });
    }

    const oldBalance = user.balance;
    user.balance += amount;
    await user.save();

    // Create transaction log
    const transaction = new Transaction({
      userId,
      type: amount > 0 ? 'bonus' : 'fee',
      amount: amount,
      currency: user.currency || 'INR',
      status: 'completed',
      description: reason || 'Balance adjustment',
      reference: `ADJ_${Date.now()}`,
      metadata: { reason, adminAdjustment: true },
      completedAt: new Date()
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Balance updated successfully',
      oldBalance,
      newBalance: user.balance,
      adjustment: amount
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user transactions
const getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({ userId });

    // Add cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user bets
const getBets = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const bets = await Bet.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Bet.countDocuments({ userId });

    res.json({
      success: true,
      bets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get game statistics
const getGameStats = async (req, res) => {
  try {
    const { userId, gameType } = req.params;

    const stats = {
      totalBets: await Bet.countDocuments({ userId, gameType }),
      totalWon: await Bet.countDocuments({ userId, gameType, status: 'won' }),
      totalLost: await Bet.countDocuments({ userId, gameType, status: 'lost' }),
      totalAmount: await Bet.aggregate([
        { $match: { userId, gameType } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      totalPayout: await Bet.aggregate([
        { $match: { userId, gameType } },
        { $group: { _id: null, total: { $sum: '$payout' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get game stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending deposits (for admin)
const getPendingDeposits = async (req, res) => {
  try {
    const pendingDeposits = await Transaction.find({
      type: 'deposit',
      status: 'pending'
    })
    .sort({ createdAt: -1 });

    // No cache for admin data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    console.log(`Admin: Found ${pendingDeposits.length} pending deposits`);

    res.json({
      success: true,
      deposits: pendingDeposits.map(deposit => ({
        id: deposit._id.toString(),
        userId: deposit.userId,
        amount: deposit.amount,
        currency: deposit.currency,
        status: deposit.status,
        description: deposit.description,
        reference: deposit.reference,
        metadata: deposit.metadata,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get pending deposits error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve pending deposit
const approveDeposit = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { amount, userId } = req.body;

    console.log('Admin: Approving deposit:', { transactionId, amount, userId });

    // Find pending transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      status: 'pending',
      type: 'deposit'
    });

    if (!transaction) {
      console.log('Admin: Transaction not found or already processed');
      return res.status(404).json({ message: 'Deposit not found or already processed' });
    }

    console.log('Admin: Found transaction:', transaction._id);

    // Update user balance
    const user = await User.findOne({ userId });
    if (user) {
      const oldBalance = user.balance;
      user.balance += amount;
      user.totalDeposited += amount;
      await user.save();
      
      console.log(`Admin: Balance updated from ${oldBalance} to ${user.balance}`);
    } else {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update transaction status
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.updatedAt = new Date();
    await transaction.save();

    console.log('Admin: Transaction approved successfully');

    res.json({
      success: true,
      message: 'Deposit approved successfully',
      transaction: transaction,
      newBalance: user.balance,
      oldBalance: user.balance - amount
    });
  } catch (error) {
    console.error('Approve deposit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject pending deposit
const rejectDeposit = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      status: 'pending',
      type: 'deposit'
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Deposit not found or already processed' });
    }

    transaction.status = 'failed';
    transaction.completedAt = new Date();
    transaction.updatedAt = new Date();
    await transaction.save();

    return res.json({ success: true, message: 'Deposit rejected successfully' });
  } catch (error) {
    console.error('Reject deposit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve pending withdrawal
const approveWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { amount, userId } = req.body;

    console.log('Admin: Approving withdrawal:', { transactionId, amount, userId });

    const transaction = await Transaction.findOne({
      _id: transactionId,
      status: 'pending',
      type: 'withdrawal'
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Withdrawal not found or already processed' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const oldBalance = user.balance;
    user.balance -= amount;
    user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
    await user.save();

    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.updatedAt = new Date();
    await transaction.save();

    console.log('Admin: Withdrawal approved successfully');

    return res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      transaction,
      newBalance: user.balance,
      oldBalance
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject pending withdrawal
const rejectWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      status: 'pending',
      type: 'withdrawal'
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Withdrawal not found or already processed' });
    }

    transaction.status = 'failed';
    transaction.completedAt = new Date();
    transaction.updatedAt = new Date();
    await transaction.save();

    return res.json({ success: true, message: 'Withdrawal rejected successfully' });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sync or create user from Supabase (called after registration)
const syncUserFromSupabase = async (req, res) => {
  try {
    const { userId, email, firstName, lastName, country } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user already exists in MongoDB
    let user = await User.findOne({ userId });
    
    if (user) {
      // Update existing user with latest info
      user.email = email || user.email;
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.country = country || user.country;
      await user.save();
      
      return res.json({
        success: true,
        message: 'User updated',
        user: {
          id: user._id.toString(),
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance
        }
      });
    }

    // Create new user in MongoDB
    const newUser = await User.create({
      userId: userId,
      email: email || `user_${userId}@example.com`,
      firstName: firstName || 'User',
      lastName: lastName || '',
      balance: 0, // Start with 0 - admin will add balance
      country: country || 'Unknown',
      status: 'active',
      isVerified: false
    });

    res.json({
      success: true,
      message: 'User created in MongoDB',
      user: {
        id: newUser._id.toString(),
        userId: newUser.userId,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        balance: newUser.balance
      }
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    // Prevent any caching so admin always sees latest emails/balances
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id.toString(),
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        currency: user.currency,
        status: user.status,
        isVerified: user.isVerified,
        totalDeposited: user.totalDeposited || 0,
        totalWithdrawn: user.totalWithdrawn || 0,
        totalWagered: user.totalWagered || 0,
        country: user.country,
        riskLevel: user.riskLevel,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all transactions (admin only)
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    // Prevent any caching so admin always sees fresh data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      transactions: transactions.map(tx => ({
        id: tx._id.toString(),
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        description: tx.description,
        reference: tx.reference,
        gameId: tx.gameId,
        gameType: tx.gameType,
        betId: tx.betId,
        metadata: tx.metadata || {},
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        completedAt: tx.completedAt
      }))
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Record a casino bet (deduct balance, create Bet + Transaction)
const recordCasinoBet = async (req, res) => {
  try {
    const { userId, amount, currency = 'INR', gameId, gameType, description, metadata, details } = req.body;
    console.log('[BET] /casino/bet payload:', { userId, amount, currency, gameId, gameType, details });
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'userId and positive amount are required' });
    }

    // Upsert user to avoid 500s when first bet arrives before sync
    let user = await User.findOne({ userId });
    if (!user) {
      const d = details || metadata?.details || {};
      user = await User.create({
        userId,
        email: d.email || `user_${userId}@example.com`,
        firstName: d.firstName || 'User',
        lastName: d.lastName || '',
        balance: 0
      });
    }
    
    // Update email if it's a placeholder and we have real email from details
    const userDetails = details || metadata?.details;
    if (userDetails?.email && !userDetails.email.includes('@example.com')) {
      const isPlaceholderEmail = user.email === 'user@example.com' || 
                                  user.email.includes('@example.com');
      
      if (isPlaceholderEmail && user.email !== userDetails.email) {
        console.log(`[BET] Updating user ${userId} email from ${user.email} to ${userDetails.email}`);
        user.email = userDetails.email;
        if (userDetails.firstName) user.firstName = userDetails.firstName;
        if (userDetails.lastName) user.lastName = userDetails.lastName;
        await user.save();
      }
    }
    
    // Do NOT hard-fail on insufficient Mongo balance. Frontend/Supabase may hold the real wallet.
    // Proceed and cap deduction at zero to avoid blocking gameplay.
    if (user.balance < amount) {
      console.warn(`[BET] Insufficient Mongo balance for user ${userId}. Proceeding with capped deduction.`);
    }

    // Deduct balance and update wagering stats
    user.balance = Math.max(0, (user.balance || 0) - amount);
    user.totalWagered = (user.totalWagered || 0) + amount;
    await user.save();
    console.log('[BET] balance after bet', { userId, balance: user.balance, totalWagered: user.totalWagered });

    // Create Bet document (pending until result)
    const bet = await Bet.create({
      userId,
      gameId: gameId || null,
      gameType: gameType || 'casino',
      amount,
      details: metadata || {},
      status: 'pending'
    });
    console.log('[BET] bet created', { betId: bet._id.toString(), status: bet.status });

    // Create bet transaction
    const reference = `BET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tx = await Transaction.create({
      userId,
      type: 'bet',
      amount: -amount, // store bets as negative amounts (outflow)
      currency,
      status: 'completed',
      description: description || `${gameType || 'casino'} - Bet placed`,
      reference,
      gameId: gameId || null,
      gameType: gameType || null,
      betId: bet._id.toString(),
      metadata: metadata || {},
      completedAt: new Date()
    });
    console.log('[BET] tx created', { txId: tx._id.toString(), amount: tx.amount });

    return res.json({ 
      success: true, 
      transaction: tx, 
      bet: { id: bet._id.toString(), status: bet.status },
      balance: user.balance,
      stats: {
        totalWagered: user.totalWagered || 0,
        totalWon: user.totalWon || 0
      }
    });
  } catch (error) {
    console.error('Record casino bet error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Record casino win (increase balance, create transaction, mark Bet won)
const recordCasinoWin = async (req, res) => {
  try {
    const { userId, amount, currency = 'INR', gameId, gameType, description, metadata, betId } = req.body;
    console.log('[WIN] /casino/win payload:', { userId, amount, currency, gameId, gameType, betId });
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'userId and positive amount are required' });
    }

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Add balance and update win stats
    user.balance = (user.balance || 0) + amount;
    user.totalWon = (user.totalWon || 0) + amount;
    await user.save();

    // Create win transaction
    const reference = `WIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tx = await Transaction.create({
      userId,
      type: 'win',
      amount,
      currency,
      status: 'completed',
      description: description || `${gameType || 'casino'} - Win awarded`,
      reference,
      gameId: gameId || null,
      gameType: gameType || null,
      betId: betId || null,
      metadata: metadata || {},
      completedAt: new Date()
    });

    // Update bet result if provided (only if valid ObjectId)
    if (betId && mongoose.Types.ObjectId.isValid(betId)) {
      try {
        const bet = await Bet.findOne({ _id: betId, userId });
        if (bet && bet.status === 'pending') {
          bet.status = 'won';
          bet.payout = amount;
          bet.settledAt = new Date();
          await bet.save();
        }
      } catch (e) {
        console.warn('Record win: could not update bet result', e);
      }
    }

    return res.json({ 
      success: true, 
      transaction: tx, 
      balance: user.balance,
      stats: {
        totalWagered: user.totalWagered || 0,
        totalWon: user.totalWon || 0
      }
    });
  } catch (error) {
    console.error('Record casino win error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Record casino loss (mark Bet lost)
const recordCasinoLoss = async (req, res) => {
  try {
    const { userId, betId, gameId, gameType } = req.body;
    console.log('[LOSS] /casino/loss payload:', { userId, betId, gameId, gameType });

    if (!userId || !betId) {
      return res.status(400).json({ success: false, message: 'userId and betId are required' });
    }

    // If betId invalid or not found, don't error; just acknowledge the loss
    if (betId && mongoose.Types.ObjectId.isValid(betId)) {
      const bet = await Bet.findOne({ _id: betId, userId });
      if (bet) {
        if (bet.status === 'pending') {
          bet.status = 'lost';
          bet.payout = 0;
          bet.settledAt = new Date();
          await bet.save();
        }
        return res.json({ success: true, bet: { id: bet._id.toString(), status: bet.status } });
      }
    }

    // Fallback: respond success without bet mutation
    return res.json({ success: true, bet: { id: betId || null, status: 'lost' } });
  } catch (error) {
    console.error('Record casino loss error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  placeBet,
  processBetResult,
  getTransactions,
  getBets,
  getGameStats,
  createTransaction,
  getUserBalance,
  updateUserBalance,
  getPendingDeposits,
  approveDeposit,
  rejectDeposit,
  getAllUsers,
  getAllTransactions,
  recordCasinoBet,
  recordCasinoWin,
  recordCasinoLoss,
  syncUserFromSupabase,
  approveWithdrawal,
  rejectWithdrawal
};