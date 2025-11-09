  const nodemailer = require('nodemailer');
  
// Create reusable transporter
let transporter = null;
  
const createTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  
  // GoDaddy uses port 465 with SSL, Gmail uses 587 with TLS
  const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

  console.log('📧 Creating email transporter:', { host, port, secure: isSecure, user: process.env.SMTP_USER });

  // Use environment variables or default SMTP settings
  transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: isSecure, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER || 'your-email@gmail.com',
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || 'your-password'
    },
    tls: {
      // Don't fail on invalid certificates (some providers need this)
      rejectUnauthorized: false
    }
  });

  return transporter;
};

// Send OTP email
const sendOTPEmail = async (email, otp, expiresInMinutes = 10) => {
  try {
    const transporter = createTransporter();

    console.log('📧 Sending OTP email to:', email);

    const mailOptions = {
      from: `"Elite Bet" <${process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@elitebet.com'}>`,
      to: email,
      subject: 'Password Reset OTP - Elite Bet',
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
              <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
              <p>We received a request to reset your password for your Elite Bet account. Use the OTP below to proceed:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">Valid for ${expiresInMinutes} minutes</p>
              </div>

          <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This OTP expires in ${expiresInMinutes} minutes</li>
                  <li>Never share this code with anyone</li>
                  <li>Elite Bet will never ask for your OTP via phone or email</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>

              <p>Enter this OTP on the password reset page along with your new password.</p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
        </div>
        <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Elite Bet. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
      `
    };

    // Add timeout to prevent hanging
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 10000) // 10 second timeout
    );

    await Promise.race([sendPromise, timeoutPromise]);
    
    console.log(`✅ OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
    console.error('Email service error details:', error);
    
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('⚠️  SMTP not configured! Set SMTP_USER and SMTP_PASSWORD in .env file');
      console.warn('⚠️  OTP will be shown in console/response instead');
    }
    
    // Don't throw error - fall back to showing OTP in console
    return false;
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Elite Bet" <${process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@elitebet.com'}>`,
      to: email,
      subject: 'Welcome to Elite Bet! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Elite Bet!</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>Thank you for joining Elite Bet! We're excited to have you on board.</p>
              <p>Start exploring our games and place your first bet today!</p>
              <p>Best regards,<br>The Elite Bet Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail
};
