
-- Halaqa Database Schema
-- Run against the halaqa database

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  quran_user_id     VARCHAR(255) UNIQUE NOT NULL,
  username          VARCHAR(255),
  email             VARCHAR(255),
  access_token      TEXT,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Circle Membership
CREATE TABLE IF NOT EXISTS circle_membership (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  room_id     VARCHAR(255) NOT NULL,
  role        VARCHAR(50) DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Activity Cache
CREATE TABLE IF NOT EXISTS activity_cache (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  room_id      VARCHAR(255),
  pages_read   INTEGER DEFAULT 0,
  last_active  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);