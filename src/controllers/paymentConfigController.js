const PaymentConfig = require('../models/PaymentConfig');

// GET /api/betting/payment-config - Get all payment configurations (for users)
exports.getActivePaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentConfig.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .select('-__v');
    
    res.json({
      success: true,
      paymentMethods
    });
  } catch (error) {
    console.error('Get active payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET /api/betting/admin/payment-config - Get all payment configurations (for admin)
exports.getAllPaymentConfigs = async (req, res) => {
  try {
    const paymentConfigs = await PaymentConfig.find()
      .sort({ displayOrder: 1 })
      .select('-__v');
    
    res.json({
      success: true,
      paymentConfigs
    });
  } catch (error) {
    console.error('Get all payment configs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/betting/admin/payment-config - Create or update payment configuration
exports.upsertPaymentConfig = async (req, res) => {
  try {
    const {
      method,
      isActive,
      displayName,
      upiId,
      qrCodeUrl,
      bankDetails,
      instructions,
      minAmount,
      maxAmount,
      processingTime,
      displayOrder
    } = req.body;

    if (!method || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Method and display name are required'
      });
    }

    // Find existing or create new
    let paymentConfig = await PaymentConfig.findOne({ method });

    if (paymentConfig) {
      // Update existing
      paymentConfig.isActive = isActive !== undefined ? isActive : paymentConfig.isActive;
      paymentConfig.displayName = displayName || paymentConfig.displayName;
      paymentConfig.upiId = upiId !== undefined ? upiId : paymentConfig.upiId;
      paymentConfig.qrCodeUrl = qrCodeUrl !== undefined ? qrCodeUrl : paymentConfig.qrCodeUrl;
      paymentConfig.bankDetails = bankDetails || paymentConfig.bankDetails;
      paymentConfig.instructions = instructions !== undefined ? instructions : paymentConfig.instructions;
      paymentConfig.minAmount = minAmount !== undefined ? minAmount : paymentConfig.minAmount;
      paymentConfig.maxAmount = maxAmount !== undefined ? maxAmount : paymentConfig.maxAmount;
      paymentConfig.processingTime = processingTime || paymentConfig.processingTime;
      paymentConfig.displayOrder = displayOrder !== undefined ? displayOrder : paymentConfig.displayOrder;

      await paymentConfig.save();

      console.log(`Payment config updated: ${method}`);
    } else {
      // Create new
      paymentConfig = await PaymentConfig.create({
        method,
        isActive: isActive !== undefined ? isActive : true,
        displayName,
        upiId,
        qrCodeUrl,
        bankDetails,
        instructions,
        minAmount,
        maxAmount,
        processingTime,
        displayOrder
      });

      console.log(`Payment config created: ${method}`);
    }

    res.json({
      success: true,
      message: 'Payment configuration saved successfully',
      paymentConfig
    });
  } catch (error) {
    console.error('Upsert payment config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE /api/betting/admin/payment-config/:method - Delete payment configuration
exports.deletePaymentConfig = async (req, res) => {
  try {
    const { method } = req.params;

    const paymentConfig = await PaymentConfig.findOneAndDelete({ method });

    if (!paymentConfig) {
      return res.status(404).json({
        success: false,
        message: 'Payment configuration not found'
      });
    }

    console.log(`Payment config deleted: ${method}`);

    res.json({
      success: true,
      message: 'Payment configuration deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/betting/admin/payment-config/initialize - Initialize default payment methods
exports.initializeDefaultPaymentMethods = async (req, res) => {
  try {
    // Check if already initialized
    const count = await PaymentConfig.countDocuments();
    if (count > 0) {
      return res.json({
        success: true,
        message: 'Payment methods already initialized'
      });
    }

    // Create default payment methods
    const defaultMethods = [
      {
        method: 'phonepe',
        isActive: true,
        displayName: 'PhonePe / UPI',
        upiId: 'merchant@paytm',
        qrCodeUrl: '',
        instructions: '1. Scan the QR code or use UPI ID\n2. Enter the amount\n3. Complete payment\n4. Upload screenshot',
        minAmount: 100,
        maxAmount: 50000,
        processingTime: '5-10 minutes',
        displayOrder: 1
      },
      {
        method: 'bank_transfer',
        isActive: true,
        displayName: 'Bank Transfer (NEFT/IMPS)',
        bankDetails: {
          accountHolderName: 'Spinzos Pvt Ltd',
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          branchName: 'Main Branch'
        },
        instructions: '1. Transfer to the bank account below\n2. Note the transaction reference\n3. Upload payment proof',
        minAmount: 500,
        maxAmount: 100000,
        processingTime: '10-30 minutes',
        displayOrder: 2
      }
    ];

    await PaymentConfig.insertMany(defaultMethods);

    console.log('Default payment methods initialized');

    res.json({
      success: true,
      message: 'Default payment methods initialized successfully'
    });
  } catch (error) {
    console.error('Initialize payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

