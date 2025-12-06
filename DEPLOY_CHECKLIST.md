# Deployment Checklist (Production)

Keep this handy when promoting to production to avoid env conflicts or test data leaks.

## 1) Do NOT seed fake users in production
- `server/seed-fake-users.js` and `seed-fake-users.ps1` are for local dev only. Don’t run them on Render/production.

## 2) Server environment (Render or similar)
- Core:  
  - `PORT=4000`  
  - `APP_BASE_URL=https://<your-web-url>`  
  - `CORS_ORIGIN=https://<your-web-url>,https://<your-netlify-url>` (comma-separated)  
  - `JWT_SECRET=<long-random>`  
  - `ADMIN_EMAILS=<comma list>` (first entry gets issue emails)  
- Cookies:  
  - `COOKIE_SECURE=true`  
  - `COOKIE_SAMESITE=none`
- Storage:  
  - `UPLOADS_PATH=/opt/render/project/data/uploads` (or S3/GCS if you wire it up)
- SMTP (for email/reset/issue alerts):  
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Stripe (when ready):  
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`  
  - `STRIPE_PRICE_MENS_MONTHLY`, `STRIPE_PRICE_MENS_YEARLY`  
  - `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` (point to your web app)
- Google OAuth (optional):  
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

Start command: `npm run start` with working dir `server/`.

## 3) Client environment (Netlify or similar)
- `VITE_API_BASE=https://<your-backend-url>`

Build: base dir `client`, build `npm run build`, publish `dist/`.

## 4) Health/QA after deploy
- Auth: register/login, verify email (SMTP), password reset.  
- Profile: selfie/photo upload persists across restart (checks `UPLOADS_PATH`).  
- Messaging: DM works; throttles for non-subscribed men enforced (2 consecutive, 5 recipients/hour).  
- Issue reporting: `/report-issue` submits; admins can fetch `/api/admin/issues`; issue emails arrive to first `ADMIN_EMAILS` if SMTP set.  
- Admin: selfie approvals, suspensions, hidden state, report reviews.  
- Stripe: if enabled, run a test Checkout + webhook.

## 5) Undo local-only settings before deploy
- Ensure `CORS_ORIGIN` is set to real domains (not empty/true).  
- Use HTTPS origins with `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`.  
- Remove any local `.env` overrides that point to localhost when building for prod.
