# 555Dating Production Deployment Guide

This guide will walk you through deploying your dating app to production using Render (backend) and Netlify (frontend).

## Overview
- **Frontend**: https://555dating.netlify.app (Netlify)
- **Backend**: https://five55dating.onrender.com (Render)

---

## Step 1: Set Up Stripe (Payment Processing)

### 1.1 Get Your Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. You'll see two keys:
   - **Publishable key** (starts with `pk_live_...`) - NOT needed for backend
   - **Secret key** (starts with `sk_live_...`) - Click "Reveal test key" then switch to Live mode
3. Copy your **Secret key** (sk_live_...) - you'll need this for `STRIPE_SECRET_KEY`

⚠️ **Important**: Make sure you're in **Live mode** (toggle in top right) for production, or **Test mode** for testing.

### 1.2 Create Subscription Products

1. Go to https://dashboard.stripe.com/products
2. Click **"+ Add Product"**

**Create Product #1: Men's Monthly Subscription**
- Name: `555Dating - Men's Monthly`
- Description: `Monthly subscription for male users`
- Pricing:
  - Click "Add pricing"
  - Price: Enter your amount (e.g., $9.99)
  - Billing period: `Monthly`
  - Click "Add pricing"
- After creation, copy the **Price ID** (starts with `price_...`)
- Save this as `STRIPE_PRICE_MENS_MONTHLY`

**Create Product #2: Men's Yearly Subscription**
- Name: `555Dating - Men's Yearly`
- Description: `Yearly subscription for male users (discounted)`
- Pricing:
  - Click "Add pricing"
  - Price: Enter your amount (e.g., $99.99)
  - Billing period: `Yearly`
  - Click "Add pricing"
- After creation, copy the **Price ID** (starts with `price_...`)
- Save this as `STRIPE_PRICE_MENS_YEARLY`

### 1.3 Set Up Stripe Webhook (We'll do this after deploying to Render)

---

## Step 2: Set Up Gmail for Sending Emails

### 2.1 Enable 2-Factor Authentication (if not already enabled)

1. Go to https://myaccount.google.com/security
2. Under "How you sign in to Google", click "2-Step Verification"
3. Follow the steps to enable it

### 2.2 Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. In "Select app" dropdown, choose "Mail"
3. In "Select device" dropdown, choose "Other (Custom name)"
4. Type "555Dating Server"
5. Click "Generate"
6. Google will show you a 16-character password (format: xxxx xxxx xxxx xxxx)
7. **Copy this password** - you'll use it for `SMTP_PASS`
8. Click "Done"

⚠️ **Important**: Save this password immediately - you won't be able to see it again!

---

## Step 3: Deploy Backend to Render

### 3.1 Update Your Render Service

1. Go to https://dashboard.render.com/
2. Click on your backend service (five55dating)
3. Go to the "Environment" tab

### 3.2 Add Environment Variables

Click "Add Environment Variable" for each of these:

**Security & CORS:**
```
JWT_SECRET=f2402f570e4f9f64c453d576c18e4139e9ebc1811e83e0ff39cba09b28f0b7f3141f843df19ac447db3118e11fb0f00e7602809c880132e14869a640f38b8230
CORS_ORIGIN=https://555dating.netlify.app
COOKIE_SAMESITE=none
COOKIE_SECURE=true
```

**Admin & App URLs:**
```
ADMIN_EMAILS=wbboykins@gmail.com
APP_BASE_URL=https://555dating.netlify.app
PASSWORD_RESET_URL=https://555dating.netlify.app/reset-password
PASSWORD_RESET_EXPIRY_MINUTES=30
```

**Email (Gmail SMTP):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=wbboykins@gmail.com
SMTP_PASS=[YOUR 16-CHARACTER APP PASSWORD FROM STEP 2]
SMTP_FROM=555Dating <wbboykins@gmail.com>
```

**Stripe:**
```
STRIPE_SECRET_KEY=[sk_live_... from Step 1.1]
STRIPE_PRICE_MENS_MONTHLY=[price_... from Step 1.2]
STRIPE_PRICE_MENS_YEARLY=[price_... from Step 1.2]
STRIPE_SUCCESS_URL=https://555dating.netlify.app/billing/success
STRIPE_CANCEL_URL=https://555dating.netlify.app/billing/cancel
```

**Leave empty for now (we'll set up webhooks next):**
```
STRIPE_WEBHOOK_SECRET=
```

**Features:**
```
SUPERLIKE_DAILY_LIMIT=1
BOOST_MINUTES=15
```

### 3.3 Deploy

1. Click "Save Changes"
2. Render will automatically redeploy your service
3. Wait for deployment to complete (check the "Logs" tab)

---

## Step 4: Set Up Stripe Webhook

Now that your backend is deployed, we need to tell Stripe where to send payment events.

### 4.1 Create Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"+ Add endpoint"**
3. Endpoint URL: `https://five55dating.onrender.com/api/billing/webhook`
4. Description: `555Dating payment events`
5. Under "Select events to listen to", click "+ Select events"
6. Search for and select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. Click "Add events"
8. Click "Add endpoint"

### 4.2 Get Webhook Signing Secret

1. After creating the webhook, click on it to open details
2. Under "Signing secret", click "Reveal"
3. Copy the secret (starts with `whsec_...`)
4. Go back to Render dashboard → Your service → Environment tab
5. Add/update environment variable:
   ```
   STRIPE_WEBHOOK_SECRET=[whsec_... you just copied]
   ```
6. Save changes (Render will redeploy)

---

## Step 5: Deploy Frontend to Netlify

### 5.1 Update Build Settings

1. Go to https://app.netlify.com/
2. Click on your site (555dating)
3. Go to "Site configuration" → "Environment variables"

### 5.2 Add Environment Variables

Click "Add a variable" → "Add a single variable":

```
Key: VITE_API_BASE
Value: https://five55dating.onrender.com
```

```
Key: VITE_SOCKET_BASE
Value: https://five55dating.onrender.com
```

### 5.3 Deploy

**Option A: Deploy from Local**
```bash
cd client
npm run build
netlify deploy --prod
```

**Option B: Deploy from Git (Recommended)**
1. Make sure your changes are committed to git
2. Push to your repository
3. Netlify will auto-deploy if connected to your repo

---

## Step 6: Test Your Production Deployment

### 6.1 Test Basic Functionality
1. Visit https://555dating.netlify.app
2. Try registering a new account
3. Check if you receive the welcome email
4. Upload photos
5. Try the swipe functionality

### 6.2 Test Password Reset
1. Click "Forgot Password"
2. Enter your email
3. Check your inbox for reset email
4. Click the link and reset password

### 6.3 Test Stripe Payment (Use Test Mode First!)

⚠️ **Important**: Test in Stripe Test Mode first!

1. In Stripe Dashboard, switch to "Test mode" (toggle in top right)
2. Create test products with test price IDs
3. Update Render environment variables with test keys:
   - `STRIPE_SECRET_KEY` → use `sk_test_...`
   - `STRIPE_PRICE_MENS_MONTHLY` → use test `price_...`
   - `STRIPE_PRICE_MENS_YEARLY` → use test `price_...`
4. Use test card: `4242 4242 4242 4242`, any future date, any CVC
5. Complete a test purchase
6. Check Stripe Dashboard → Payments to see the test payment

**After testing succeeds:**
1. Switch Stripe back to Live mode
2. Update Render with live keys (`sk_live_...` and live price IDs)
3. Redeploy

---

## Step 7: Optional Enhancements

### 7.1 Web Push Notifications

If you want push notifications:

1. Generate VAPID keys:
   ```bash
   cd server
   npx web-push generate-vapid-keys
   ```

2. Add to Render environment variables:
   ```
   VAPID_PUBLIC_KEY=[public key from above]
   VAPID_PRIVATE_KEY=[private key from above]
   VAPID_SUBJECT=mailto:wbboykins@gmail.com
   ```

### 7.2 Google OAuth Sign-In

If you want Google sign-in:

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://five55dating.onrender.com/api/auth/google/callback`
6. Add to Render environment variables:
   ```
   GOOGLE_CLIENT_ID=[your client ID]
   GOOGLE_CLIENT_SECRET=[your client secret]
   GOOGLE_REDIRECT_URI=https://five55dating.onrender.com/api/auth/google/callback
   GOOGLE_SUCCESS_REDIRECT=https://555dating.netlify.app/auth/google/callback
   GOOGLE_FAILURE_REDIRECT=https://555dating.netlify.app/auth/google/callback
   ```

---

## Troubleshooting

### CORS Errors
- Make sure `CORS_ORIGIN` in Render matches exactly: `https://555dating.netlify.app`
- No trailing slash!
- Check browser console for specific error messages

### Email Not Sending
- Verify Gmail app password is correct (16 characters, no spaces)
- Check Render logs for SMTP errors
- Make sure 2FA is enabled on your Google account

### Stripe Webhook Failures
- Check webhook endpoint URL is exactly: `https://five55dating.onrender.com/api/billing/webhook`
- Verify `STRIPE_WEBHOOK_SECRET` is set in Render
- Check Render logs when making a test payment
- In Stripe Dashboard → Webhooks, click your webhook to see delivery attempts

### Database Issues
- Render provides persistent disk storage
- Make sure your Render plan includes persistent storage
- Database file will be at the path Render specifies

### Cookie/Session Issues
- Verify `COOKIE_SECURE=true` is set
- Verify `COOKIE_SAMESITE=none` is set
- Both frontend and backend must use HTTPS

---

## Files Created

I've created these files to help you:

1. **server/.env.production** - Template with all production environment variables
2. **client/.env.production** - Frontend environment variables for Netlify

You can reference these files when setting up environment variables in Render and Netlify dashboards.

---

## Quick Reference: Environment Variables Checklist

### Render (Backend)
- [ ] JWT_SECRET
- [ ] CORS_ORIGIN
- [ ] COOKIE_SAMESITE=none
- [ ] COOKIE_SECURE=true
- [ ] ADMIN_EMAILS
- [ ] APP_BASE_URL
- [ ] PASSWORD_RESET_URL
- [ ] SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_PRICE_MENS_MONTHLY
- [ ] STRIPE_PRICE_MENS_YEARLY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] STRIPE_SUCCESS_URL
- [ ] STRIPE_CANCEL_URL

### Netlify (Frontend)
- [ ] VITE_API_BASE
- [ ] VITE_SOCKET_BASE

---

## Next Steps

1. ✅ Follow Step 1 to set up Stripe
2. ✅ Follow Step 2 to set up Gmail
3. ✅ Follow Step 3 to configure Render
4. ✅ Follow Step 4 to set up Stripe webhook
5. ✅ Follow Step 5 to deploy to Netlify
6. ✅ Follow Step 6 to test everything

Good luck with your deployment! 🚀
