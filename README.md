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

| Context        | Key                       | Notes                                             |
|----------------|--------------------------|---------------------------------------------------|
| All            | `ADMIN_EMAILS`            | Comma-separated auto-moderator emails             |
| Server         | `JWT_SECRET`              | Session signing secret                            |
| Server         | `VAPID_*`                 | Optional Web Push credentials                     |
| Client (Vite)  | `VITE_API_BASE`           | API origin (defaults to same origin)              |
| Mobile (Expo)  | `EXPO_PUBLIC_*` Firebase  | Configured in `mobile/app.config.ts`/`set-env.ps1` |

Templates: `server/.env.example`, `client/.env.example`. For local dev the PowerShell script writes Firebase keys and an `ADMIN_EMAILS` placeholder into your environment.

## Admin & Moderation

- Any email listed in `ADMIN_EMAILS` is promoted to moderator on first login (also grants subscription privileges). Adjust `set-env.ps1` and restart the session.
- Moderator-only REST endpoints (require authenticated cookie + moderator role):
  - `GET /api/admin/users` – list user summary, subscription, flags
  - `POST /api/admin/users/:id/subscription` body `{ "active": true/false }`
  - `POST /api/admin/users/:id/moderator` – promote
  - `DELETE /api/admin/users/:id/moderator` – demote

## Free Deployment Workflow

### 1. Backend (Render free web service)

1. Push the repository to GitHub.
2. In Render → “New Web Service” → connect repo, set **Root Directory** to `server`.
3. Build command `npm install`; start command `npm run start`.
4. Add environment variables from `set-env.ps1` (`FIREBASE_*`, `ADMIN_EMAILS`, `JWT_SECRET`, optional VAPID keys). If you use SQLite, create a persistent disk and change `src/db.js` to point at the mounted path.
5. Deploy; note the service URL (e.g. `https://555dating.onrender.com`).

### 2. Web App (Netlify free tier)

1. In the repo root, replace `RENDER_SERVICE_URL` in `client/netlify.toml` with your Render URL.
2. Create a Netlify site → connect GitHub → base directory `client`, build `npm run build`, publish directory `dist`.
3. Add the environment variable `VITE_API_BASE=https://555dating.onrender.com` and redeploy. Netlify’s redirect proxy handles `/api/*` calls so cookies continue to work.

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
