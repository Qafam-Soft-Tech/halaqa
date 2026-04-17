-- ============================================================
-- Halaqa Database Schema
-- ============================================================

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  quran_user_id    TEXT UNIQUE NOT NULL,
  username         TEXT,
  email            TEXT,
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- CIRCLES (local cache of QF Rooms API data)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS circles (
  id          SERIAL PRIMARY KEY,
  room_id     TEXT UNIQUE NOT NULL,        -- QF Rooms API room ID
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'GROUP',
  public      BOOLEAN DEFAULT true,
  owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- CIRCLE MEMBERSHIP
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS circle_membership (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  room_id          TEXT NOT NULL,
  role             TEXT DEFAULT 'member',   -- 'admin' | 'member'
  -- Cache room metadata so dashboard works even when QF API is down
  room_name        TEXT,
  room_description TEXT,
  room_type        TEXT DEFAULT 'GROUP',
  room_public      BOOLEAN DEFAULT true,
  joined_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

-- ------------------------------------------------------------
-- KHATM PLANS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS khatm_plans (
  id          SERIAL PRIMARY KEY,
  room_id     TEXT NOT NULL,               -- references QF room
  title       TEXT NOT NULL,
  total_juz   INTEGER DEFAULT 30,
  start_date  DATE,
  end_date    DATE,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- KHATM ASSIGNMENTS (Juz per member)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS khatm_assignments (
  id          SERIAL PRIMARY KEY,
  plan_id     INTEGER REFERENCES khatm_plans(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  juz_number  INTEGER NOT NULL CHECK (juz_number BETWEEN 1 AND 30),
  completed   BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plan_id, juz_number)              -- one member per Juz per plan
);

-- ------------------------------------------------------------
-- LIVE TAFSIR SESSIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id          SERIAL PRIMARY KEY,
  room_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  verse_key   TEXT,                        -- e.g. '2:255' for Ayat al-Kursi
  started_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at  TIMESTAMP DEFAULT NOW(),
  ended_at    TIMESTAMP,
  is_live     BOOLEAN DEFAULT true
);

-- ------------------------------------------------------------
-- SESSION ANNOTATIONS (Socket.io real-time notes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_annotations (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  verse_key   TEXT,                        -- verse being annotated
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- REFLECTION POSTS (group board)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL PRIMARY KEY,
  room_id     TEXT NOT NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  verse_key   TEXT,                        -- optional linked verse
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- VERSE COLLECTIONS (saved by user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verse_collections (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verse_collection_items (
  id            SERIAL PRIMARY KEY,
  collection_id INTEGER REFERENCES verse_collections(id) ON DELETE CASCADE,
  verse_key     TEXT NOT NULL,             -- e.g. '36:40'
  note          TEXT,
  added_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(collection_id, verse_key)
);

-- ------------------------------------------------------------
-- ACTIVITY CACHE (streak + heatmap data)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_cache (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  pages_read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ------------------------------------------------------------
-- SAFE UPGRADE: add columns if running against existing DB
-- ------------------------------------------------------------
ALTER TABLE circle_membership ADD COLUMN IF NOT EXISTS room_name        TEXT;
ALTER TABLE circle_membership ADD COLUMN IF NOT EXISTS room_description TEXT;
ALTER TABLE circle_membership ADD COLUMN IF NOT EXISTS room_type        TEXT DEFAULT 'GROUP';
ALTER TABLE circle_membership ADD COLUMN IF NOT EXISTS room_public      BOOLEAN DEFAULT true; 