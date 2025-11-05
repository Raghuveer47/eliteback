/**
 * Email Service - Supports multiple providers
 * Choose one: SendGrid, Nodemailer (Gmail/SMTP), or Console (Development)
 */

// Uncomment the provider you want to use:

// Option 1: SendGrid (Recommended for production)
async function sendEmailWithSendGrid(to, subject, html) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to,
    from: process.env.FROM_EMAIL || 'noreply@spinzos.com',
    subject,
    html
  };
  
  await sgMail.send(msg);
  console.log(`✅ Email sent via SendGrid to: ${to}`);
}

// Option 2: Nodemailer with Gmail
async function sendEmailWithGmail(to, subject, html) {
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
    }
  });
  
  const mailOptions = {
    from: process.env.FROM_EMAIL || process.env.GMAIL_USER,
    to,
    subject,
    html
  };
  
  await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent via Gmail to: ${to}`);
}

// Option 3: Nodemailer with Custom SMTP
async function sendEmailWithSMTP(to, subject, html) {
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
  
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to,
    subject,
    html
  };
  
  await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent via SMTP to: ${to}`);
}

// Option 4: Console only (Development)
async function sendEmailToConsole(to, subject, html) {
  console.log('\n' + '='.repeat(80));
  console.log('📧 EMAIL (Development Mode - Not Actually Sent)');
  console.log('='.repeat(80));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('─'.repeat(80));
  console.log(html);
  console.log('='.repeat(80) + '\n');
}

// Main email sender - Choose your provider here
async function sendEmail(to, subject, html) {
  try {
    const provider = process.env.EMAIL_PROVIDER || 'console';
    
    switch (provider.toLowerCase()) {
      case 'sendgrid':
        await sendEmailWithSendGrid(to, subject, html);
        break;
      
      case 'gmail':
        await sendEmailWithGmail(to, subject, html);
        break;
      
      case 'smtp':
        await sendEmailWithSMTP(to, subject, html);
        break;
      
      case 'console':
      default:
        await sendEmailToConsole(to, subject, html);
        break;
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
}

// Email Templates
function getPasswordResetEmail(resetLink, email) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>We received a request to reset the password for your Spinzos account (<strong>${email}</strong>).</p>
          <p>Click the button below to reset your password:</p>
          <center>
            <a href="${resetLink}" class="button">Reset My Password</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px; word-break: break-all;">
            ${resetLink}
          </p>
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link expires in <strong>1 hour</strong></li>
              <li>This link can only be used <strong>once</strong></li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 Spinzos. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  getPasswordResetEmail
};

