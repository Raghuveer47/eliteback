// Resend Email Service - Simple, free, and reliable
// Sign up: https://resend.com (no credit card needed)
// Free tier: 100 emails/day, 3,000/month

const sendOTPEmailResend = async (email, otp, expiresInMinutes = 10) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not set - OTP will be shown in response');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Elite Bet <onboarding@resend.dev>',
        to: email,
        subject: 'Password Reset OTP - Elite Bet',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; margin: 30px 0; border-radius: 12px; }
              .otp-code { font-size: 48px; font-weight: bold; color: white; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
              .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset</h1>
              </div>
              <div class="content">
                <p style="font-size: 16px; color: #333;">Hi there,</p>
                <p style="font-size: 16px; color: #555;">We received a request to reset your password for your <strong>Elite Bet</strong> account.</p>
                
                <div class="otp-box">
                  <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">Your OTP Code</p>
                  <div class="otp-code">${otp}</div>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Valid for ${expiresInMinutes} minutes</p>
                </div>

                <div class="warning">
                  <strong style="color: #856404;">⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                    <li>This OTP expires in <strong>${expiresInMinutes} minutes</strong></li>
                    <li><strong>Never share</strong> this code with anyone</li>
                    <li>Elite Bet will <strong>never</strong> ask for your OTP via phone</li>
                    <li>If you didn't request this, please ignore this email</li>
                  </ul>
                </div>

                <p style="font-size: 14px; color: #555;">Enter this OTP on the password reset page along with your new password.</p>
                
                <p style="color: #888; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
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
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return false;
    }

    console.log(`✅ OTP email sent successfully via Resend to ${email}`);
    console.log(`Email ID: ${data.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email via Resend:', error.message);
    return false;
  }
};

// Send welcome email via Resend
const sendWelcomeEmailResend = async (email, firstName) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not set');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Elite Bet <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to Elite Bet! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
              .content { padding: 40px 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to Elite Bet!</h1>
              </div>
              <div class="content">
                <p style="font-size: 16px;">Hi ${firstName},</p>
                <p style="font-size: 16px;">Thank you for joining Elite Bet! We're excited to have you on board.</p>
                <p style="font-size: 16px;">Start exploring our games and place your first bet today!</p>
                <p style="font-size: 16px; margin-top: 30px;">Best regards,<br><strong>The Elite Bet Team</strong></p>
              </div>
            </div>
          </body>
          </html>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return false;
    }

    console.log(`✅ Welcome email sent successfully via Resend to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email via Resend:', error.message);
    return false;
  }
};

module.exports = {
  sendOTPEmail: sendOTPEmailResend,
  sendWelcomeEmail: sendWelcomeEmailResend
};

