# Netlify Environment Variables - Copy & Paste Guide

Go to: https://app.netlify.com/ → **555dating** → **Site configuration** → **Environment variables**

Click **"Add a variable"** → **"Add a single variable"**

---

## Variable 1: VITE_API_BASE

**Key:**
```
VITE_API_BASE
```

**Value:**
```
https://five55dating.onrender.com
```

---

## Variable 2: VITE_SOCKET_BASE

**Key:**
```
VITE_SOCKET_BASE
```

**Value:**
```
https://five55dating.onrender.com
```

---

## After Adding Both Variables:

### Option A: Auto-Deploy (If connected to Git)

If Netlify is connected to your GitHub/GitLab repo:

1. Commit your code:
   ```bash
   git add .
   git commit -m "Production deployment configuration"
   git push
   ```
2. Netlify will auto-deploy (takes ~1-2 minutes)
3. Watch the **"Deploys"** tab

### Option B: Manual Deploy

From your project folder:

```bash
cd client
npm run build
npx netlify deploy --prod
```

---

## After Deployment Completes:

Visit: **https://555dating.netlify.app**

You should see your app! 🎉

---

**Next Step:** Test registration, login, and password reset email!
