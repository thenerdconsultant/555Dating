# Render Environment Variables - Copy & Paste Guide

Go to: https://dashboard.render.com/ → **five55dating** → **Environment** tab

Click **"Add Environment Variable"** and add these **13 variables** exactly as shown:

---

## 1. JWT_SECRET
```
f2402f570e4f9f64c453d576c18e4139e9ebc1811e83e0ff39cba09b28f0b7f3141f843df19ac447db3118e11fb0f00e7602809c880132e14869a640f38b8230
```

## 2. CORS_ORIGIN
```
https://555dating.netlify.app
```

## 3. COOKIE_SAMESITE
```
none
```

## 4. COOKIE_SECURE
```
true
```

## 5. ADMIN_EMAILS
```
wbboykins@gmail.com
```

## 6. APP_BASE_URL
```
https://555dating.netlify.app
```

## 7. PASSWORD_RESET_URL
```
https://555dating.netlify.app/reset-password
```

## 8. SMTP_HOST
```
smtp.gmail.com
```

## 9. SMTP_PORT
```
587
```

## 10. SMTP_SECURE
```
false
```

## 11. SMTP_USER
```
wbboykins@gmail.com
```

## 12. SMTP_PASS
```
[PASTE YOUR 16-CHARACTER GMAIL APP PASSWORD HERE]
```

## 13. SMTP_FROM
```
555Dating <wbboykins@gmail.com>
```

---

## Additional Optional Variables (Can skip for now)

These are nice-to-have but not required:

```
PASSWORD_RESET_EXPIRY_MINUTES = 30
SUPERLIKE_DAILY_LIMIT = 1
BOOST_MINUTES = 15
```

---

## After Adding All Variables:

1. Click **"Save Changes"**
2. Render will automatically redeploy (takes 2-3 minutes)
3. Watch the **"Logs"** tab to see deployment progress
4. Look for: "555Dating server listening on :4000" ✅

---

## What NOT to Add (We'll add later):

❌ Skip Stripe variables (no payments yet)
❌ Skip Google OAuth (not needed)
❌ Skip Web Push (not needed)
❌ Skip DB_PATH (Render handles automatically)

---

**Next Step:** After Render finishes deploying, configure Netlify (only 2 variables!)
