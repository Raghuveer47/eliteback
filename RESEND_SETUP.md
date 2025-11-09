# 📧 Resend Email Setup (FREE & EASY!)

## Why Resend?
- ✅ **100 emails/day FREE** (3,000/month)
- ✅ **No credit card required**
- ✅ **Simple API** (no SMTP complexity!)
- ✅ **Works on all platforms** (Render, Vercel, etc.)
- ✅ **2-minute setup**

---

## 🚀 Quick Setup (2 Minutes)

### Step 1: Create Free Resend Account
1. Go to: **https://resend.com**
2. Click "Start Building"
3. Sign up with your email (or GitHub)
4. No credit card needed!

### Step 2: Get API Key
1. After signup, you'll see the dashboard
2. Click on "API Keys" in sidebar
3. Click "Create API Key"
4. Name it: "Elite Bet Production"
5. Copy the API key (starts with `re_`)

### Step 3: Add to Production Environment

**On Render:**
1. Go to your backend service
2. Click "Environment" tab
3. Add new variable:
   ```
   Name: RESEND_API_KEY
   Value: re_xxxxxxxxxxxxx (paste your key)
   ```
4. Click "Save Changes"

**On Vercel:**
1. Go to project settings
2. Environment Variables
3. Add: `RESEND_API_KEY` = `re_xxxxxxxxxxxxx`

### Step 4: Optional - Verify Domain (for custom from address)
If you want emails from your own domain (e.g., `noreply@elitebet.com`):
1. In Resend dashboard, click "Domains"
2. Add your domain
3. Add DNS records (TXT, CNAME)
4. Update `FROM_EMAIL` to `Elite Bet <noreply@yourdomain.com>`

**Or use the default:** `onboarding@resend.dev` (works immediately!)

### Step 5: Redeploy Backend
Render will auto-redeploy when you save environment variables, or click "Manual Deploy"

---

## ✅ That's It!

Your OTP emails will now be sent via Resend!

---

## 🧪 Testing

After deployment, test:
1. Go to forgot password page
2. Enter an email
3. Check inbox - you should receive OTP email!
4. Check backend logs for: `✅ OTP email sent successfully via Resend to user@example.com`

---

## 🆚 Comparison

| Feature | Resend | Gmail SMTP | SendGrid |
|---------|--------|------------|----------|
| Free tier | 100/day | Limited | 100/day |
| Setup time | 2 min | 10 min | 5 min |
| Credit card | ❌ No | ❌ No | ⚠️ Sometimes |
| API simplicity | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Production ready | ✅ Yes | ⚠️ Maybe | ✅ Yes |

---

## 🔧 Environment Variables Needed

```env
# Only one needed for Resend!
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Optional - custom from address (after domain verification)
FROM_EMAIL=Elite Bet <noreply@yourdomain.com>
```

---

## 📝 Alternative: Brevo (300 emails/day FREE)

If you prefer Brevo instead:

1. Go to: **https://www.brevo.com**
2. Sign up free
3. Get SMTP credentials from Settings → SMTP & API
4. Use these env vars:
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-brevo-email@gmail.com
   SMTP_PASSWORD=your-brevo-smtp-key
   ```

---

## 🎯 Recommendation

**Use Resend!** It's:
- Simpler (no SMTP config)
- More reliable
- Better for production
- Easier to debug
- Free tier is generous

Just get the API key from resend.com and add it to Render. Done! 🎉

