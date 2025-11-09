# SMTP Email Setup for OTP

## Quick Setup (Free Gmail SMTP)

### 1. Install nodemailer
```bash
cd backend
npm install nodemailer
```

### 2. Configure Gmail for SMTP

#### Option A: Using App Password (Recommended)
1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", click on "2-Step Verification" (you must enable this first)
4. Scroll down and click on "App passwords"
5. Select "Mail" and "Other (Custom name)"
6. Enter "Elite Bet" as the name
7. Click "Generate"
8. Copy the 16-character password (no spaces)

#### Option B: Using Less Secure Apps (Not recommended)
1. Go to https://myaccount.google.com/lesssecureapps
2. Turn ON "Allow less secure apps"

### 3. Update Backend .env File

Create/update `/backend/.env` with:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
```

**Example:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=elitebet@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

### 4. Restart Backend Server

```bash
npm run dev
```

## Testing

1. Go to Forgot Password page
2. Enter your email
3. Check your email for OTP
4. If email doesn't work, OTP will still show in:
   - Browser toast notification
   - Browser console
   - Backend server logs

## Other Free SMTP Options

### SendGrid (Free tier: 100 emails/day)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun (Free tier: 5,000 emails/month first 3 months)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

## Troubleshooting

### Email not sending?
1. Check backend console for errors
2. Verify SMTP credentials are correct
3. Make sure 2-Step Verification is enabled (for Gmail)
4. Use App Password, not regular password
5. Check spam/junk folder

### OTP still working without email?
Yes! The system is designed to:
- Try sending email first
- If email fails, show OTP in console/toast
- This ensures password reset always works

## Production Recommendations

For production, consider:
1. **SendGrid** - Professional, reliable
2. **AWS SES** - Scalable, cheap ($0.10 per 1000 emails)
3. **Mailgun** - Developer-friendly
4. **Postmark** - Fast delivery

## Security Notes

- Never commit `.env` file to git
- Use App Passwords, not regular passwords
- Rotate credentials regularly
- Monitor email sending limits
- Use environment variables only

