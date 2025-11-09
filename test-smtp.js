require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n🔍 Testing SMTP Configuration...\n');

// Show current config
console.log('📧 SMTP Configuration:');
console.log('  Host:', process.env.SMTP_HOST || 'NOT SET');
console.log('  Port:', process.env.SMTP_PORT || 'NOT SET');
console.log('  User:', process.env.SMTP_USER || 'NOT SET');
console.log('  Pass:', process.env.SMTP_PASSWORD ? '****' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET');
console.log('  From:', process.env.FROM_EMAIL || 'NOT SET');
console.log('  Secure:', process.env.SMTP_SECURE || 'NOT SET');
console.log('');

if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  console.error('❌ ERROR: SMTP_USER or SMTP_PASSWORD not set in .env file!');
  console.log('\n📝 Please add to your .env file:');
  console.log('SMTP_USER=your-email@gmail.com');
  console.log('SMTP_PASSWORD=your-app-password');
  console.log('');
  process.exit(1);
}

async function testSMTP() {
  try {
    console.log('🔌 Creating SMTP transporter...');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      debug: true, // Enable debug output
      logger: true // Enable logger
    });

    console.log('✅ Transporter created');
    console.log('');
    console.log('🔗 Testing connection to SMTP server...');
    
    // Verify connection
    await transporter.verify();
    
    console.log('✅ SMTP connection successful!');
    console.log('');
    console.log('📧 Sending test email...');
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"Elite Bet Test" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'SMTP Test - Elite Bet',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #10b981;">✅ SMTP Test Successful!</h2>
          <p>Your SMTP configuration is working correctly.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p>You can now send OTP emails to users.</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('');
    console.log('✨ Check your email inbox:', process.env.SMTP_USER);
    console.log('');
    console.log('🎉 SMTP is fully configured and working!');
    
  } catch (error) {
    console.error('\n❌ SMTP Test Failed!\n');
    console.error('Error:', error.message);
    console.error('');
    
    // Specific error messages
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication Failed:');
      console.error('  - Check if SMTP_USER is correct');
      console.error('  - Check if SMTP_PASSWORD is correct');
      console.error('  - For Gmail: Use App Password, not regular password');
      console.error('  - Enable 2-Step Verification first');
      console.error('');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('🌐 Connection Failed:');
      console.error('  - Check if SMTP_HOST is correct');
      console.error('  - Check if SMTP_PORT is correct (587 for TLS, 465 for SSL)');
      console.error('  - Check firewall/network settings');
      console.error('');
    } else if (error.code === 'ESOCKET') {
      console.error('🔌 Socket Error:');
      console.error('  - SMTP server might be blocking connection');
      console.error('  - Try port 587 or 465');
      console.error('  - Check if SSL/TLS settings are correct');
      console.error('');
    }
    
    console.error('💡 Quick Fixes:');
    console.error('  1. For Gmail: Generate new App Password');
    console.error('  2. Try port 587 with SMTP_SECURE=false');
    console.error('  3. Check .env file has correct values');
    console.error('  4. Restart server after changing .env');
    console.error('');
    
    process.exit(1);
  }
}

testSMTP();

