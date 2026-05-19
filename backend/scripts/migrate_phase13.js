// halaqa/backend/scripts/migrate_phase13.js
// ─────────────────────────────────────────────────────────────────────────────
// Phase 13A — Speak Qur'an MVP
// Creates: user_coins, word_progress, tournament_rounds
//
// Usage: node scripts/migrate_phase13.js
// Requires DATABASE_URL in environment (or .env via dotenv)
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 1: user_coins
    // One row per user — tracks current balance and lifetime earnings.
    // New users start with 100 coins; seeded test user gets 350.
    // ─────────────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_coins (
        id           SERIAL        PRIMARY KEY,
        user_id      INTEGER       UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance      INTEGER       NOT NULL DEFAULT 100,
        total_earned INTEGER       NOT NULL DEFAULT 100,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Table user_coins ready');

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 2: word_progress
    // One row per (user, word_key). Tracks attempts, correct answers, and
    // mastery status for the Speak Qur'an pronunciation drill.
    // word_key format: 'surah:ayah:word_pos'  e.g. '1:1:1'
    // ─────────────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS word_progress (
        id          SERIAL        PRIMARY KEY,
        user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word_key    VARCHAR(20)   NOT NULL,
        arabic      TEXT          NOT NULL,
        translation TEXT          NOT NULL,
        attempts    INTEGER       NOT NULL DEFAULT 0,
        correct     INTEGER       NOT NULL DEFAULT 0,
        last_seen   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        mastered    BOOLEAN       NOT NULL DEFAULT FALSE,
        UNIQUE(user_id, word_key)
      );
    `);

    // Index for fast per-user word lookups (vocabulary review queries)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_word_progress_user_id
        ON word_progress (user_id);
    `);

    // Index to quickly surface unmastered words for a user
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_word_progress_mastered
        ON word_progress (user_id, mastered);
    `);
    console.log('✓ Table word_progress ready');

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 3: tournament_rounds
    // Each row is one tournament attempt by a user. Tracks league tier,
    // score, coins staked/earned, and completion status.
    // ─────────────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_rounds (
        id           SERIAL        PRIMARY KEY,
        user_id      INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        league       VARCHAR(20)   NOT NULL
                       CHECK (league IN ('bronze','silver','gold','platinum','diamond')),
        score        INTEGER       NOT NULL DEFAULT 0,
        coins_staked INTEGER       NOT NULL DEFAULT 0,
        coins_earned INTEGER       NOT NULL DEFAULT 0,
        completed    BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // Index for leaderboard queries (rank by score within a league)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tournament_rounds_league_score
        ON tournament_rounds (league, score DESC);
    `);

    // Index for per-user history queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tournament_rounds_user_id
        ON tournament_rounds (user_id);
    `);
    console.log('✓ Table tournament_rounds ready');

    // ─────────────────────────────────────────────────────────────────────────
    // SEED: give the test user (id=2) a starting wallet of 350 coins
    // ON CONFLICT DO NOTHING makes this safe to re-run
    // ─────────────────────────────────────────────────────────────────────────
    const seedResult = await client.query(`
      INSERT INTO user_coins (user_id, balance, total_earned)
      VALUES (2, 350, 350)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id, user_id, balance;
    `);

    if (seedResult.rowCount > 0) {
      const row = seedResult.rows[0];
      console.log(`✓ Seeded user_coins row — user_id=${row.user_id}, balance=${row.balance}`);
    } else {
      console.log('✓ Seed skipped — user_coins row for user_id=2 already exists');
    }

    await client.query('COMMIT');
    console.log('\nPhase 13 tables created successfully');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed — transaction rolled back');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();