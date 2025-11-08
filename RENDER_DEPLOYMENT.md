# Render Backend Deployment - Complete Environment Variables 🚀

## 🎯 Required Environment Variables for Render

Go to: https://dashboard.render.com → Your backend service → **Environment**

Add ALL of these variables:

---

## 1️⃣ Database Configuration

```env
MONGODB_URI=mongodb+srv://raghuveermustimalla_db_user:12112002@cluster0.n4363za.mongodb.net/elitebet?retryWrites=true&w=majority
```

---

## 2️⃣ JWT Configuration

```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

---

## 3️⃣ Admin Configuration

```env
ADMIN_EMAIL=admin@spinzos.com
ADMIN_PASSWORD=your_admin_password_here
```

---

## 4️⃣ CORS Configuration (IMPORTANT!)

```env
CORS_ORIGIN=https://spinzos.com,https://www.spinzos.com
```

**Both URLs needed** - with and without www!

---

## 5️⃣ Frontend URL (IMPORTANT - For Password Reset Links!)

```env
FRONTEND_URL=https://www.spinzos.com
```

This fixes the localhost URL in password reset emails!

---

## 6️⃣ Email Configuration (Choose ONE Option)

### Option A: SMTP (Gmail) - Recommended for Production

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=raghuveermustimalla@gmail.com
SMTP_PASSWORD=dapdtzbxfgpfqlwo
FROM_EMAIL=raghuveermustimalla@gmail.com
```

### Option B: No Email Provider (Console Mode)
```env
# Don't set EMAIL_PROVIDER
# Emails will be logged to Render console only
```

### Option C: SendGrid (For High Volume)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@spinzos.com
```

---

## 7️⃣ Environment

```env
NODE_ENV=production
PORT=10000
```

**Note**: Render automatically sets PORT, but you can include it

---

## 📋 Complete Environment Variables List:

Copy and paste these to Render (update values):

```
MONGODB_URI=mongodb+srv://raghuveermustimalla_db_user:12112002@cluster0.n4363za.mongodb.net/elitebet?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@spinzos.com
ADMIN_PASSWORD=your_admin_password
CORS_ORIGIN=https://spinzos.com,https://www.spinzos.com
FRONTEND_URL=https://www.spinzos.com
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=raghuveermustimalla@gmail.com
SMTP_PASSWORD=dapdtzbxfgpfqlwo
FROM_EMAIL=raghuveermustimalla@gmail.com
NODE_ENV=production
```

---

## 🚨 Critical Variables That Were Missing:

### 1. `FRONTEND_URL=https://www.spinzos.com`
**Without this**: Password reset links show `http://localhost:5173`  
**With this**: Links show `https://www.spinzos.com` ✅

### 2. `EMAIL_PROVIDER=smtp`
**Without this**: Emails only logged to console (not sent)  
**With this**: Emails actually sent via SMTP ✅

### 3. `CORS_ORIGIN` with both URLs
**Without this**: CORS errors when accessing from www or non-www  
**With this**: Works from both URLs ✅

---

## 📧 Email Troubleshooting:

### Check Render Logs:

After setting EMAIL_PROVIDER=smtp, check logs for:

**Success:**
```
📧 Auto-detected email provider: SMTP
✅ Email sent via SMTP to: user@example.com
Password reset email sent to: user@example.com
```

**Failure (Console mode):**
```
📧 No email credentials found - using console mode (emails not sent)
📧 EMAIL (Development Mode - Not Actually Sent)
```

If you see "Development Mode", it means email credentials aren't set!

---

## 🔧 How to Fix Email on Render:

### Method 1: Use Your Gmail (Easiest)

You already have Gmail credentials in your local `.env`. Add these EXACT variables to Render:

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=raghuveermustimalla@gmail.com
SMTP_PASSWORD=dapdtzbxfgpfqlwo
FROM_EMAIL=raghuveermustimalla@gmail.com
```

### Method 2: Use SendGrid (Scalable)

1. Sign up: https://signup.sendgrid.com/
2. Create API key
3. Verify sender email
4. Add to Render:
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@spinzos.com
```

---

## 🧪 Testing After Deployment:

### Test Password Reset Email:

```bash
# 1. Go to production site
https://www.spinzos.com/forgot-password

# 2. Enter email
raghuveermustimalla@gmail.com

# 3. Check your Gmail inbox
# 4. You should receive actual email ✅

# 5. Click reset link
# 6. Should go to: https://www.spinzos.com/reset-password-link?token=...
# (NOT localhost!)

# 7. Reset password
# 8. ✅ Works!
```

### Check Render Logs:

Go to Render dashboard → Logs tab → Look for:

```
✅ Auto-detected email provider: SMTP
✅ Email sent via SMTP to: raghuveermustimalla@gmail.com
```

---

## 📦 What Will Be Deployed:

### New Features:
- ✅ Forgot Password with one-time links
- ✅ Email service (multi-provider)
- ✅ Payment configuration (UPI/Bank)
- ✅ Payment admin panel
- ✅ User suspension (persistent)
- ✅ Real-time account monitoring

### API Endpoints Added:
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password-with-token`
- `GET /api/betting/payment-config`
- `POST /api/betting/admin/payment-config`
- `POST /api/betting/admin/update-user-status`

---

## ⚠️ Important Notes:

### Gmail App Password:
Your password `dapdtzbxfgpfqlwo` looks like a Gmail App Password ✅  
This should work on Render!

### SMTP Settings:
```
Host: smtp.gmail.com ✅
Port: 587 ✅
Secure: false ✅
```

### Environment:
```
NODE_ENV=production ✅
```

---

## 🔒 Security Checklist:

Before deploying:
- [ ] Change JWT_SECRET to a strong random string
- [ ] Verify ADMIN_PASSWORD is secure
- [ ] Check MongoDB URI has correct database name
- [ ] CORS_ORIGIN has both www and non-www URLs
- [ ] EMAIL_PROVIDER is set (smtp/sendgrid)
- [ ] FRONTEND_URL points to production (not localhost)

---

**After adding these variables, Render will auto-redeploy!**  
**Wait 2-3 minutes, then test forgot password!** 🎯

