# Quick Production Deployment (Without Stripe)

Let's get your app live! We'll add Stripe payments later.

---

## Step 1: Set Up Gmail for Sending Emails (2 minutes)

Your app needs to send password reset emails and notifications.

### Get Gmail App Password

1. **Enable 2-Factor Authentication** (if not already enabled):
   - Go to https://myaccount.google.com/security
   - Under "How you sign in to Google", enable "2-Step Verification"

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select app: **Mail**
   - Select device: **Other (Custom name)** → type "555Dating"
   - Click **Generate**
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
   - **Save this immediately** - you won't see it again!

✅ **You'll need this password for Step 2**

---

## Step 2: Configure Render Environment Variables

1. Go to https://dashboard.render.com/
2. Click on your service: **five55dating**
3. Click the **"Environment"** tab
4. Click **"Add Environment Variable"** for each variable below

### You need to add exactly 13 variables. Copy these EXACTLY (update the SMTP_PASS with your Gmail app password):

**Security & CORS:**
```
JWT_SECRET
f2402f570e4f9f64c453d576c18e4139e9ebc1811e83e0ff39cba09b28f0b7f3141f843df19ac447db3118e11fb0f00e7602809c880132e14869a640f38b8230
```

```
CORS_ORIGIN
https://555dating.netlify.app
```

```
COOKIE_SAMESITE
none
```

```
COOKIE_SECURE
true
```

**Admin & URLs:**
```
ADMIN_EMAILS
wbboykins@gmail.com
```

```
APP_BASE_URL
https://555dating.netlify.app
```

```
PASSWORD_RESET_URL
https://555dating.netlify.app/reset-password
```

**Email Settings (Gmail):**
```
SMTP_HOST
smtp.gmail.com
```

```
SMTP_PORT
587
```

```
SMTP_SECURE
false
```

```
SMTP_USER
wbboykins@gmail.com
```

```
SMTP_PASS
[YOUR 16-CHARACTER APP PASSWORD FROM STEP 1]
```

```
SMTP_FROM
555Dating <wbboykins@gmail.com>
```

**Feature Settings:**
```
SUPERLIKE_DAILY_LIMIT
1
```

```
BOOST_MINUTES
15
```

```
PASSWORD_RESET_EXPIRY_MINUTES
30
```

### After adding all variables:
1. Click **"Save Changes"**
2. Render will automatically redeploy (takes ~2-3 minutes)
3. Watch the "Logs" tab to see deployment progress

---

## Step 3: Deploy Frontend to Netlify

### Configure Environment Variables

1. Go to https://app.netlify.com/
2. Click on your site: **555dating**
3. Go to **Site configuration** → **Environment variables**
4. Click **"Add a variable"** → **"Add a single variable"**

Add these two variables:

```
Key: VITE_API_BASE
Value: https://five55dating.onrender.com
```

```
Key: VITE_SOCKET_BASE
Value: https://five55dating.onrender.com
```

### Deploy Options

**Option A: Manual Deploy from Local**
```bash
cd client
npm run build
npx netlify deploy --prod
```

**Option B: Auto-Deploy from Git (Recommended)**
1. Commit your recent changes:
   ```bash
   git add .
   git commit -m "Production configuration updates"
   git push
   ```
2. Netlify will auto-deploy if connected to your repo
3. Wait ~1-2 minutes for build to complete

---

## Step 4: Test Your Deployment

### 4.1 Check Backend Health
1. Visit: https://five55dating.onrender.com/
2. You should see some response (might be "Cannot GET /")
3. Check Render logs for any errors

### 4.2 Test Frontend
1. Visit: https://555dating.netlify.app
2. You should see your app loading

### 4.3 Test Registration
1. Click "Register" or "Sign Up"
2. Create a test account
3. Check if registration works

### 4.4 Test Password Reset Email
1. Click "Forgot Password"
2. Enter your email (wbboykins@gmail.com)
3. Check your Gmail inbox
4. You should receive a password reset email
5. Click the link to verify it works

### 4.5 Test Core Features
- ✅ Upload photos
- ✅ Update profile
- ✅ Browse users
- ✅ Swipe functionality
- ✅ Matches
- ✅ Messaging

---

## Troubleshooting

### "CORS Error" in Browser Console
**Fix:**
- Verify `CORS_ORIGIN` in Render is exactly: `https://555dating.netlify.app`
- No trailing slash
- Save and redeploy

### Emails Not Sending
**Fix:**
- Check Gmail app password is correct (16 chars, no spaces)
- Verify 2FA is enabled on Google account
- Check Render logs for SMTP errors

### "Cannot connect to server"
**Fix:**
- Verify Render service is running (check dashboard)
- Check `VITE_API_BASE` in Netlify matches: `https://five55dating.onrender.com`
- Clear browser cache

### Database Issues
**Fix:**
- Render free tier: Database resets when service sleeps
- Upgrade to paid plan for persistent disk storage
- Or use external database (PostgreSQL)

### Cookies/Sessions Not Working
**Fix:**
- Verify both `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` are set in Render
- Both frontend and backend must use HTTPS (which they do)

---

## What Works Now (Without Stripe)

✅ User registration & login
✅ Password reset emails
✅ Photo uploads
✅ Profile editing
✅ Swipe/like functionality
✅ Matching system
✅ Real-time messaging
✅ Super likes (free tier)
✅ Boosts (free tier)

## What We'll Add Later

⏳ Stripe payment processing
⏳ Men's subscription plans
⏳ Premium features paywall

---

## Quick Checklist

- [ ] Step 1: Get Gmail app password
- [ ] Step 2: Add all environment variables to Render
- [ ] Step 2: Save and wait for Render to redeploy
- [ ] Step 3: Add environment variables to Netlify
- [ ] Step 3: Deploy frontend
- [ ] Step 4: Test registration
- [ ] Step 4: Test password reset email
- [ ] Step 4: Test core features

---

## Next Steps After Deployment

Once everything is working:

1. **Test thoroughly** with real usage
2. **Monitor Render logs** for errors
3. **Set up custom domain** (optional)
4. **Add Stripe later** when ready for payments

Need help with any step? Let me know!
