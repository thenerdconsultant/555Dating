import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbFile = path.join(process.cwd(), 'src', 'dev.db')
const db = new Database(dbFile)

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
  bio TEXT DEFAULT ''
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

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

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
} catch {}

// Seed default room if not exists
const roomCount = db.prepare('SELECT COUNT(*) as n FROM rooms').get().n
if (roomCount === 0) {
  db.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)').run('public', 'Public')
}

export default db
