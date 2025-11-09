// Twilio SMS Service for OTP
// Sign up: https://www.twilio.com/try-twilio
// Free trial: $15 credit (enough for ~500 SMS)

const sendOTPSMS = async (phoneNumber, otp, expiresInMinutes = 10) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !fromNumber) {
      console.warn('⚠️  Twilio not configured - OTP will be shown in response');
      return false;
    }

    // Twilio REST API
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Body: `Your Elite Bet password reset OTP is: ${otp}\n\nValid for ${expiresInMinutes} minutes.\n\nNever share this code with anyone.`
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio API error:', data);
      return false;
    }

    console.log(`✅ OTP SMS sent successfully via Twilio to ${phoneNumber}`);
    console.log(`Message SID: ${data.sid}`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP SMS via Twilio:', error.message);
    return false;
  }
};

// Send OTP via Email using Twilio SendGrid
const sendOTPEmailTwilio = async (email, otp, expiresInMinutes = 10) => {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  SendGrid API key not set - OTP will be shown in response');
      return false;
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email }],
          subject: 'Password Reset OTP - Elite Bet'
        }],
        from: {
          email: process.env.FROM_EMAIL || 'noreply@elitebet.com',
          name: 'Elite Bet'
        },
        content: [{
          type: 'text/html',
          value: `
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
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Password Reset</h1>
                </div>
                <div class="content">
                  <p style="font-size: 16px;">Hi there,</p>
                  <p style="font-size: 16px;">Your Elite Bet password reset OTP:</p>
                  
                  <div class="otp-box">
                    <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">Your OTP Code</p>
                    <div class="otp-code">${otp}</div>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Valid for ${expiresInMinutes} minutes</p>
                  </div>

                  <div class="warning">
                    <strong style="color: #856404;">⚠️ Security Notice:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                      <li>This OTP expires in <strong>${expiresInMinutes} minutes</strong></li>
                      <li>Never share this code with anyone</li>
                      <li>Elite Bet will never ask for your OTP</li>
                    </ul>
                  </div>
                </div>
                <div class="footer">
                  <p>&copy; ${new Date().getFullYear()} Elite Bet. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid API error:', errorText);
      return false;
    }

    console.log(`✅ OTP email sent successfully via SendGrid to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email via SendGrid:', error.message);
    return false;
  }
};

// Send welcome email via SendGrid
const sendWelcomeEmailTwilio = async (email, firstName) => {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  SendGrid API key not set');
      return false;
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email }],
          subject: 'Welcome to Elite Bet! 🎉'
        }],
        from: {
          email: process.env.FROM_EMAIL || 'noreply@elitebet.com',
          name: 'Elite Bet'
        },
        content: [{
          type: 'text/html',
          value: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
                .content { padding: 40px 30px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Welcome to Elite Bet!</h1>
                </div>
                <div class="content">
                  <p style="font-size: 18px;">Hi <strong>${firstName}</strong>,</p>
                  <p style="font-size: 16px;">Thank you for joining Elite Bet! We're thrilled to have you on board.</p>
                  <p style="font-size: 16px;">Start exploring our games and place your first bet today!</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://elitebet.com'}" class="button">Start Playing</a>
                  </div>
                  <p style="font-size: 14px; margin-top: 30px;">Best regards,<br><strong>The Elite Bet Team</strong></p>
                </div>
              </div>
            </body>
            </html>
          `
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid API error:', errorText);
      return false;
    }

    console.log(`✅ Welcome email sent successfully via SendGrid to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email via SendGrid:', error.message);
    return false;
  }
};

module.exports = {
  sendOTPSMS,
  sendOTPEmail: sendOTPEmailTwilio,
  sendWelcomeEmail: sendWelcomeEmailTwilio
};

