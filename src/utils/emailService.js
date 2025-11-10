  const { Resend } = require('resend');

// Initialize Resend client
let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;
  
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  RESEND_API_KEY not configured! Emails will not be sent.');
    return null;
  }
  
  console.log('📧 Initializing Resend email service');
  resendClient = new Resend(apiKey);
  return resendClient;
};

// Send OTP email
const sendOTPEmail = async (email, otp, expiresInMinutes = 10) => {
  try {
    const resend = getResendClient();
    
    if (!resend) {
      console.warn('⚠️  Resend not configured - OTP will be shown in response');
      return false;
    }

    console.log('📧 Sending OTP email to:', email);

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Elite Bet <onboarding@resend.dev>',
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
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return false;
    }
    
    console.log(`✅ OTP email sent successfully to ${email} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
    console.error('Email service error details:', error);
    
    // Don't throw error - fall back to showing OTP in console
    return false;
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const resend = getResendClient();
    
    if (!resend) {
      console.warn('⚠️  Resend not configured - Welcome email not sent');
      return false;
    }

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Elite Bet <onboarding@resend.dev>',
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
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return false;
    }
    
    console.log(`✅ Welcome email sent to ${email}`);
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
