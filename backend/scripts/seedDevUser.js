require('dotenv').config();
const pool = require('../src/db/pool');

async function seedDevUser() {
  try {
    const result = await pool.query(`
      INSERT INTO users (quran_user_id, username, email, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (quran_user_id) DO UPDATE
        SET username  = EXCLUDED.username,
            email     = EXCLUDED.email
      RETURNING *
    `, [
      'dev-user-001',
      'Dev User',
      'dev@halaqa.local',
      'mock-access-token',
      'mock-refresh-token',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    ]);

    console.log('✅ Dev user seeded:', result.rows[0]);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seedDevUser();