-- ─────────────────────────────────────────────────────────────────────────────
-- member_activity table — Step 10.4
--
-- SEPARATE from the existing activity_cache table (which tracks per-user per-date
-- pages_read). This table tracks LAST ACTIVE timestamp per user for the
-- CircleProgressBoard "who read today" feature.
--
-- Safe to run on existing DB — uses IF NOT EXISTS throughout.
-- Run once: psql $env:DATABASE_URL -f scripts/member_activity-migration.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_activity (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- room_id is TEXT to match circle_membership.room_id (QF Rooms API string ID)
  room_id     TEXT,
  last_active TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- One row per user — upsert on conflict keeps the table lean
  CONSTRAINT member_activity_user_unique UNIQUE (user_id)
);

-- Fast lookup by room (for circle-activity query JOIN path)
CREATE INDEX IF NOT EXISTS idx_member_activity_room_id
  ON member_activity (room_id);

-- Fast ordering by last_active (the sort key in circle-activity)
CREATE INDEX IF NOT EXISTS idx_member_activity_last_active
  ON member_activity (last_active DESC);

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_name = 'member_activity'
-- ORDER  BY ordinal_position;