const User = require('../models/User');
const OTP = require('../models/OTP');
const Transaction = require('../models/Transaction');
const nodemailer = require('nodemailer');

// Email configuration (optional - if not configured, OTP shown in console)
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  // If email not configured, just log OTP to console
  if (!transporter) {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     EMAIL NOT CONFIGURED - OTP CODE:      ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  Email: ${email.padEnd(35)} ║`);
    console.log(`║  OTP:   ${otp.padEnd(35)} ║`);
    console.log('╚════════════════════════════════════════════╝');
    return true; // Return success for testing
  }

  const mailOptions = {
    from: process.env.SMTP_USER || 'noreply@spinzos.com',
    to: email,
    subject: 'Your KYC Verification OTP - Spinzos',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Spinzos KYC Verification</h2>
        <p>Your OTP for KYC verification is:</p>
        <div style="background: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #EF4444; font-size: 36px; margin: 0;">${otp}</h1>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p style="color: #6B7280; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent to:', email);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    // Still show OTP in console as fallback
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   EMAIL FAILED - OTP CODE (FALLBACK):     ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  Email: ${email.padEnd(35)} ║`);
    console.log(`║  OTP:   ${otp.padEnd(35)} ║`);
    console.log('╚════════════════════════════════════════════╝');
    return true; // Return success so user can still verify
  }
};

// Submit KYC
const submitKYC = async (req, res) => {
  try {
    const { userId, phoneNumber, documentType, documentNumber, documentImage } = req.body;

    if (!userId || !phoneNumber || !documentType || !documentNumber || !documentImage) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update KYC data
    user.kycData = {
      phoneNumber,
      phoneVerified: false,
      emailVerified: false,
      documentType,
      documentNumber,
      documentImage,
      submittedAt: new Date(),
      verifiedAt: null,
      rejectionReason: null
    };
    user.kycStatus = 'pending';
    user.isVerified = false; // Not verified until OTP is confirmed

    await user.save();

    console.log(`KYC submitted for user ${userId}`);

    res.json({
      success: true,
      message: 'KYC submitted successfully',
      kycStatus: user.kycStatus
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Send OTP for email verification
const sendKYCOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'No email address registered'
      });
    }

    if (user.kycStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Please submit KYC documents first'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP
    await OTP.create({
      email: user.email,
      otp,
      type: 'kyc_verification',
      expiresAt
    });

    // Send email
    const emailSent = await sendOTPEmail(user.email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    console.log(`OTP sent to ${user.email} for KYC verification`);

    res.json({
      success: true,
      message: `OTP sent to ${user.email}`,
      email: user.email
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Verify OTP and approve KYC
const verifyKYCOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required'
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find OTP
    const otpRecord = await OTP.findOne({
      email: user.email,
      otp,
      type: 'kyc_verification',
      verified: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      // Increment attempts
      await OTP.updateOne(
        { email: user.email, type: 'kyc_verification', verified: false },
        { $inc: { attempts: 1 } }
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Approve KYC
    user.kycStatus = 'approved';
    user.isVerified = true; // Mark user as verified
    
    // Initialize or update kycData
    if (!user.kycData) {
      user.kycData = {
        phoneNumber: null,
        phoneVerified: false,
        emailVerified: true,
        documentType: null,
        documentNumber: null,
        documentImage: null,
        submittedAt: null,
        verifiedAt: new Date(),
        rejectionReason: null
      };
    } else {
      user.kycData.emailVerified = true;
      user.kycData.verifiedAt = new Date();
    }

    // Award ₹100 bonus if not already received
    let bonusAwarded = false;
    if (!user.kycBonusReceived) {
      user.balance += 100;
      user.kycBonusReceived = true;
      bonusAwarded = true;

      // Create transaction record
      await Transaction.create({
        userId: user.userId,
        type: 'bonus',
        amount: 100,
        status: 'completed',
        method: 'system',
        metadata: {
          reason: 'KYC Verification Bonus',
          description: '₹100 bonus for completing KYC verification'
        }
      });

      console.log(`₹100 KYC bonus awarded to ${user.userId}`);
    }

    await user.save();

    console.log(`KYC approved for user ${userId}`);

    res.json({
      success: true,
      message: bonusAwarded 
        ? 'KYC verified successfully! ₹100 bonus added to your account.' 
        : 'KYC verified successfully!',
      kycStatus: user.kycStatus,
      bonusAwarded,
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get KYC status
const getKYCStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      kycStatus: user.kycStatus,
      kycData: {
        phoneNumber: user.kycData?.phoneNumber || null,
        documentType: user.kycData?.documentType || null,
        submittedAt: user.kycData?.submittedAt || null,
        verifiedAt: user.kycData?.verifiedAt || null,
        rejectionReason: user.kycData?.rejectionReason || null
      },
      kycBonusReceived: user.kycBonusReceived
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Admin: Get all KYC submissions
const getAllKYCSubmissions = async (req, res) => {
  try {
    const users = await User.find({
      kycStatus: { $in: ['pending', 'approved', 'rejected'] }
    }).select('userId email kycStatus kycData kycBonusReceived createdAt');

    const submissions = users.map(user => ({
      userId: user.userId,
      email: user.email,
      kycStatus: user.kycStatus,
      phoneNumber: user.kycData?.phoneNumber,
      documentType: user.kycData?.documentType,
      documentNumber: user.kycData?.documentNumber,
      documentImage: user.kycData?.documentImage,
      submittedAt: user.kycData?.submittedAt,
      verifiedAt: user.kycData?.verifiedAt,
      rejectionReason: user.kycData?.rejectionReason,
      bonusReceived: user.kycBonusReceived
    }));

    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    console.error('Get KYC submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Admin: Approve/Reject KYC
const updateKYCStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.kycStatus = status;

    if (status === 'approved') {
      user.kycData.verifiedAt = new Date();
      user.kycData.rejectionReason = null;

      // Award bonus if not already received
      if (!user.kycBonusReceived) {
        user.balance += 100;
        user.kycBonusReceived = true;

        await Transaction.create({
          userId: user.userId,
          type: 'bonus',
          amount: 100,
          status: 'completed',
          method: 'system',
          metadata: {
            reason: 'KYC Verification Bonus',
            description: '₹100 bonus for completing KYC verification'
          }
        });
      }
    } else if (status === 'rejected') {
      user.kycData.rejectionReason = rejectionReason || 'Document verification failed';
    }

    await user.save();

    console.log(`KYC ${status} for user ${userId} by admin`);

    res.json({
      success: true,
      message: `KYC ${status} successfully`,
      kycStatus: user.kycStatus
    });
  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  submitKYC,
  sendKYCOTP,
  verifyKYCOTP,
  getKYCStatus,
  getAllKYCSubmissions,
  updateKYCStatus
};

