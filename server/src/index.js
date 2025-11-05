import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import sharp from 'sharp';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

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
const ADMIN_USER_FIELDS = 'id,email,displayName,gender,createdAt,canSeeLikedMe,isModerator,isFlagged,selfiePath';

if (PUSH_ENABLED) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('Web Push disabled: missing VAPID keys');
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
    if (ADMIN_EMAILS.has(String(user.email || '').toLowerCase()) && !user.isModerator) {
      try {
        db.prepare('UPDATE users SET isModerator=1 WHERE id=?').run(user.id);
        user.isModerator = 1;
      } catch {}
    }
    // Update lastActive on each authed request
    try { db.prepare('UPDATE users SET lastActive=? WHERE id=?').run(Date.now(), user.id) } catch {}
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
      subscription: {
        status: user.canSeeLikedMe ? 'active' : 'inactive'
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
    selfiePath: row.selfiePath
  };
}

function syncSessionUser(req, row) {
  if (!req?.user || !row || req.user.id !== row.id) return;
  req.user.canSeeLikedMe = !!row.canSeeLikedMe;
  req.user.subscription = { status: row.canSeeLikedMe ? 'active' : 'inactive' };
  req.user.isModerator = !!row.isModerator;
  if (req.user.roles) {
    req.user.roles.moderator = !!row.isModerator;
  } else {
    req.user.roles = { moderator: !!row.isModerator };
  }
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
        try { db.prepare('DELETE FROM push_subscriptions WHERE id=?').run(sub.id); } catch {}
      } else {
        console.error('Push notification failed', err);
      }
    }
  }
}

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName, birthdate, gender } = req.body;
  if (!email || !password || !displayName || !birthdate || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const age = calcAge(birthdate);
  if (age < 18) return res.status(400).json({ error: 'Must be 18+' });
  const exists = db.prepare('SELECT 1 FROM users WHERE lower(email) = lower(?)').get(email)
  if (exists) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(), email, passwordHash: hash, displayName, birthdate, gender,
    age, location:'', education:'', languages: JSON.stringify([]), datingStatus:'',
    heightCm: null, weightKg: null, bodyType:'', photos: JSON.stringify([]), selfiePath: null,
    interestedIn: JSON.stringify(defaultInterestsFor(gender)),
    bio: '',
    createdAt: new Date().toISOString()
  }
  db.prepare(`INSERT INTO users (id,email,passwordHash,displayName,birthdate,gender,age,location,education,languages,datingStatus,heightCm,weightKg,bodyType,photos,selfiePath,interestedIn,createdAt,bio)
              VALUES (@id,@email,@passwordHash,@displayName,@birthdate,@gender,@age,@location,@education,@languages,@datingStatus,@heightCm,@weightKg,@bodyType,@photos,@selfiePath,@interestedIn,@createdAt,@bio)`)
    .run(user)
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email, displayName: user.displayName });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(String(email || ''));
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(400).json({ error: 'Invalid credentials' });
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

app.post('/api/me/selfie', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const filename = `${uuidv4()}.jpg`
    const outPath = path.join(__dirname, '..', 'uploads', filename)
    await sharp(req.file.buffer).rotate().resize(1080, 1080, { fit:'inside' }).jpeg({ quality:85 }).toFile(outPath)
    const selfiePath = '/uploads/' + filename
    db.prepare('UPDATE users SET selfiePath=? WHERE id=?').run(selfiePath, req.user.id)
    res.json({ selfiePath })
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
  const target = db.prepare('SELECT id, displayName FROM users WHERE id=?').get(targetId)
  if (!target) return res.status(404).json({ error: 'User not found' });
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
    }).catch(() => {})
    sendPushNotification(req.user.id, {
      type: 'match',
      userId: target.id,
      displayName: target.displayName
    }).catch(() => {})
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
  const target = db.prepare('SELECT id, gender, displayName FROM users WHERE id=?').get(toId)
  if (!target) return res.status(404).json({ error: 'User not found' })
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
  try { io.to(toId).emit('super_like', { fromId: req.user.id, ts: Date.now() }) } catch {}
  if (isMatch) {
    sendPushNotification(toId, {
      type: 'match',
      userId: req.user.id,
      displayName: req.user.displayName
    }).catch(()=>{})
    sendPushNotification(req.user.id, {
      type: 'match',
      userId: target.id,
      displayName: target.displayName
    }).catch(()=>{})
  }
  res.json({ superLiked: true, match: isMatch })
})

app.get('/api/matches', authMiddleware, (req, res) => {
  const now = Date.now()
  const items = db.prepare(`
    SELECT u.* FROM users u
    WHERE u.id IN (
      SELECT l1.toId FROM likes l1
      JOIN likes l2 ON l2.fromId = l1.toId AND l2.toId = l1.fromId
      WHERE l1.fromId = ?
    )`).all(req.user.id).map(u=>({
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
  const blocked = db.prepare('SELECT 1 FROM blocks WHERE (fromId=? AND toId=?) OR (fromId=? AND toId=?)').get(req.user.id, other, other, req.user.id)
  if (blocked) return res.json([])
  const thread = db.prepare('SELECT * FROM messages WHERE (fromId=? AND toId=?) OR (fromId=? AND toId=?) ORDER BY ts ASC').all(req.user.id, other, other, req.user.id)
  // mark as read
  db.prepare('UPDATE messages SET readAt=? WHERE toId=? AND fromId=? AND readAt IS NULL').run(Date.now(), req.user.id, other)
  res.json(thread)
});

app.post('/api/messages/:userId', authMiddleware, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  // simple banned word filter
  const banned = ['scam','fraud']
  const lower = String(text).toLowerCase()
  if (banned.some(w => lower.includes(w))) return res.status(400).json({ error: 'Message contains banned words' })
  const msg = { id: uuidv4(), fromId: req.user.id, toId: req.params.userId, text, ts: Date.now(), readAt: null };
  db.prepare('INSERT INTO messages (id,fromId,toId,text,ts,readAt) VALUES (@id,@fromId,@toId,@text,@ts,@readAt)').run(msg)
  io.to(req.params.userId).emit('private_message', msg);
  sendPushNotification(req.params.userId, {
    type: 'message',
    fromId: req.user.id,
    displayName: req.user.displayName,
    preview: text.slice(0, 120)
  }).catch(()=>{})
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
app.post('/api/report/:id', authMiddleware, (req,res)=>{
  // For MVP, just flag user
  db.prepare('UPDATE users SET isFlagged=1 WHERE id=?').run(req.params.id)
  res.json({ ok:true })
})

// Socket.IO
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('no auth'));
    const payload = jwt.verify(token, JWT_SECRET);
    const userRecord = db.prepare('SELECT id, gender, canSeeLikedMe FROM users WHERE id=?').get(payload.id);
    if (!userRecord) return next(new Error('auth failed'));
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
  try { db.prepare('UPDATE users SET lastActive=? WHERE id=?').run(Date.now(), socket.userId) } catch {}

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
    const msg = { id: uuidv4(), roomId, fromId: socket.userId, text: trimmed, ts: Date.now() };
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
