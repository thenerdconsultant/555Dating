import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import sharp from 'sharp';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';
import rateLimit from 'express-rate-limit';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration - set CORS_ORIGIN env var in production to restrict origins
const CORS_ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : true;

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CORS_ORIGIN, credentials: true }
});

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Static files for uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Helpers to map JSON columns
function parseJSON(text, fallback) {
  if (!text) return fallback
  try { return JSON.parse(text) } catch { return fallback }
}

function defaultInterestsFor(gender) {
  if (gender === 'man') return ['woman']
  if (gender === 'woman') return ['man']
  if (gender === 'ladyboy') return ['man']
  return ['woman']
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-555dating-secret';
const COOKIE_NAME = 'jwt';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'lax';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const BOOST_MINUTES = Number(process.env.BOOST_MINUTES || 15);
const BOOST_DURATION_MS = BOOST_MINUTES * 60 * 1000;
const REWIND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@555dating.local';
const PUSH_ENABLED = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const PASSWORD_RESET_URL_BASE = (process.env.PASSWORD_RESET_URL || `${APP_BASE_URL}/reset-password`).replace(/\/$/, '');
const PASSWORD_RESET_EXPIRY_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 30);
const PASSWORD_RESET_EXPIRY_MS = PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@555dating.local';
let mailTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  console.log('SMTP mailer configured');
} else {
  console.warn('SMTP mailer not fully configured; falling back to console logging emails');
}
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_MENS_MONTHLY || '';
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_PRICE_MENS_YEARLY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SUCCESS_URL = (process.env.STRIPE_SUCCESS_URL || `${APP_BASE_URL}/billing/success`).replace(/\s+$/, '');
const STRIPE_CANCEL_URL = (process.env.STRIPE_CANCEL_URL || `${APP_BASE_URL}/billing/cancel`).replace(/\s+$/, '');
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const GOOGLE_SUCCESS_REDIRECT = (process.env.GOOGLE_SUCCESS_REDIRECT || `${APP_BASE_URL}/auth/google/callback`).replace(/\s+$/, '');
const GOOGLE_FAILURE_REDIRECT = (process.env.GOOGLE_FAILURE_REDIRECT || `${APP_BASE_URL}/auth/google/callback`).replace(/\s+$/, '');
const GOOGLE_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
const ADMIN_USER_FIELDS = 'id,email,displayName,gender,createdAt,canSeeLikedMe,isModerator,isFlagged,selfiePath,selfieStatus,selfieRejectionReason,isSuspended,isHidden,stripeCustomerId,stripeSubscriptionId';

if (PUSH_ENABLED) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('Web Push disabled: missing VAPID keys');
}

async function sendMail({ to, subject, text, html }) {
  if (!to) throw new Error('Missing recipient');
  const message = {
    from: SMTP_FROM,
    to,
    subject: subject || '(no subject)',
    text: text || '',
    html
  };
  if (mailTransporter) {
    await mailTransporter.sendMail(message);
  } else {
    console.log('--- Email (console fallback) ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${message.subject}`);
    console.log(text || html || '(no body)');
    console.log('--- End Email ---');
  }
}

const GOOGLE_SCOPES = ['openid', 'email', 'profile'];
const GOOGLE_STATE_COOKIE = 'google_oauth_state';
const GOOGLE_STATE_MAXAGE = 10 * 60 * 1000;
const GOOGLE_OAUTH_HINT = process.env.GOOGLE_LOGIN_HINT;

function createGoogleClient() {
  if (!GOOGLE_ENABLED) throw new Error('Google OAuth not configured');
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: COOKIE_SAMESITE,
    secure: COOKIE_SECURE
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: COOKIE_SAMESITE,
    secure: COOKIE_SECURE
  });
}

function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (ADMIN_EMAILS.has(String(user.email || '').toLowerCase())) {
      if (!user.isModerator || !user.canSeeLikedMe) {
        try {
          db.prepare('UPDATE users SET isModerator=1, canSeeLikedMe=1 WHERE id=?').run(user.id);
          user.isModerator = 1;
          user.canSeeLikedMe = 1;
        } catch (err) {
          console.error('Failed to update moderator status:', err);
        }
      }
    }
    // Update lastActive on each authed request
    try {
      db.prepare('UPDATE users SET lastActive=? WHERE id=?').run(Date.now(), user.id);
    } catch (err) {
      console.error('Failed to update lastActive:', err);
    }
    const allowWhileSuspended =
      (req.method === 'GET' && req.path === '/api/me') ||
      (req.method === 'PATCH' && req.path === '/api/me/preferences') ||
      (req.method === 'POST' && req.path === '/api/auth/logout');
    if (user.isSuspended && !allowWhileSuspended) {
      return res.status(403).json({ error: 'Account suspended', suspended: true });
    }
    req.user = {
      ...user,
      photos: parseJSON(user.photos, []),
      languages: parseJSON(user.languages, []),
      interestedIn: parseJSON(user.interestedIn, []),
      bio: user.bio || '',
      boostUntil: Number(user.boostUntil || 0),
      lastRewindAt: Number(user.lastRewindAt || 0),
      canSeeLikedMe: !!user.canSeeLikedMe,
      isModerator: !!user.isModerator,
      isHidden: !!user.isHidden,
      isSuspended: !!user.isSuspended,
      selfieStatus: user.selfieStatus || 'none',
      selfieRejectionReason: user.selfieRejectionReason || '',
      stripeCustomerId: user.stripeCustomerId || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,
      termsAcceptedAt: user.termsAcceptedAt || null,
      subscription: {
        status: user.canSeeLikedMe ? 'active' : 'inactive',
        stripeSubscriptionId: user.stripeSubscriptionId || null
      },
      roles: {
        moderator: !!user.isModerator
      }
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Multer storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) return cb(new Error('Invalid file type'))
    cb(null, true)
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Helpers
function calcAge(birthdate) {
  const b = new Date(birthdate);
  const diff = Date.now() - b.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return age;
}

function primaryPhotoUrl(photosValue, selfiePath) {
  let list = []
  if (Array.isArray(photosValue)) list = photosValue
  else if (typeof photosValue === 'string' && photosValue.trim()) list = parseJSON(photosValue, [])
  if (!Array.isArray(list)) list = []
  const first = list.find(p => !!p)
  return first || selfiePath || null
}

function recordSwipe(userId, targetId, action) {
  try {
    db.prepare('INSERT INTO swipe_history (id,userId,targetId,action,createdAt) VALUES (?,?,?,?,?)')
      .run(uuidv4(), userId, targetId, Date.now());
  } catch (e) {
    console.warn('Failed to record swipe', e);
  }
}

function canUseChat(user) {
  if (!user) return false;
  return user.gender === 'woman' || !!user.canSeeLikedMe;
}

function requireModerator(req, res, next) {
  if (!req.user?.roles?.moderator) {
    return res.status(403).json({ error: 'Moderator access required.' });
  }
  next();
}

function adminUserSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    gender: row.gender,
    createdAt: row.createdAt,
    subscription: row.canSeeLikedMe ? 'active' : 'inactive',
    moderator: !!row.isModerator,
    canSeeLikedMe: !!row.canSeeLikedMe,
    isFlagged: !!row.isFlagged,
    selfiePath: row.selfiePath,
    selfieStatus: row.selfieStatus || 'none',
    selfieRejectionReason: row.selfieRejectionReason || '',
    isSuspended: !!row.isSuspended,
    isHidden: !!row.isHidden,
    stripeCustomerId: row.stripeCustomerId || null,
    stripeSubscriptionId: row.stripeSubscriptionId || null
  };
}

const INSERT_USER_SQL = `INSERT INTO users (id,email,passwordHash,displayName,birthdate,gender,age,location,education,languages,datingStatus,heightCm,weightKg,bodyType,photos,selfiePath,interestedIn,createdAt,bio,canSeeLikedMe,termsAcceptedAt)
              VALUES (@id,@email,@passwordHash,@displayName,@birthdate,@gender,@age,@location,@education,@languages,@datingStatus,@heightCm,@weightKg,@bodyType,@photos,@selfiePath,@interestedIn,@createdAt,@bio,@canSeeLikedMe,@termsAcceptedAt)`;

function syncSessionUser(req, row) {
  if (!req?.user || !row || req.user.id !== row.id) return;
  req.user.canSeeLikedMe = !!row.canSeeLikedMe;
  req.user.subscription = {
    status: row.canSeeLikedMe ? 'active' : 'inactive',
    stripeSubscriptionId: row.stripeSubscriptionId || null
  };
  req.user.isModerator = !!row.isModerator;
  req.user.isHidden = !!row.isHidden;
  req.user.isSuspended = !!row.isSuspended;
  if (row.selfiePath !== undefined) req.user.selfiePath = row.selfiePath;
  if (row.selfieStatus !== undefined) req.user.selfieStatus = row.selfieStatus || 'none';
  if (row.selfieRejectionReason !== undefined) req.user.selfieRejectionReason = row.selfieRejectionReason || '';
  req.user.stripeCustomerId = row.stripeCustomerId || null;
  req.user.stripeSubscriptionId = row.stripeSubscriptionId || null;
  if (req.user.roles) {
    req.user.roles.moderator = !!row.isModerator;
  } else {
    req.user.roles = { moderator: !!row.isModerator };
  }
}

function findUserIdByStripeCustomer(customerId) {
  if (!customerId) return null;
  const row = db.prepare('SELECT id FROM users WHERE stripeCustomerId=?').get(customerId);
  return row?.id || null;
}

function applySubscriptionUpdate(userId, { active, stripeCustomerId, stripeSubscriptionId }) {
  if (!userId) return;
  db.prepare('UPDATE users SET canSeeLikedMe=?, stripeCustomerId=?, stripeSubscriptionId=? WHERE id=?')
    .run(active ? 1 : 0, stripeCustomerId || null, stripeSubscriptionId || null, userId);
}

function distanceKmBetween(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const aLat = Number(lat1);
  const aLng = Number(lng1);
  const bLat = Number(lat2);
  const bLng = Number(lng2);
  if (Number.isNaN(aLat) || Number.isNaN(aLng) || Number.isNaN(bLat) || Number.isNaN(bLng)) return null;
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const cosA = Math.cos(aLat * Math.PI / 180);
  const cosB = Math.cos(bLat * Math.PI / 180);
  const a = sinLat * sinLat + cosA * cosB * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function sendPushNotification(userId, payload) {
  if (!PUSH_ENABLED) return;
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE userId=?').all(userId);
  if (!subs.length) return;
  const data = JSON.stringify(payload);
  for (const sub of subs) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, data);
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        try {
          db.prepare('DELETE FROM push_subscriptions WHERE id=?').run(sub.id);
        } catch (dbErr) {
          console.error('Failed to delete invalid push subscription:', dbErr);
        }
      } else {
        console.error('Push notification failed', err);
      }
    }
  }
}

// Auth routes
app.post('/api/auth/register', authLimiter, (req, res) => {
  const { email, password, displayName, birthdate, gender, termsAccepted } = req.body || {};
  if (!email || !password || !displayName || !birthdate || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!termsAccepted) {
    return res.status(400).json({ error: 'Terms must be accepted' });
  }
  const age = calcAge(birthdate);
  if (age < 18) return res.status(400).json({ error: 'Must be 18+' });
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const exists = db.prepare('SELECT 1 FROM users WHERE lower(email) = lower(?)').get(normalizedEmail)
  if (exists) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(), email: normalizedEmail, passwordHash: hash, displayName, birthdate, gender,
    age, location:'', education:'', languages: JSON.stringify([]), datingStatus:'',
    heightCm: null, weightKg: null, bodyType:'', photos: JSON.stringify([]), selfiePath: null,
    interestedIn: JSON.stringify(defaultInterestsFor(gender)),
    bio: '',
    createdAt: new Date().toISOString(),
    canSeeLikedMe: ADMIN_EMAILS.has(normalizedEmail) ? 1 : 0,
    termsAcceptedAt: new Date().toISOString()
  }
  db.prepare(INSERT_USER_SQL).run(user)
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email, displayName: user.displayName });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(String(email || ''));
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  if (user.isSuspended) {
    return res.status(403).json({ error: 'Account suspended' });
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email, displayName: user.displayName });
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const { passwordHash, ...safe } = req.user;
  res.json(safe);
});

// Issue a socket token for Socket.IO auth
app.get('/api/auth/socket-token', authMiddleware, (req, res) => {
  const token = signToken(req.user);
  res.json({ token });
});

app.post('/api/auth/forgot', passwordResetLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const now = Date.now();
  db.prepare('DELETE FROM password_resets WHERE expiresAt < ?').run(now);
  const user = db.prepare('SELECT id, email, displayName FROM users WHERE lower(email)=lower(?)').get(email);
  if (user) {
    const token = crypto.randomBytes(48).toString('hex');
    const resetRecord = {
      id: uuidv4(),
      userId: user.id,
      token,
      expiresAt: now + PASSWORD_RESET_EXPIRY_MS,
      usedAt: null
    };
    db.prepare('DELETE FROM password_resets WHERE userId=?').run(user.id);
    db.prepare('INSERT INTO password_resets (id,userId,token,expiresAt,usedAt) VALUES (@id,@userId,@token,@expiresAt,@usedAt)').run(resetRecord);
    const resetLink = `${PASSWORD_RESET_URL_BASE}?token=${encodeURIComponent(token)}`;
    const bodyLines = [
      `Hi ${user.displayName || 'there'},`,
      '',
      'We received a request to reset the password for your 555Dating account.',
      'If you made this request, click the link below to choose a new password:',
      resetLink,
      '',
      `This link will expire in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.`,
      '',
      'If you did not request a password reset, you can ignore this email.'
    ];
    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your 555Dating password',
        text: bodyLines.join('\n')
      });
    } catch (err) {
      console.error('Failed to send password reset email', err);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
  }
  res.json({ ok: true });
});

app.post('/api/auth/reset', passwordResetLimiter, (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!token) return res.status(400).json({ error: 'Token is required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const record = db.prepare('SELECT * FROM password_resets WHERE token=?').get(token);
  if (!record || record.usedAt) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  if (Date.now() > Number(record.expiresAt)) {
    return res.status(400).json({ error: 'Token has expired' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id=?').get(record.userId);
  if (!user) {
    return res.status(400).json({ error: 'Account not found' });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET passwordHash=? WHERE id=?').run(hash, user.id);
  db.prepare('UPDATE password_resets SET usedAt=? WHERE id=?').run(Date.now(), record.id);
  db.prepare('DELETE FROM password_resets WHERE userId=? AND id<>?').run(user.id, record.id);
  res.json({ ok: true });
});

app.get('/api/auth/google/start', (req, res) => {
  if (!GOOGLE_ENABLED) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
  }
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    maxAge: GOOGLE_STATE_MAXAGE
  });
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'select_account',
    state
  });
  if (GOOGLE_OAUTH_HINT) params.set('login_hint', GOOGLE_OAUTH_HINT);
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const successBase = GOOGLE_SUCCESS_REDIRECT;
  const failureBase = GOOGLE_FAILURE_REDIRECT;
  const successJoin = successBase.includes('?') ? '&' : '?';
  const failureJoin = failureBase.includes('?') ? '&' : '?';
  const successRedirectBase = `${successBase}${successJoin}status=success`;
  const failureRedirectBase = `${failureBase}${failureJoin}status=error`;
  const buildFailure = (reason) => `${failureRedirectBase}${reason ? `&reason=${reason}` : ''}`;
  if (!GOOGLE_ENABLED) return res.redirect(buildFailure('disabled'));
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const expectedState = req.cookies?.[GOOGLE_STATE_COOKIE];
  res.clearCookie(GOOGLE_STATE_COOKIE, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE
  });
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect(buildFailure('state'));
  }
  try {
    const client = createGoogleClient();
    const { tokens } = await client.getToken(code);
    if (!tokens?.id_token) throw new Error('Missing id_token');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = String(payload?.email || '').toLowerCase();
    if (!email) throw new Error('Email required');
    if (!payload?.email_verified) throw new Error('Email not verified');
    let user = db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(email);
    let created = false;
    if (!user) {
      const displayName = (payload.name || email.split('@')[0] || 'Member').trim().slice(0, 60);
      const defaultBirthdate = '1995-01-01';
      const gender = 'man';
      const hash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
      const newUser = {
        id: uuidv4(),
        email,
        passwordHash: hash,
        displayName: displayName || 'Member',
        birthdate: defaultBirthdate,
        gender,
        age: calcAge(defaultBirthdate),
        location: '',
        education: '',
        languages: JSON.stringify([]),
        datingStatus: '',
        heightCm: null,
        weightKg: null,
        bodyType: '',
        photos: JSON.stringify([]),
        selfiePath: null,
        interestedIn: JSON.stringify(defaultInterestsFor(gender)),
        createdAt: new Date().toISOString(),
        bio: '',
        canSeeLikedMe: ADMIN_EMAILS.has(email) ? 1 : 0,
        termsAcceptedAt: new Date().toISOString()
      };
      db.prepare(INSERT_USER_SQL).run(newUser);
      user = db.prepare('SELECT * FROM users WHERE id=?').get(newUser.id);
      created = true;
    } else if (user.isSuspended) {
      return res.redirect(`${failureRedirect}&reason=suspended`);
    }
    const token = signToken(user);
    setAuthCookie(res, token);
    const suffix = created ? '&created=1' : '';
    res.redirect(`${successRedirectBase}${suffix}`);
  } catch (err) {
    console.error('Google OAuth failed', err);
    res.redirect(buildFailure('auth'));
  }
});

app.put('/api/me', authMiddleware, (req, res) => {
  const allowed = ['displayName','gender','location','education','languages','datingStatus','heightCm','weightKg','bodyType','interestedIn','bio'];
  const exists = db.prepare('SELECT 1 FROM users WHERE id=?').get(req.user.id)
  if (!exists) return res.status(404).json({ error: 'User not found' });
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (updates.languages && Array.isArray(updates.languages)) {
    updates.languages = JSON.stringify(updates.languages)
  }
  if (typeof updates.bio === 'string') {
    updates.bio = updates.bio.trim().slice(0, 500)
  }
  if (updates.interestedIn && Array.isArray(updates.interestedIn)) {
    // Enforce: men cannot browse men
    if ((updates.gender || req.user.gender) === 'man') {
      updates.interestedIn = updates.interestedIn.filter(g => g !== 'man')
      if (updates.interestedIn.length === 0) updates.interestedIn = ['woman']
    }
    updates.interestedIn = JSON.stringify(updates.interestedIn)
  }
  const sets = Object.keys(updates).map(k=> `${k} = @${k}`).join(', ')
  db.prepare(`UPDATE users SET ${sets} WHERE id=@id`).run({ ...updates, id: req.user.id })
  const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)
  const { passwordHash, ...safe } = {
    ...fresh,
    photos: parseJSON(fresh.photos, []),
    languages: parseJSON(fresh.languages, []),
    interestedIn: parseJSON(fresh.interestedIn, []),
    bio: fresh.bio || ''
  }
  res.json(safe)
});

app.patch('/api/me/preferences', authMiddleware, (req, res) => {
  const payload = req.body || {};
  const updates = {};
  const response = {};
  if (typeof payload.isHidden === 'boolean') {
    updates.isHidden = payload.isHidden ? 1 : 0;
    response.isHidden = payload.isHidden;
  }
  if (typeof payload.pauseAccount === 'boolean') {
    updates.isSuspended = payload.pauseAccount ? 1 : 0;
    response.pauseAccount = payload.pauseAccount;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No preference updates provided' });
  }
  const sets = Object.keys(updates).map((key) => `${key}=@${key}`).join(', ');
  db.prepare(`UPDATE users SET ${sets} WHERE id=@id`).run({ ...updates, id: req.user.id });
  const fresh = db
    .prepare('SELECT isHidden, isSuspended, canSeeLikedMe, stripeCustomerId, stripeSubscriptionId FROM users WHERE id=?')
    .get(req.user.id);
  if (fresh) {
    req.user.isHidden = !!fresh.isHidden;
    req.user.isSuspended = !!fresh.isSuspended;
    req.user.stripeCustomerId = fresh.stripeCustomerId || null;
    req.user.stripeSubscriptionId = fresh.stripeSubscriptionId || null;
    req.user.subscription = {
      status: fresh.canSeeLikedMe ? 'active' : 'inactive',
      stripeSubscriptionId: fresh.stripeSubscriptionId || null
    };
  }
  res.json({
    id: req.user.id,
    isHidden: response.isHidden ?? !!fresh?.isHidden,
    pauseAccount: response.pauseAccount ?? !!fresh?.isSuspended
  });
});

app.post('/api/me/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const row = db.prepare('SELECT photos FROM users WHERE id=?').get(req.user.id)
    const photos = parseJSON(row?.photos, [])
    if (photos.length >= 2) return res.status(400).json({ error: 'Max 2 photos allowed' })
    const filename = `${uuidv4()}.jpg`
    const outPath = path.join(__dirname, '..', 'uploads', filename)
    await sharp(req.file.buffer).rotate().resize(1080, 1080, { fit:'inside' }).jpeg({ quality:85 }).toFile(outPath)
    const updated = [...photos, '/uploads/' + filename]
    db.prepare('UPDATE users SET photos=? WHERE id=?').run(JSON.stringify(updated), req.user.id)
    res.json({ photos: updated })
  } catch (e) { res.status(400).json({ error: e.message }) }
});

app.delete('/api/me/photo', authMiddleware, async (req, res) => {
  const target = typeof req.body?.path === 'string' ? req.body.path : typeof req.query?.path === 'string' ? req.query.path : ''
  if (!target) return res.status(400).json({ error: 'Missing photo path' })
  const row = db.prepare('SELECT photos FROM users WHERE id=?').get(req.user.id)
  const photos = parseJSON(row?.photos, [])
  if (!Array.isArray(photos) || !photos.includes(target)) {
    return res.status(404).json({ error: 'Photo not found' })
  }
  const updated = photos.filter(p => p !== target)
  db.prepare('UPDATE users SET photos=? WHERE id=?').run(JSON.stringify(updated), req.user.id)
  if (target.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '..', target)
    fs.stat(filePath, (err) => {
      if (!err) {
        fs.unlink(filePath, () => {})
      }
    })
  }
  res.json({ photos: updated })
});

app.post('/api/me/selfie', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const filename = `${uuidv4()}.jpg`
    const outPath = path.join(__dirname, '..', 'uploads', filename)
    await sharp(req.file.buffer).rotate().resize(1080, 1080, { fit:'inside' }).jpeg({ quality:85 }).toFile(outPath)
    const selfiePath = '/uploads/' + filename
    db.prepare('UPDATE users SET selfiePath=?, selfieStatus=? WHERE id=?').run(selfiePath, 'pending', req.user.id)
    res.json({ selfiePath, selfieStatus: 'pending' })
  } catch (e) { res.status(400).json({ error: e.message }) }
});

app.post('/api/me/boost', authMiddleware, (req, res) => {
  const now = Date.now()
  const activeUntil = Number(req.user.boostUntil || 0)
  if (activeUntil > now) return res.status(400).json({ error: 'Boost already active', boostUntil: activeUntil })
  const boostUntil = now + BOOST_DURATION_MS
  db.prepare('UPDATE users SET boostUntil=? WHERE id=?').run(boostUntil, req.user.id)
  res.json({ boostUntil })
});

// Discovery with filters
app.get('/api/users/discover', authMiddleware, (req, res) => {
  if (!req.user.selfiePath) return res.status(403).json({ error: 'Selfie required to use discovery' })
  const { gender, minAge, maxAge, location, bodyType, education, language, page='1', limit='24', lat, lng, radiusKm } = req.query;
  const meId = req.user.id
  // Exclude blocked users
  const blocked = db.prepare('SELECT toId as id FROM blocks WHERE fromId=? UNION SELECT fromId as id FROM blocks WHERE toId=?').all(meId, meId).map(r=>r.id)
  let rows = db.prepare('SELECT * FROM users WHERE id != ?').all(meId).filter(u=>!blocked.includes(u.id))
  rows = rows.filter(u => !u.isSuspended)
  if (!req.user.roles?.moderator) rows = rows.filter(u => !u.isHidden)

  // Determine allowed genders
  let allowed
  if (req.user.gender === 'woman') {
    allowed = ['man']
  } else if (req.user.gender === 'man') {
    const prefs = Array.isArray(req.user.interestedIn) && req.user.interestedIn.length ? req.user.interestedIn : ['woman']
    allowed = prefs.filter(g => g !== 'man')
    if (!allowed.length) allowed = ['woman']
  } else if (req.user.gender === 'ladyboy') {
    allowed = ['man']
  } else {
    allowed = ['woman']
  }
  rows = rows.filter(u => allowed.includes(u.gender))
  if (gender) rows = rows.filter(u => u.gender === gender && allowed.includes(gender))
  if (minAge) rows = rows.filter(u => u.age >= Number(minAge))
  if (maxAge) rows = rows.filter(u => u.age <= Number(maxAge))
  if (location) rows = rows.filter(u => (u.location || '').toLowerCase().includes(String(location).toLowerCase()))
  if (education) rows = rows.filter(u => (u.education || '').toLowerCase().includes(String(education).toLowerCase()))
  if (bodyType) rows = rows.filter(u => u.bodyType === bodyType)
  if (language) {
    rows = rows.filter(u => {
      const langs = parseJSON(u.languages, [])
      return langs.some(x => String(x).toLowerCase().includes(String(language).toLowerCase()))
    })
  }
  const filterLat = lat !== undefined ? Number(lat) : null
  const filterLng = lng !== undefined ? Number(lng) : null
  const filterRadius = radiusKm !== undefined ? Number(radiusKm) : null
  if (filterLat != null && filterLng != null && filterRadius != null && !Number.isNaN(filterLat) && !Number.isNaN(filterLng) && !Number.isNaN(filterRadius)) {
    rows = rows.filter(u => {
      const distance = distanceKmBetween(filterLat, filterLng, u.lat, u.lng)
      return distance != null && distance <= filterRadius
    })
  }
  const now = Date.now()
  rows.sort((a,b)=>{
    const aBoost = Number(a.boostUntil || 0) > now ? 1 : 0
    const bBoost = Number(b.boostUntil || 0) > now ? 1 : 0
    if (aBoost !== bBoost) return bBoost - aBoost
    return (Number(b.lastActive) || 0) - (Number(a.lastActive) || 0)
  })
  const p = Math.max(1, Number(page)); const l = Math.min(48, Math.max(1, Number(limit)))
  const start = (p-1)*l
  const users = rows.slice(start, start+l).map(u => ({
    id: u.id,
    displayName: u.displayName,
    age: u.age,
    gender: u.gender,
    location: u.location,
    bodyType: u.bodyType,
    photos: parseJSON(u.photos, []),
    selfiePath: u.selfiePath,
    lastActive: u.lastActive,
    languages: parseJSON(u.languages, []),
    distanceKm: distanceKmBetween(req.user.lat, req.user.lng, u.lat, u.lng),
    isBoosted: Number(u.boostUntil || 0) > now,
    bio: u.bio || ''
  }))
  res.json({ items: users, total: rows.length, page: p, limit: l })
});

app.get('/api/users/:id', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.isSuspended && req.params.id !== req.user.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (user.isHidden && !req.user.roles?.moderator && user.id !== req.user.id) {
    return res.status(404).json({ error: 'Not found' });
  }
  const { passwordHash, ...safe } = {
    ...user,
    photos: parseJSON(user.photos, []),
    languages: parseJSON(user.languages, []),
    bio: user.bio || ''
  };
  res.json(safe);
});

// Likes and matches (simple mutual like)
app.post('/api/like/:id', authMiddleware, (req, res) => {
  if (!req.user.selfiePath) return res.status(403).json({ error: 'Selfie required to like' })
  const targetId = req.params.id;
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot like yourself' });
  const target = db.prepare('SELECT id, displayName, isHidden, isSuspended FROM users WHERE id=?').get(targetId)
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.isSuspended) return res.status(400).json({ error: 'User unavailable' });
  if (target.isHidden && !req.user.roles?.moderator) return res.status(400).json({ error: 'User unavailable' });
  const blocked = db.prepare('SELECT 1 FROM blocks WHERE (fromId=? AND toId=?) OR (fromId=? AND toId=?)').get(req.user.id, targetId, targetId, req.user.id)
  if (blocked) return res.status(400).json({ error: 'Cannot like (blocked)' })
  const result = db.prepare('INSERT OR IGNORE INTO likes (id,fromId,toId,createdAt) VALUES (?,?,?,?)')
    .run(uuidv4(), req.user.id, targetId, new Date().toISOString())
  if (result.changes > 0) recordSwipe(req.user.id, targetId, 'like')
  const isMatch = !!db.prepare('SELECT 1 FROM likes WHERE fromId=? AND toId=?').get(targetId, req.user.id)
  if (isMatch) {
    sendPushNotification(targetId, {
      type: 'match',
      userId: req.user.id,
      displayName: req.user.displayName
    }).catch(err => console.error('Failed to send match push notification:', err));
    sendPushNotification(req.user.id, {
      type: 'match',
      userId: target.id,
      displayName: target.displayName
    }).catch(err => console.error('Failed to send match push notification:', err));
  }
  res.json({ liked: true, match: isMatch });
});

// Super Like
const SUPERLIKE_DAILY_LIMIT = Number(process.env.SUPERLIKE_DAILY_LIMIT || 1)

app.get('/api/superlike/status', authMiddleware, (req, res) => {
  const since = Date.now() - 24*60*60*1000
  const used = db.prepare('SELECT COUNT(*) as n FROM super_likes WHERE fromId=? AND createdAt > ?').get(req.user.id, since).n
  res.json({ remaining: Math.max(0, SUPERLIKE_DAILY_LIMIT - used) })
})

app.post('/api/superlike/:id', authMiddleware, (req, res) => {
  if (!req.user.selfiePath) return res.status(403).json({ error: 'Selfie required to super like' })
  const toId = req.params.id
  if (toId === req.user.id) return res.status(400).json({ error: 'Cannot super like yourself' })
  const target = db.prepare('SELECT id, gender, displayName, isHidden, isSuspended FROM users WHERE id=?').get(toId)
  if (!target) return res.status(404).json({ error: 'User not found' })
  if (target.isSuspended) return res.status(400).json({ error: 'User unavailable' })
  if (target.isHidden && !req.user.roles?.moderator) return res.status(400).json({ error: 'User unavailable' })
  if (req.user.gender === 'man' && target.gender === 'man') return res.status(400).json({ error: 'Not allowed' })

  const since = Date.now() - 24*60*60*1000
  const used = db.prepare('SELECT COUNT(*) as n FROM super_likes WHERE fromId=? AND createdAt > ?').get(req.user.id, since).n
  if (used >= SUPERLIKE_DAILY_LIMIT) return res.status(429).json({ error: 'Super Like limit reached' })

  const insert = db.prepare('INSERT OR IGNORE INTO super_likes (id,fromId,toId,createdAt) VALUES (?,?,?,?)')
    .run(uuidv4(), req.user.id, toId, Date.now())
  if (!insert.changes) return res.status(400).json({ error: 'Already super liked' })
  recordSwipe(req.user.id, toId, 'super_like')
  db.prepare('INSERT OR IGNORE INTO likes (id,fromId,toId,createdAt) VALUES (?,?,?,?)')
    .run(uuidv4(), req.user.id, toId, new Date().toISOString())
  const isMatch = !!db.prepare('SELECT 1 FROM likes WHERE fromId=? AND toId=?').get(toId, req.user.id)
  try {
    io.to(toId).emit('super_like', { fromId: req.user.id, ts: Date.now() });
  } catch (err) {
    console.error('Failed to emit super_like event:', err);
  }
  if (isMatch) {
    sendPushNotification(toId, {
      type: 'match',
      userId: req.user.id,
      displayName: req.user.displayName
    }).catch(err => console.error('Failed to send match push notification:', err));
    sendPushNotification(req.user.id, {
      type: 'match',
      userId: target.id,
      displayName: target.displayName
    }).catch(err => console.error('Failed to send match push notification:', err));
  }
  res.json({ superLiked: true, match: isMatch })
})

app.get('/api/matches', authMiddleware, (req, res) => {
  const now = Date.now()
  const rows = db.prepare(`
    SELECT u.* FROM users u
    WHERE u.id IN (
      SELECT l1.toId FROM likes l1
      JOIN likes l2 ON l2.fromId = l1.toId AND l2.toId = l1.fromId
      WHERE l1.fromId = ?
    )`).all(req.user.id)
  const visible = rows.filter(u => !u.isSuspended && (req.user.roles?.moderator || !u.isHidden))
  const items = visible.map(u=>({
      id:u.id,
      displayName:u.displayName,
      age:u.age,
      gender:u.gender,
      photos: parseJSON(u.photos, []),
      lastActive: u.lastActive,
      languages: parseJSON(u.languages, []),
      distanceKm: distanceKmBetween(req.user.lat, req.user.lng, u.lat, u.lng),
      isBoosted: Number(u.boostUntil || 0) > now,
      bio: u.bio || ''
    }))
  res.json(items)
});

app.get('/api/likes/incoming', authMiddleware, (req, res) => {
  if (!req.user.canSeeLikedMe) return res.status(403).json({ error: 'Feature locked' })
  const blocked = db.prepare('SELECT toId as id FROM blocks WHERE fromId=? UNION SELECT fromId as id FROM blocks WHERE toId=?').all(req.user.id, req.user.id).map(r=>r.id)
  const blockedSet = new Set(blocked)
  const now = Date.now()
  const rows = db.prepare(`
    SELECT u.*, l.createdAt as likedAt FROM likes l
    JOIN users u ON u.id = l.fromId
    WHERE l.toId = ?
      AND NOT EXISTS (
        SELECT 1 FROM likes lx WHERE lx.fromId = ? AND lx.toId = l.fromId
      )
  `).all(req.user.id, req.user.id)
  const items = rows
    .filter(u => !blockedSet.has(u.id))
    .filter(u => !u.isSuspended)
    .filter(u => req.user.roles?.moderator || !u.isHidden)
    .map(u => ({
      id: u.id,
      displayName: u.displayName,
      age: u.age,
      gender: u.gender,
      location: u.location,
      bodyType: u.bodyType,
      photos: parseJSON(u.photos, []),
      selfiePath: u.selfiePath,
      lastActive: u.lastActive,
      likedAt: u.likedAt,
      languages: parseJSON(u.languages, []),
      distanceKm: distanceKmBetween(req.user.lat, req.user.lng, u.lat, u.lng),
      isBoosted: Number(u.boostUntil || 0) > now,
      bio: u.bio || ''
    }))
  res.json(items)
})

// Pass (dislike)
app.post('/api/pass/:id', authMiddleware, (req, res) => {
  const toId = req.params.id
  if (toId === req.user.id) return res.status(400).json({ error: 'Cannot pass self' })
  const result = db.prepare('INSERT OR IGNORE INTO passes (id,fromId,toId,createdAt) VALUES (?,?,?,?)')
    .run(uuidv4(), req.user.id, toId, new Date().toISOString())
  if (result.changes > 0) recordSwipe(req.user.id, toId, 'pass')
  res.json({ passed: true })
})

app.post('/api/swipe/rewind', authMiddleware, (req, res) => {
  const now = Date.now()
  const lastRewind = Number(req.user.lastRewindAt || 0)
  if (lastRewind && now - lastRewind < REWIND_COOLDOWN_MS) {
    const nextAvailableAt = lastRewind + REWIND_COOLDOWN_MS
    return res.status(429).json({ error: 'Rewind already used today', nextAvailableAt })
  }
  const last = db.prepare('SELECT * FROM swipe_history WHERE userId=? ORDER BY createdAt DESC LIMIT 1').get(req.user.id)
  if (!last) return res.status(400).json({ error: 'Nothing to rewind' })

  if (last.action === 'like') {
    db.prepare('DELETE FROM likes WHERE fromId=? AND toId=?').run(req.user.id, last.targetId)
    db.prepare('DELETE FROM super_likes WHERE fromId=? AND toId=?').run(req.user.id, last.targetId)
  } else if (last.action === 'pass') {
    db.prepare('DELETE FROM passes WHERE fromId=? AND toId=?').run(req.user.id, last.targetId)
  } else if (last.action === 'super_like') {
    db.prepare('DELETE FROM super_likes WHERE fromId=? AND toId=?').run(req.user.id, last.targetId)
    db.prepare('DELETE FROM likes WHERE fromId=? AND toId=?').run(req.user.id, last.targetId)
  }
  db.prepare('DELETE FROM swipe_history WHERE id=?').run(last.id)
  db.prepare('UPDATE users SET lastRewindAt=? WHERE id=?').run(now, req.user.id)
  const target = db.prepare('SELECT id, displayName, age, gender, location, bodyType, photos, selfiePath, lastActive, lat, lng, boostUntil FROM users WHERE id=?').get(last.targetId)
  const restored = target ? {
    id: target.id,
    displayName: target.displayName,
    age: target.age,
    gender: target.gender,
    location: target.location,
    bodyType: target.bodyType,
    photos: parseJSON(target.photos, []),
    selfiePath: target.selfiePath,
    lastActive: target.lastActive,
    languages: parseJSON(target.languages, []),
    distanceKm: distanceKmBetween(req.user.lat, req.user.lng, target.lat, target.lng),
    isBoosted: Number(target.boostUntil || 0) > now,
    bio: target.bio || ''
  } : null
  res.json({ ok: true, restored, lastRewindAt: now, nextAvailableAt: now + REWIND_COOLDOWN_MS })
})

// Swipe next candidate
app.get('/api/swipe/next', authMiddleware, (req, res) => {
  if (!req.user.selfiePath) return res.status(403).json({ error: 'Selfie required to swipe' })
  const { minAge, maxAge, location, bodyType, education, language, lat, lng, radiusKm } = req.query
  const meId = req.user.id
  const blocked = db.prepare('SELECT toId as id FROM blocks WHERE fromId=? UNION SELECT fromId as id FROM blocks WHERE toId=?').all(meId, meId).map(r=>r.id)
  const liked = db.prepare('SELECT toId as id FROM likes WHERE fromId=?').all(meId).map(r=>r.id)
  const passed = db.prepare('SELECT toId as id FROM passes WHERE fromId=?').all(meId).map(r=>r.id)

  // Allowed genders based on policy
  let allowed
  if (req.user.gender === 'woman') allowed = ['man']
  else if (req.user.gender === 'man') {
    const prefs = Array.isArray(req.user.interestedIn) && req.user.interestedIn.length ? req.user.interestedIn : ['woman']
    allowed = prefs.filter(g => g !== 'man')
    if (!allowed.length) allowed = ['woman']
  } else if (req.user.gender === 'ladyboy') allowed = ['man']
  else allowed = ['woman']

  let rows = db.prepare('SELECT * FROM users WHERE id != ?').all(meId)
  rows = rows.filter(u => !blocked.includes(u.id) && !liked.includes(u.id) && !passed.includes(u.id) && allowed.includes(u.gender))
  if (minAge) rows = rows.filter(u => u.age >= Number(minAge))
  if (maxAge) rows = rows.filter(u => u.age <= Number(maxAge))
  if (location) rows = rows.filter(u => (u.location || '').toLowerCase().includes(String(location).toLowerCase()))
  if (education) rows = rows.filter(u => (u.education || '').toLowerCase().includes(String(education).toLowerCase()))
  if (bodyType) rows = rows.filter(u => u.bodyType === bodyType)
  if (language) {
    rows = rows.filter(u => {
      const langs = parseJSON(u.languages, [])
      return langs.some(x => String(x).toLowerCase().includes(String(language).toLowerCase()))
    })
  }
  const filterLat = lat !== undefined ? Number(lat) : null
  const filterLng = lng !== undefined ? Number(lng) : null
  const filterRadius = radiusKm !== undefined ? Number(radiusKm) : null
  if (filterLat != null && filterLng != null && filterRadius != null && !Number.isNaN(filterLat) && !Number.isNaN(filterLng) && !Number.isNaN(filterRadius)) {
    rows = rows.filter(u => {
      const distance = distanceKmBetween(filterLat, filterLng, u.lat, u.lng)
      return distance != null && distance <= filterRadius
    })
  }
  const now = Date.now()
  rows.sort((a,b)=>{
    const aBoost = Number(a.boostUntil || 0) > now ? 1 : 0
    const bBoost = Number(b.boostUntil || 0) > now ? 1 : 0
    if (aBoost !== bBoost) return bBoost - aBoost
    return (Number(b.lastActive) || 0) - (Number(a.lastActive) || 0)
  })
  const u = rows[0]
  if (!u) return res.json({ done:true })
  const distanceKm = distanceKmBetween(req.user.lat, req.user.lng, u.lat, u.lng)
  res.json({
    done:false,
    user:{
      id:u.id,
      displayName:u.displayName,
      age:u.age,
      gender:u.gender,
      location:u.location,
      bodyType:u.bodyType,
      photos: parseJSON(u.photos, []),
      selfiePath:u.selfiePath,
      lastActive: u.lastActive,
      languages: parseJSON(u.languages, []),
      distanceKm,
      isBoosted: Number(u.boostUntil || 0) > now,
      bio: u.bio || ''
    }
  })
})

// Messages (store simple thread messages)
app.get('/api/messages/:userId', authMiddleware, (req, res) => {
  if (!req.user.selfiePath) return res.status(403).json({ error: 'Selfie required to message' })
  const other = req.params.userId
  const partnerRow = db.prepare('SELECT id, displayName, gender, birthdate, location, photos, selfiePath FROM users WHERE id=?').get(other)
  if (!partnerRow) return res.status(404).json({ error: 'Not found' })

  const blocked = db.prepare('SELECT 1 FROM blocks WHERE (fromId=? AND toId=?) OR (fromId=? AND toId=?)').get(req.user.id, other, other, req.user.id)
  const partner = {
    id: partnerRow.id,
    displayName: partnerRow.displayName,
    gender: partnerRow.gender,
    age: partnerRow.birthdate ? calcAge(partnerRow.birthdate) : null,
    location: partnerRow.location || '',
    avatar: primaryPhotoUrl(partnerRow.photos, partnerRow.selfiePath)
  }
  if (blocked) return res.json({ partner, messages: [] })

  const thread = db.prepare(`
    SELECT m.*, u.displayName as fromDisplayName, u.gender as fromGender, u.photos as fromPhotos, u.selfiePath as fromSelfiePath
    FROM messages m
    JOIN users u ON u.id = m.fromId
    WHERE (m.fromId=? AND m.toId=?) OR (m.fromId=? AND m.toId=?)
    ORDER BY m.ts ASC
  `).all(req.user.id, other, other, req.user.id).map(row => ({
    id: row.id,
    fromId: row.fromId,
    toId: row.toId,
    text: row.text,
    ts: row.ts,
    readAt: row.readAt,
    displayName: row.fromDisplayName,
    gender: row.fromGender,
    avatar: primaryPhotoUrl(row.fromPhotos, row.fromSelfiePath)
  }))
  // mark as read
  db.prepare('UPDATE messages SET readAt=? WHERE toId=? AND fromId=? AND readAt IS NULL').run(Date.now(), req.user.id, other)
  res.json({ partner, messages: thread })
});

app.post('/api/messages/:userId', authMiddleware, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  // simple banned word filter
  const banned = ['scam','fraud']
  const lower = String(text).toLowerCase()
  if (banned.some(w => lower.includes(w))) return res.status(400).json({ error: 'Message contains banned words' })
  const msg = {
    id: uuidv4(),
    fromId: req.user.id,
    toId: req.params.userId,
    text,
    ts: Date.now(),
    readAt: null,
    displayName: req.user.displayName,
    gender: req.user.gender,
    avatar: primaryPhotoUrl(req.user.photos, req.user.selfiePath)
  };
  db.prepare('INSERT INTO messages (id,fromId,toId,text,ts,readAt) VALUES (@id,@fromId,@toId,@text,@ts,@readAt)').run({
    id: msg.id,
    fromId: msg.fromId,
    toId: msg.toId,
    text: msg.text,
    ts: msg.ts,
    readAt: msg.readAt
  })
  io.to(req.params.userId).emit('private_message', msg);
  sendPushNotification(req.params.userId, {
    type: 'message',
    fromId: req.user.id,
    displayName: req.user.displayName,
    preview: text.slice(0, 120)
  }).catch(err => console.error('Failed to send message push notification:', err));
  res.json(msg);
});

app.post('/api/push/subscribe', authMiddleware, (req, res) => {
  if (!PUSH_ENABLED) return res.status(503).json({ error: 'Push notifications not configured' })
  const { endpoint, keys } = req.body || {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Invalid subscription payload' })
  const existing = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint=?').get(endpoint)
  const record = {
    userId: req.user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    createdAt: Date.now()
  }
  if (existing) {
    db.prepare('UPDATE push_subscriptions SET userId=@userId, p256dh=@p256dh, auth=@auth, createdAt=@createdAt WHERE id=@id')
      .run({ ...record, id: existing.id })
  } else {
    db.prepare('INSERT INTO push_subscriptions (id,userId,endpoint,p256dh,auth,createdAt) VALUES (@id,@userId,@endpoint,@p256dh,@auth,@createdAt)')
      .run({ id: uuidv4(), ...record })
  }
  res.json({ ok: true })
})

app.post('/api/push/unsubscribe', authMiddleware, (req, res) => {
  const { endpoint } = req.body || {}
  if (endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint=? AND userId=?').run(endpoint, req.user.id)
  }
  res.json({ ok: true })
})

// Inbox: last message per conversation
app.get('/api/inbox', authMiddleware, (req, res) => {
  const id = req.user.id
  const rows = db.prepare(`
    SELECT m.*
    FROM messages m
    WHERE m.id IN (
      SELECT id FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN fromId = ? THEN toId ELSE fromId END
            ORDER BY ts DESC
          ) AS rn
        FROM messages
        WHERE fromId = ? OR toId = ?
      ) ranked
      WHERE rn = 1
    )
    ORDER BY m.ts DESC
  `).all(id, id, id)
  res.json(rows)
})

// Rooms
app.get('/api/rooms', authMiddleware, (req, res) => {
  if (!canUseChat(req.user)) {
    return res.status(403).json({ error: 'Chat requires an active subscription.' });
  }
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY name COLLATE NOCASE').all();
  res.json(rooms);
});

app.post('/api/rooms', authMiddleware, (req, res) => {
  if (!canUseChat(req.user)) {
    return res.status(403).json({ error: 'Chat requires an active subscription.' });
  }
  const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
  const name = rawName.trim().slice(0, 50);
  if (name.length < 2) {
    return res.status(400).json({ error: 'Room name must be at least 2 characters.' });
  }
  const duplicate = db.prepare('SELECT 1 FROM rooms WHERE lower(name) = lower(?)').get(name);
  if (duplicate) {
    return res.status(409).json({ error: 'Room name already exists.' });
  }
  const id = uuidv4();
  db.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)').run(id, name);
  res.status(201).json({ id, name });
});

app.get('/api/admin/users', authMiddleware, requireModerator, (req, res) => {
  const rows = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users ORDER BY datetime(createdAt) DESC`)
    .all();
  res.json(rows.map(adminUserSummary));
});

app.post('/api/admin/users/:id/subscription', authMiddleware, requireModerator, (req, res) => {
  const active = !!req.body?.active;
  db.prepare('UPDATE users SET canSeeLikedMe=? WHERE id=?').run(active ? 1 : 0, req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

app.post('/api/admin/users/:id/moderator', authMiddleware, requireModerator, (req, res) => {
  db.prepare('UPDATE users SET isModerator=1 WHERE id=?').run(req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

app.delete('/api/admin/users/:id/moderator', authMiddleware, requireModerator, (req, res) => {
  db.prepare('UPDATE users SET isModerator=0 WHERE id=?').run(req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

app.post('/api/admin/users/:id/suspend', authMiddleware, requireModerator, (req, res) => {
  db.prepare('UPDATE users SET isSuspended=1 WHERE id=?').run(req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

app.delete('/api/admin/users/:id/suspend', authMiddleware, requireModerator, (req, res) => {
  db.prepare('UPDATE users SET isSuspended=0 WHERE id=?').run(req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

app.post('/api/admin/users/:id/visibility', authMiddleware, requireModerator, (req, res) => {
  const hidden = !!req.body?.hidden;
  db.prepare('UPDATE users SET isHidden=? WHERE id=?').run(hidden ? 1 : 0, req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

app.post('/api/admin/users/:id/approve-selfie', authMiddleware, requireModerator, (req, res) => {
  db.prepare('UPDATE users SET selfieStatus=?, selfieRejectionReason=NULL WHERE id=?').run('approved', req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

app.post('/api/admin/users/:id/reject-selfie', authMiddleware, requireModerator, (req, res) => {
  const { reason } = req.body;
  db.prepare('UPDATE users SET selfieStatus=?, selfieRejectionReason=? WHERE id=?').run('rejected', reason || 'Does not meet verification requirements', req.params.id);
  const row = db
    .prepare(`SELECT ${ADMIN_USER_FIELDS} FROM users WHERE id=?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  syncSessionUser(req, row);
  res.json(adminUserSummary(row));
});

// Get pending verifications
app.get('/api/admin/verifications', authMiddleware, requireModerator, (req, res) => {
  const pending = db.prepare(`
    SELECT id, displayName, email, selfiePath, selfieStatus, createdAt
    FROM users
    WHERE selfieStatus = 'pending' AND selfiePath IS NOT NULL
    ORDER BY createdAt DESC
  `).all();
  res.json(pending);
});

// Get all reports
app.get('/api/admin/reports', authMiddleware, requireModerator, (req, res) => {
  const reports = db.prepare(`
    SELECT
      r.*,
      reporter.displayName as reporterName,
      reporter.email as reporterEmail,
      reported.displayName as reportedName,
      reported.email as reportedEmail,
      reported.selfiePath as reportedPhoto
    FROM reports r
    LEFT JOIN users reporter ON r.reporterId = reporter.id
    LEFT JOIN users reported ON r.reportedUserId = reported.id
    ORDER BY r.createdAt DESC
    LIMIT 100
  `).all();
  res.json(reports);
});

// Review a report
app.post('/api/admin/reports/:id/review', authMiddleware, requireModerator, (req, res) => {
  const { action } = req.body; // 'dismiss', 'warn', 'suspend', 'ban'
  if (!['dismiss', 'warn', 'suspend', 'ban'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const report = db.prepare('SELECT * FROM reports WHERE id=?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  db.prepare('UPDATE reports SET status=?, reviewedAt=?, reviewedBy=?, action=? WHERE id=?').run(
    'reviewed',
    Date.now(),
    req.user.id,
    action,
    req.params.id
  );

  // Apply action
  if (action === 'suspend') {
    db.prepare('UPDATE users SET isSuspended=1 WHERE id=?').run(report.reportedUserId);
  } else if (action === 'ban') {
    db.prepare('UPDATE users SET isSuspended=1, isHidden=1 WHERE id=?').run(report.reportedUserId);
  }

  res.json({ ok: true });
});

// Fix photo paths in database (one-time admin endpoint)
app.post('/api/admin/fix-photos', authMiddleware, requireModerator, (req, res) => {
  try {
    const users = db.prepare('SELECT id, photos, selfiePath FROM users WHERE photos IS NOT NULL OR selfiePath IS NOT NULL').all();

    let fixedCount = 0;
    let removedCount = 0;
    const results = [];

    for (const user of users) {
      let needsUpdate = false;
      let updatedPhotos = [];
      let updatedSelfie = user.selfiePath;

      // Fix photos array
      if (user.photos) {
        try {
          const photos = JSON.parse(user.photos);
          if (Array.isArray(photos)) {
            for (const photo of photos) {
              let normalized = photo;

              // Strip full URLs (http://localhost:4000/uploads/photo.jpg -> /uploads/photo.jpg)
              if (photo.includes('://')) {
                const urlMatch = photo.match(/\/uploads\/[^\/]+$/);
                if (urlMatch) {
                  normalized = urlMatch[0];
                  needsUpdate = true;
                } else {
                  continue; // Skip invalid URLs
                }
              }

              // Ensure /uploads/ prefix
              if (!normalized.startsWith('/uploads/')) {
                normalized = '/uploads/' + normalized.replace(/^\/+/, '');
                needsUpdate = true;
              }

              // Check if file exists
              const filePath = path.join(__dirname, '..', normalized);
              if (fs.existsSync(filePath)) {
                updatedPhotos.push(normalized);
              } else {
                removedCount++;
                needsUpdate = true;
              }
            }
          }
        } catch (e) {
          results.push({ userId: user.id, error: `Failed to parse photos: ${e.message}` });
        }
      }

      // Fix selfie path
      if (user.selfiePath) {
        let normalized = user.selfiePath;

        // Strip full URLs
        if (normalized.includes('://')) {
          const urlMatch = normalized.match(/\/uploads\/[^\/]+$/);
          if (urlMatch) {
            normalized = urlMatch[0];
            needsUpdate = true;
          }
        }

        // Ensure /uploads/ prefix
        if (!normalized.startsWith('/uploads/')) {
          normalized = '/uploads/' + normalized.replace(/^\/+/, '');
          needsUpdate = true;
        }

        // Check if file exists
        const filePath = path.join(__dirname, '..', normalized);
        if (!fs.existsSync(filePath)) {
          normalized = null;
          removedCount++;
          needsUpdate = true;
        }

        updatedSelfie = normalized;
      }

      // Update database if needed
      if (needsUpdate) {
        db.prepare('UPDATE users SET photos=?, selfiePath=? WHERE id=?')
          .run(JSON.stringify(updatedPhotos), updatedSelfie, user.id);
        results.push({
          userId: user.id,
          photos: updatedPhotos.length,
          selfie: updatedSelfie ? 'fixed' : 'removed'
        });
        fixedCount++;
      }
    }

    res.json({
      success: true,
      fixedUsers: fixedCount,
      removedFiles: removedCount,
      totalUsers: users.length,
      details: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/billing/checkout', authMiddleware, async (req, res) => {
  if (!stripe || !STRIPE_MONTHLY_PRICE_ID || !STRIPE_YEARLY_PRICE_ID) {
    return res.status(503).json({ error: 'Billing not configured' });
  }
  if (req.user.gender !== 'man') {
    return res.status(400).json({ error: 'Subscriptions are currently limited to men' });
  }
  const plan = req.body?.plan === 'yearly' ? 'yearly' : 'monthly';
  const priceId = plan === 'yearly' ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
  try {
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.displayName || req.user.email,
        metadata: { userId: req.user.id }
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripeCustomerId=? WHERE id=?').run(customerId, req.user.id);
      req.user.stripeCustomerId = customerId;
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: STRIPE_SUCCESS_URL,
      cancel_url: STRIPE_CANCEL_URL,
      client_reference_id: req.user.id,
      metadata: { userId: req.user.id, plan },
      subscription_data: {
        metadata: { userId: req.user.id, plan }
      }
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout session error', err);
    res.status(500).json({ error: 'Unable to start checkout' });
  }
});

// Location update
app.post('/api/me/location', authMiddleware, (req, res) => {
  const { lat, lng } = req.body
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'Invalid coords' })
  db.prepare('UPDATE users SET lat=?, lng=? WHERE id=?').run(lat, lng, req.user.id)
  res.json({ ok: true })
})

// Block/Report
app.post('/api/block/:id', authMiddleware, (req,res) => {
  const toId = req.params.id
  if (toId===req.user.id) return res.status(400).json({ error:'Cannot block self' })
  db.prepare('INSERT OR IGNORE INTO blocks (id,fromId,toId,createdAt) VALUES (?,?,?,?)').run(uuidv4(), req.user.id, toId, new Date().toISOString())
  res.json({ ok:true })
})
app.delete('/api/block/:id', authMiddleware, (req,res) => {
  db.prepare('DELETE FROM blocks WHERE fromId=? AND toId=?').run(req.user.id, req.params.id)
  res.json({ ok:true })
})

// Get user's blocked list
app.get('/api/blocks', authMiddleware, (req, res) => {
  const blocks = db.prepare(`
    SELECT b.id, b.toId, b.createdAt, u.displayName, u.age, u.photos, u.selfiePath
    FROM blocks b
    LEFT JOIN users u ON b.toId = u.id
    WHERE b.fromId = ?
    ORDER BY b.createdAt DESC
  `).all(req.user.id);
  const normalized = blocks.map((entry) => {
    let createdAt = Number(entry.createdAt)
    if (Number.isNaN(createdAt)) {
      const parsed = Date.parse(entry.createdAt)
      createdAt = Number.isNaN(parsed) ? null : parsed
    }
    return {
      ...entry,
      photos: parseJSON(entry.photos, []),
      createdAt
    }
  })
  res.json(normalized);
});

// Get user's report history
app.get('/api/my-reports', authMiddleware, (req, res) => {
  const reports = db.prepare(`
    SELECT
      r.id, r.reportedUserId, r.category, r.reason, r.createdAt, r.status, r.action,
      u.displayName as reportedName
    FROM reports r
    LEFT JOIN users u ON r.reportedUserId = u.id
    WHERE r.reporterId = ?
    ORDER BY r.createdAt DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(reports);
});
app.post('/api/report/:id', authMiddleware, (req,res)=>{
  const { category, reason } = req.body
  if (!category) return res.status(400).json({ error: 'Category required' })
  const validCategories = ['harassment', 'fake_profile', 'inappropriate_content', 'scam', 'underage', 'other']
  if (!validCategories.includes(category)) return res.status(400).json({ error: 'Invalid category' })

  const reportId = uuidv4()
  db.prepare('INSERT INTO reports (id, reporterId, reportedUserId, category, reason, createdAt) VALUES (?,?,?,?,?,?)').run(
    reportId,
    req.user.id,
    req.params.id,
    category,
    reason || '',
    Date.now()
  )

  // Still flag user for backwards compatibility
  db.prepare('UPDATE users SET isFlagged=1 WHERE id=?').run(req.params.id)
  res.json({ ok: true, reportId })
})

app.post('/api/billing/webhook', async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Billing webhook disabled');
  }
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId =
          session.metadata?.userId ||
          session.client_reference_id ||
          findUserIdByStripeCustomer(session.customer);
        if (userId) {
          applySubscriptionUpdate(userId, {
            active: true,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription || null
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = subscription?.status || '';
        const active = ['active', 'trialing', 'past_due'].includes(status);
        const userId =
          subscription.metadata?.userId ||
          findUserIdByStripeCustomer(subscription.customer);
        applySubscriptionUpdate(userId, {
          active,
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId =
          subscription.metadata?.userId ||
          findUserIdByStripeCustomer(subscription.customer);
        applySubscriptionUpdate(userId, {
          active: false,
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: null
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error', err);
    return res.status(500).send('Webhook handler failure');
  }
  res.json({ received: true });
});

// Socket.IO
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('no auth'));
    const payload = jwt.verify(token, JWT_SECRET);
    const userRecord = db.prepare('SELECT id, gender, canSeeLikedMe, displayName, isSuspended FROM users WHERE id=?').get(payload.id);
    if (!userRecord || userRecord.isSuspended) return next(new Error('auth failed'));
    socket.userId = userRecord.id;
    socket.chatProfile = userRecord;
    socket.chatEligible = canUseChat(userRecord);
    next();
  } catch (e) {
    next(new Error('auth failed'));
  }
});

io.on('connection', (socket) => {
  // Join personal room for private messages
  socket.join(socket.userId);
  try {
    db.prepare('UPDATE users SET lastActive=? WHERE id=?').run(Date.now(), socket.userId);
  } catch (err) {
    console.error('Failed to update lastActive on socket connection:', err);
  }

  socket.on('join_room', (roomId, cb) => {
    const ack = typeof cb === 'function' ? cb : () => {};
    if (!socket.chatEligible) {
      return ack({ error: 'Chat requires an active subscription.' });
    }
    const room = db.prepare('SELECT id FROM rooms WHERE id=?').get(roomId);
    if (!room) {
      return ack({ error: 'Room not found.' });
    }
    socket.join(`room:${roomId}`);
    ack({ ok: true });
  });

  socket.on('room_message', ({ roomId, text }, cb) => {
    const ack = typeof cb === 'function' ? cb : () => {};
    if (!socket.chatEligible) {
      return ack({ error: 'Chat requires an active subscription.' });
    }
    const room = db.prepare('SELECT id FROM rooms WHERE id=?').get(roomId);
    if (!room) {
      return ack({ error: 'Room not found.' });
    }
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) {
      return ack({ error: 'Message cannot be empty.' });
    }
    const msg = { id: uuidv4(), roomId, fromId: socket.userId, text: trimmed, ts: Date.now(), displayName: socket.chatProfile?.displayName || 'Member', gender: socket.chatProfile?.gender || 'man' };
    io.to(`room:${roomId}`).emit('room_message', msg);
    ack({ ok: true });
  });

  socket.on('typing', ({ toId, typing }) => {
    if (!toId) return
    io.to(toId).emit('typing', { fromId: socket.userId, typing: !!typing })
  })
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`555Dating server listening on :${PORT}`));






