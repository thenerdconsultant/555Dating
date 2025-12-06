import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const defaultDbPath = path.resolve(process.cwd(), 'src', 'dev.db')
const configuredPath = (process.env.DB_PATH || '').trim()
const dbPath = configuredPath ? path.resolve(configuredPath) : defaultDbPath
fs.mkdirSync(path.dirname(dbPath), { recursive: true })
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  displayName TEXT NOT NULL,
  birthdate TEXT NOT NULL,
  gender TEXT NOT NULL,
  age INTEGER NOT NULL,
  location TEXT DEFAULT '',
  education TEXT DEFAULT '',
  languages TEXT DEFAULT '',
  datingStatus TEXT DEFAULT '',
  heightCm INTEGER,
  weightKg INTEGER,
  bodyType TEXT DEFAULT '',
  photos TEXT DEFAULT '',
  selfiePath TEXT,
  createdAt TEXT NOT NULL,
  lat REAL,
  lng REAL,
  interestedIn TEXT DEFAULT '',
  lastActive INTEGER DEFAULT 0,
  isFlagged INTEGER DEFAULT 0,
  boostUntil INTEGER DEFAULT 0,
  lastRewindAt INTEGER DEFAULT 0,
  canSeeLikedMe INTEGER DEFAULT 0,
  bio TEXT DEFAULT '',
  isModerator INTEGER DEFAULT 0,
  isSuspended INTEGER DEFAULT 0,
  isHidden INTEGER DEFAULT 0,
  stripeCustomerId TEXT,
  stripeSubscriptionId TEXT,
  termsAcceptedAt TEXT
);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  fromId TEXT NOT NULL,
  toId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(fromId, toId)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  fromId TEXT NOT NULL,
  toId TEXT NOT NULL,
  text TEXT NOT NULL,
  ts INTEGER NOT NULL,
  readAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_from_to_ts ON messages(fromId, toId, ts);
CREATE INDEX IF NOT EXISTS idx_messages_from_ts ON messages(fromId, ts);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  fromId TEXT NOT NULL,
  toId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(fromId, toId)
);

CREATE TABLE IF NOT EXISTS passes (
  id TEXT PRIMARY KEY,
  fromId TEXT NOT NULL,
  toId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(fromId, toId)
);

CREATE TABLE IF NOT EXISTS super_likes (
  id TEXT PRIMARY KEY,
  fromId TEXT NOT NULL,
  toId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  UNIQUE(fromId, toId)
);

CREATE TABLE IF NOT EXISTS swipe_history (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  targetId TEXT NOT NULL,
  action TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT,
  auth TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expiresAt INTEGER NOT NULL,
  usedAt INTEGER
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporterId TEXT NOT NULL,
  reportedUserId TEXT NOT NULL,
  category TEXT NOT NULL,
  reason TEXT,
  createdAt INTEGER NOT NULL,
  reviewedAt INTEGER,
  reviewedBy TEXT,
  status TEXT DEFAULT 'pending',
  action TEXT
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  userId TEXT,
  email TEXT,
  category TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  url TEXT,
  createdAt INTEGER NOT NULL,
  status TEXT DEFAULT 'open'
);
`)

// Ensure added columns exist (for older DBs)
try {
  const cols = db.prepare("PRAGMA table_info(users)").all()
  if (!cols.some(c => c.name === 'interestedIn')) db.exec("ALTER TABLE users ADD COLUMN interestedIn TEXT DEFAULT ''")
  if (!cols.some(c => c.name === 'lastActive')) db.exec("ALTER TABLE users ADD COLUMN lastActive INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'boostUntil')) db.exec("ALTER TABLE users ADD COLUMN boostUntil INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'lastRewindAt')) db.exec("ALTER TABLE users ADD COLUMN lastRewindAt INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'canSeeLikedMe')) db.exec("ALTER TABLE users ADD COLUMN canSeeLikedMe INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'bio')) db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''")
  if (!cols.some(c => c.name === 'isModerator')) db.exec("ALTER TABLE users ADD COLUMN isModerator INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'isAdmin')) db.exec("ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'isSuspended')) db.exec("ALTER TABLE users ADD COLUMN isSuspended INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'isHidden')) db.exec("ALTER TABLE users ADD COLUMN isHidden INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'stripeCustomerId')) db.exec("ALTER TABLE users ADD COLUMN stripeCustomerId TEXT")
  if (!cols.some(c => c.name === 'stripeSubscriptionId')) db.exec("ALTER TABLE users ADD COLUMN stripeSubscriptionId TEXT")
  if (!cols.some(c => c.name === 'termsAcceptedAt')) db.exec("ALTER TABLE users ADD COLUMN termsAcceptedAt TEXT")
  if (!cols.some(c => c.name === 'selfieStatus')) db.exec("ALTER TABLE users ADD COLUMN selfieStatus TEXT DEFAULT 'none'")
  if (!cols.some(c => c.name === 'selfieRejectionReason')) db.exec("ALTER TABLE users ADD COLUMN selfieRejectionReason TEXT")
  if (!cols.some(c => c.name === 'photosStatus')) db.exec("ALTER TABLE users ADD COLUMN photosStatus TEXT DEFAULT 'approved'")
  if (!cols.some(c => c.name === 'photosRejectionReason')) db.exec("ALTER TABLE users ADD COLUMN photosRejectionReason TEXT")
  if (!cols.some(c => c.name === 'emailVerified')) db.exec("ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0")
  if (!cols.some(c => c.name === 'emailVerificationToken')) db.exec("ALTER TABLE users ADD COLUMN emailVerificationToken TEXT")
  if (!cols.some(c => c.name === 'emailVerifiedAt')) db.exec("ALTER TABLE users ADD COLUMN emailVerifiedAt INTEGER")
} catch (err) {
  console.error('Database migration error:', err);
}

export default db
