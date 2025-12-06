# 555Dating Build Notes

## 1. Snapshot Overview
- **Mission**: opinionated, straight-only dating MVP with selfie verification, admin-gated messaging, and Stripe-backed subscriptions.
- **Stack**: Express/Socket.IO + SQLite (`server/`), Vite React SPA (`client/`), Expo/Firebase mobile app (`mobile/`).
- **Key flows**: email+password auth with JWT cookies, optional Google OAuth, selfie upload/review, likes/matches/chat, Stripe checkout for men-only messaging, push/email notifications, admin moderation dashboards.
- **Data stores**: SQLite for server (see `server/src/db.js` schema) and Firebase Auth/Firestore/Storage for the mobile app.

## 2. Repo Layout & Responsibilities
| Path | Purpose |
| --- | --- |
| `server/` | Express API, Socket.IO chat, Stripe billing, selfie upload pipeline, admin endpoints, SQLite schema + migrations in code. |
| `client/` | Vite React SPA with routing for auth, swipe/discover, messaging, billing, safety center, and admin consoles. |
| `mobile/` | Expo Router app that talks to Firebase directly (auth/messaging/moderation queues) and shares feature-flag + moderation helpers. |
| `set-env.ps1` | Loads Firebase keys + admin emails into the shell session (used by server + mobile). |
| `start-all.ps1` | Convenience runner to boot server and client (and optionally Expo) together. |
| `README.md`, `DEPLOY_NOW.md`, `RENDER_*` / `NETLIFY_*` docs | Deployment & ops guides already authored; reference as needed. |

## 3. Server Highlights (`server/`)
- **Entry point**: `src/index.js` (~73 KB) wires Express, rate limits, JWT auth middleware, email sending (Nodemailer), Google OAuth (`google-auth-library`), Stripe subscription logic, web push, selfie upload processing (Multer + Sharp), and Socket.IO events.
- **Database**: `better-sqlite3` with schema defined/ensured inside `src/db.js`. Includes tables for users, likes, messages, blocks, passes, super likes, swipe history, push subscriptions, password resets, and abuse reports.
- **Environment**: template in `server/.env.example` covers auth secrets, Stripe, Google OAuth, SMTP, push VAPID, storage paths, cookie policy, boost/rewind tuning, etc.
- **Uploads**: stored under `server/uploads` by default; configurable via `UPLOADS_PATH`. Static served at `/uploads`.
- **Moderator endpoints**: extensive `/api/admin/*` routes for user, selfie, and report management (see README enumeration).
- **Billing**: `stripe` SDK handles Checkout sessions and webhook updates for `canSeeLikedMe` + subscription IDs.

## 4. Client Highlights (`client/`)
- **Stack**: React 18 + React Router DOM 6 + Socket.IO client. Minimal dependencies to keep bundle light.
- **Key routes/components**: pages for login/register, discover/swipe, matches/messages, billing, admin dashboards, selfie review queues, visibility & safety center, onboarding wizard, etc. (see `client/src/pages/*.jsx`).
- **Config**: `.env.example` exposes `VITE_API_BASE`. `netlify.toml` proxies `/api/*` to the Render backend for cookie sharing.
- **Build**: `npm run dev` (Vite), `npm run build` for production. Output in `client/dist/`.

## 5. Mobile Highlights (`mobile/`)
- **Stack**: Expo SDK 51 + React Native 0.74, Firebase client SDK (Auth/Firestore/Storage).
- **Config**: `app.config.ts` pulls Firebase credentials + `AI_ASSIST_ENABLED` from env (populated via `set-env.ps1`). Bundle metadata (icons, splash, scheme) already set.
- **Structure**: contexts for auth/feature flags, hooks for loading matches/messages/profiles, services for moderation + storage, admin selfie review queue component to give moderators mobile tooling.
- **Scripts**: `npm run start` (Expo dev server), `npm run android/ios`. ESLint + TS config included.

## 6. Dev Environment Workflow
1. Install deps per package (`npm install --prefix server|client|mobile`).
2. Run `.\\set-env.ps1` (first run might need `Set-ExecutionPolicy`). This injects Firebase + `ADMIN_EMAILS` into the session.
3. Start everything via `.\\start-all.ps1` or run each package manually (`npm run dev` in `server` + `client`, `npm run start` in `mobile`).
4. Access: API on `http://localhost:4000`, SPA on `http://localhost:5173`, Expo host CLI prints tunnel/QR.

## 7. Deployment Status
- **Backend**: documented Render free-tier workflow (`README.md`, `RENDER_*` docs). Requires manual env var entry + optional persistent disk for SQLite.
- **Web**: Netlify front-end configured with `client/netlify.toml`; set `VITE_API_BASE` to the Render URL.
- **Mobile**: Ship via Expo Go (QR sharing) or `eas build`. Ensure Firebase keys + feature flags included.

## 8. Risks & Next Steps
- **SQLite limitations**: good for prototype; migration to managed SQL needed before scale (see README note).
- **Uploads on disk**: move to S3/GCS in production to avoid Render ephemeral storage issues.
- **Email transport**: currently console fallback unless SMTP creds provided; ensure production secrets set.
- **Security knobs**: review rate-limit thresholds, cookie settings (`COOKIE_SECURE`, `CORS_ORIGIN`) before exposing publicly.
- **Mobile parity**: mobile app bypasses REST API (direct Firebase). Keep data model parity in sync or converge on a single source of truth.
- **Testing**: no automated test suites yet (unit/e2e). Consider adding Jest + Playwright/Cypress plus Expo unit tests.
- **Free launch message throttle (IMPLEMENTED)**:
  - ✅ Public chat rooms completely removed (only 1-on-1 private messaging available).
  - ✅ DM throttles for non-subscribed men: max 2 consecutive messages per recipient until reply (`MAX_CONSECUTIVE_MESSAGES`); max 5 unique recipients per hour (`MAX_HOURLY_RECIPIENTS`). Women, moderators, and paying subscribers are exempt.
  - ✅ Client displays helpful 429 error messages with time remaining; server logs `[THROTTLE]` events to tune thresholds.
  - ✅ Additional protections: block prevention, suspended/hidden user checks, database indexes for performance.
  - See `CHAT_THROTTLE.md` for configuration and testing details.

## 8.5. Pre-Launch Readiness & Next Steps

### Current Anti-Spam Status ✅
The application has strong spam prevention already implemented:
- **Email Verification** (IMPLEMENTED): Required for swiping, liking, messaging, and discovery. Admins auto-verified.
  - Verification email sent on registration with unique token
  - Clear banner on profile page for unverified users with resend option
  - `/verify-email` endpoint validates token and marks email as verified
  - `/resend-verification` allows users to request new verification email
  - Blocks core features until verified (server/src/index.js:962, 1001, 1155, 1227, 1266)
- **Selfie Verification**: Required for discovery, swiping, liking, and messaging (server/src/index.js enforces at all core endpoints)
- **Age Verification**: Must be 18+ enforced at registration
- **Terms Acceptance**: Required at registration with timestamp
- **Message Throttling**: Non-subscribed men limited to 2 consecutive messages until reply, 5 unique recipients/hour
- **Rate Limiting**: Auth endpoints protected from brute force
- **Block System**: Users cannot message those who blocked them
- **Suspended/Hidden Checks**: Cannot message banned or hidden users
- **Banned Word Filter**: Enhanced filter with 35+ terms for scams, off-platform solicitation, sex work, MLM schemes
- **Photo Moderation**: Admin queue for reviewing user-uploaded photos (approve/reject with reasons)

### Stripe Setup (Post-LLC Formation)
**Required Steps:**
1. Form LLC and obtain EIN
2. Open Stripe account with LLC business information
3. Create subscription product in Stripe Dashboard:
   - Recommended: "$9.99/month - Premium Messaging Access"
   - Optional: Annual plan with discount (e.g., "$89.99/year")
4. Obtain and configure in `server/.env`:
   ```
   STRIPE_SECRET_KEY=sk_live_...           # From Stripe Dashboard → Developers → API Keys
   STRIPE_WEBHOOK_SECRET=whsec_...         # After creating webhook endpoint
   STRIPE_PRICE_MENS_MONTHLY=price_...     # Copy from product price ID
   STRIPE_PRICE_MENS_YEARLY=price_...      # Optional yearly price ID
   ```
5. Configure webhook endpoint in Stripe: `https://yourdomain.com/api/billing/webhook`
6. Test payment flow in Stripe test mode before going live

**Stripe Approval Tips:**
- Emphasize "relationship-focused" not "hookup app" in business description
- Mention selfie verification and human moderation in ToS
- Have clear refund policy and Terms of Service ready
- Some processors flag dating apps - highlight safety features

### Production Environment Checklist
**Critical Security Configs** (update `server/.env` before deploy):
```bash
# Generate strong secret:
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

# Lock down CORS to your domain:
CORS_ORIGIN=https://yourdomain.com

# Enable secure cookies (HTTPS only):
COOKIE_SECURE=true
COOKIE_SAMESITE=strict

# Set correct URLs:
APP_BASE_URL=https://yourdomain.com
STRIPE_SUCCESS_URL=https://yourdomain.com/billing/success
STRIPE_CANCEL_URL=https://yourdomain.com/billing/cancel
```

**Email Sending** (Recommended):
Currently falls back to console logs. For password resets to work:
```bash
# Option 1: SendGrid (100 emails/day free)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
SMTP_FROM=noreply@yourdomain.com

# Option 2: AWS SES (cheap, scalable)
# Option 3: Mailgun, Postmark, etc.
```

**Storage Migration** (Before Scale):
- Move `UPLOADS_PATH` from local disk to S3/GCS/Cloudinary
- Update `primaryPhotoUrl()` helper to generate CDN URLs
- Render ephemeral disk is not persistent across deploys

### Optional Pre-Launch Improvements

**CAPTCHA on Registration** (Optional)
- Prevents automated bot signups
- reCAPTCHA v3 is invisible (no user friction)
- **Trade-off**: Adds dependency and setup complexity
- **Recommendation**: Monitor signup patterns; add if you see bot activity

**Message Content Moderation** (Low Priority)
- Current banned words: `scam`, `fraud` (server/src/index.js:1176)
- **Options**:
  - Expand banned word list manually
  - Integrate Perspective API (Google) for toxicity detection
  - Add profanity filter library
- **Recommendation**: Start with manual list, expand based on reports

### Branding & LLC Considerations

**Pre-Branding Checklist:**
1. **Domain Availability**: Check .com availability (preferred for credibility)
2. **Trademark Search**: Search USPTO.gov to avoid conflicts
3. **Social Handles**: Reserve Instagram, TikTok, Twitter/X handles early
4. **App Store Names**: Check Apple App Store and Google Play availability
5. **Stripe-Friendly Naming**: Avoid terms that trigger high-risk flags if possible

**LLC Formation Priorities:**
1. Choose business structure (LLC recommended for liability protection)
2. File with your state (online services: LegalZoom, Northwest, Incfile)
3. Obtain EIN from IRS (free, instant online)
4. Open business bank account
5. Set up Stripe business account with EIN

**SEO Considerations:**
- Descriptive > Clever (e.g., "SafeDate" vs. "555Dating")
- Include location if targeting specific region (e.g., "Dallas Singles")
- Avoid generic terms (hard to rank for "dating app")

### Post-Launch Monitoring

**Week 1 Priorities:**
1. Monitor server logs for `[THROTTLE]` events - tune `MAX_CONSECUTIVE_MESSAGES` and `MAX_HOURLY_RECIPIENTS` if needed
2. Watch Stripe webhook logs for payment failures
3. Check selfie moderation queue daily
4. Monitor user reports in `/admin`
5. Track signup-to-verified ratio (selfie approval rate)

**Metrics to Track:**
- Daily Active Users (DAU)
- Selfie approval rate (should be >80% if legitimate users)
- Message throttle hit rate (high = too restrictive, low = potential spam)
- Subscription conversion rate (signups → paid)
- Churn rate (cancelled subscriptions)

**Cost Optimization:**
- Render free tier: 750 hours/month (good for ~31 days continuous)
- Netlify free tier: 100GB bandwidth/month
- Monitor and upgrade when needed (traffic spikes, storage growth)
- Consider Cloudflare for CDN + DDoS protection (free tier available)

**Recommended Tooling:**
- Error tracking: Sentry (free tier) or LogRocket
- Analytics: Plausible (privacy-friendly) or Google Analytics
- Uptime monitoring: UptimeRobot (free for 50 monitors)
- Performance: Lighthouse CI for web vitals

## 9. Handy References
- Setup & deployment: `README.md`, `DEPLOY_NOW.md`, `RENDER_*`, `NETLIFY_ENV_VARS.md`.
- Environment templates: `server/.env.example`, `client/.env.example`, `set-env.ps1`.
- Admin tooling scripts: `server/promote-admin.js`, `server/promote-admin.ps1`.

Use this file as the single hand-off artifact for AI agents; update sections as architecture or scope evolves.
