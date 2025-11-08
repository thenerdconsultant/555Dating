# 555Dating

Opinionated full-stack prototype (Express + SQLite + Vite React + Expo) for straight-only matching, selfie verification, and admin-controlled messaging privileges.

## Local Development

Requirements: Node 18+, PowerShell (on Windows), Expo CLI (optional for mobile).

1. **Install dependencies once**
   ```powershell
   npm install --prefix server
   npm install --prefix client
   npm install --prefix mobile
   ```

2. **Load Firebase keys for this session**
   ```powershell
   cd C:\555Dating
   # First run may require: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\set-env.ps1            # add -Silent to suppress output
   ```

3. **Launch all apps at once**
   ```powershell
   .\start-all.ps1          # server + web client
   .\start-all.ps1 -Mobile  # server + web client + Expo tunnel
   ```

   Each command opens dedicated PowerShell windows titled **555Dating Server**, **555Dating Client**, and **555Dating Mobile**. Close a window or press <kbd>Ctrl</kbd>+<kbd>C</kbd> in it to stop that process.

4. **Manual start (optional)**
   ```powershell
   cd server  ; npm run dev    # http://localhost:4000
   cd client  ; npm run dev    # http://localhost:5173
   cd mobile  ; npm run start  # chooses device/tunnel
   ```

## Environment Variables

| Context | Key(s) | Notes |
|---------|--------|-------|
| Server | `ADMIN_EMAILS` | Comma-separated auto-moderator emails. |
| Server | `JWT_SECRET` | Session signing secret. |
| Server | `APP_BASE_URL` | Base URL for building email links and OAuth redirects (e.g. `https://app.example.com`). |
| Server | `PASSWORD_RESET_URL` (optional) | Override the reset link (defaults to `${APP_BASE_URL}/reset-password`). |
| Server | `PASSWORD_RESET_EXPIRY_MINUTES` (optional) | Minutes before password reset tokens expire (default `30`). |
| Server | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM` | Configure outbound email. Leave unset to log emails to the console in development. |
| Server | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Required for Google sign-in. Redirect URI must point to `${SERVER_URL}/api/auth/google/callback`. |
| Server | `GOOGLE_SUCCESS_REDIRECT`, `GOOGLE_FAILURE_REDIRECT`, `GOOGLE_LOGIN_HINT` (optional) | Control where the browser returns after OAuth and optionally prefill the Google account chooser. |
| Server | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Required for Stripe subscriptions. |
| Server | `STRIPE_PRICE_MENS_MONTHLY`, `STRIPE_PRICE_MENS_YEARLY` | Stripe Price IDs for the $10/mo and $100/yr plans. |
| Server | `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` | Client URLs Stripe redirects to after checkout (match `/billing/success` and `/billing/cancel`). |
| Server | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Optional Web Push credentials. |
| Client (Vite) | `VITE_API_BASE` | API origin (defaults to same origin). |
| Mobile (Expo) | `EXPO_PUBLIC_*` Firebase | Configured in `mobile/app.config.ts`/`set-env.ps1`. |

Templates: `server/.env.example`, `client/.env.example`. For local dev the PowerShell script writes Firebase keys and an `ADMIN_EMAILS` placeholder into your environment.

## Admin & Moderation

- Any email listed in `ADMIN_EMAILS` is promoted to moderator on first login (also grants subscription privileges). Adjust `set-env.ps1` and restart the session.
- Moderator-only REST endpoints (require authenticated cookie + moderator role):
  - `GET /api/admin/users` – list user summary, subscription, flags
  - `POST /api/admin/users/:id/subscription` body `{ "active": true/false }`
  - `POST /api/admin/users/:id/moderator` – promote
  - `DELETE /api/admin/users/:id/moderator` – demote
  - `POST /api/admin/users/:id/suspend` / `DELETE /api/admin/users/:id/suspend` – toggle account suspension
  - `POST /api/admin/users/:id/visibility` body `{ "hidden": true/false }`
  - `POST /api/admin/users/:id/approve-selfie` – clear `isFlagged` for a member’s selfie
  - `POST /api/admin/users/:id/reject-selfie` – mark a selfie as rejected with a reason
  - `GET /api/admin/verifications` – queue of pending selfie reviews
  - `GET /api/admin/reports` and `POST /api/admin/reports/:id/review` – triage abuse reports (dismiss, warn, suspend, ban)

- Member-facing safety endpoints:
  - `GET /api/blocks` / `DELETE /api/block/:id` – manage your blocked list
  - `GET /api/my-reports` – personal report history

## Account Controls & Billing

- Members can pause or hide their profile from **Profile → Visibility & safety**. Moderators can perform the same actions in the new `/admin` dashboard, alongside subscription and moderator toggles.
- Suspended users see a banner with a one-click resume button once reactivated. Admin suspensions use the same pipeline.
- Forgot-password lives at `/forgot` (email request) and `/reset-password` (token form). Configure SMTP variables for real delivery; otherwise links print to the server console.
- Google OAuth desktop flow: the web client calls `/api/auth/google/start`, then handles the callback at `/auth/google/callback` inside the SPA.
- Billing lives at `/billing` (men only). Stripe Checkout redirects back to `/billing/success` or `/billing/cancel`, and the webhook updates `canSeeLikedMe` plus Stripe IDs automatically.
- **Safety center**: the profile screen now surfaces verification status, report history, and your blocked list so users can manage safety settings without leaving the app. Moderators get new tabs for selfie approvals and report triage.

## Free Deployment Workflow

### 1. Backend (Render free web service)

1. Push the repository to GitHub.
2. In Render → “New Web Service” → connect repo, set **Root Directory** to `server`.
3. Build command `npm install`; start command `npm run start`.
4. Add environment variables from `set-env.ps1` plus the new integrations:
   - Core: `ADMIN_EMAILS`, `JWT_SECRET`, `APP_BASE_URL`, optional `VAPID_*`.
   - Email + resets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, optional `PASSWORD_RESET_URL`, `PASSWORD_RESET_EXPIRY_MINUTES`.
   - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (point to `https://<render-service>/api/auth/google/callback`), optional success/failure overrides.
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MENS_MONTHLY`, `STRIPE_PRICE_MENS_YEARLY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`.
   If you use SQLite, create a persistent disk and change `src/db.js` to point at the mounted path.
5. Deploy; note the service URL (e.g. `https://555dating.onrender.com`).

### 2. Web App (Netlify free tier)

1. In the repo root, replace `RENDER_SERVICE_URL` in `client/netlify.toml` with your Render URL.
2. Create a Netlify site → connect GitHub → base directory `client`, build `npm run build`, publish directory `dist`.
3. Add `VITE_API_BASE=https://555dating.onrender.com` (replace with your Render URL) and redeploy. Netlify’s redirect proxy handles `/api/*` calls so cookies continue to work. Match `APP_BASE_URL`, `STRIPE_SUCCESS_URL`, and `STRIPE_CANCEL_URL` on the server to this public web origin.

### 3. Mobile (Expo Go / EAS)

1. Ensure `set-env.ps1` contains correct Firebase keys and run it before `npm run start`.
2. Start Expo with tunnel so friends off-network can test:
   ```powershell
   cd mobile
   npm run start -- --tunnel
   ```
3. Share the QR code; testers install Expo Go and scan. For store-ready binaries, use `eas build --platform android/ios` (requires free Expo account).

### 4. Shareable Test Checklist

- ✅ Update `ADMIN_EMAILS` with your address → `. \set-env.ps1` → sign in → see Admin tab.
- ✅ Verify chat restrictions: only women or subscribed men can send/ create rooms.
- ✅ Use Render URL + Netlify front-end to exercise selfie verification, likes, admin APIs.
- ✅ From Expo Go, toggle plans and chat to test real devices.

## Notes

- SQLite lives at `server/src/dev.db` locally. Consider moving to PostgreSQL/MySQL for production.
- Image uploads stay on server disk under `server/uploads`; swap for S3/GCS in production.
- JWT cookies use `SameSite=Lax`; if front-end runs on another domain, rely on Netlify proxy or adjust CORS/cookie attributes.
- The mobile app talks directly to Firebase/Firestore (no REST dependency).

Happy testing! Update `set-env.ps1` or `.env` files whenever your Firebase keys or admin emails change. Use `start-all.ps1` to spin the whole stack up or adjust the deployment steps above to fit other free providers. 
