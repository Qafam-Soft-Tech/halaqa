const express = require('express');
const axios   = require('axios');
const router  = express.Router();
const pool    = require('../db/pool');
const { authenticate } = require('../middleware/authMiddleware');

// ── Helpers ───────────────────────────────────────────────────────────────────
const qfHeaders = (token) => ({
  'x-auth-token': token,
  'x-client-id':  process.env.QURAN_CLIENT_ID,
  'Content-Type': 'application/json',
});

const getUserToken = async (userId) => {
  const result = await pool.query('SELECT access_token FROM users WHERE id = $1', [userId]);
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0].access_token;
};

// ── POST /api/reading/session ─────────────────────────────────────────────────
// Update user's current reading location (resume UX)
router.post('/session', authenticate, async (req, res) => {
  const { chapterNumber, verseNumber } = req.body;
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.post(
      `${process.env.QURAN_API_BASE}/auth/v1/reading-sessions`,
      { chapterNumber, verseNumber },
      { headers: qfHeaders(access_token) }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Reading /session POST Error]', err.message);
    return res.status(500).json({ error: 'Failed to update reading session' });
  }
});

// ── POST /api/reading/activity ────────────────────────────────────────────────
// Credit reading progress (powers streaks + goals + calendar)
router.post('/activity', authenticate, async (req, res) => {
  const { seconds, ranges, mushafId, date, roomId } = req.body;
  try {
    const access_token = await getUserToken(req.userId);

    const body = {
      type: 'QURAN',
      seconds,
      ranges,
      mushafId: mushafId || 1,
    };
    // date is optional — only include if provided
    if (date !== undefined && date !== null) body.date = date;

    const qfRes = await axios.post(
      `${process.env.QURAN_API_BASE}/auth/v1/activity-days`,
      body,
      {
        headers: {
          ...qfHeaders(access_token),
          'x-timezone': req.headers['x-timezone'] || 'UTC',
        },
      }
    );

    // ── Write to member_activity cache ────────────────────────────────────────
    // Fire-and-forget: never let cache failure break the primary response.
    // roomId is optional — only passed when reading inside a circle session.
    pool.query(
      `INSERT INTO member_activity (user_id, room_id, last_active, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         last_active = NOW(),
         room_id     = COALESCE(EXCLUDED.room_id, member_activity.room_id),
         updated_at  = NOW()`,
      [req.userId, roomId || null]
    ).catch(err => console.error('[Reading /activity cache Error]', err.message));
    // ─────────────────────────────────────────────────────────────────────────

    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Reading /activity POST Error]', err.message);
    return res.status(500).json({ error: 'Failed to record activity' });
  }
});

// ── GET /api/reading/activity ─────────────────────────────────────────────────
// Fetch user's activity history for the heatmap
router.get('/activity', authenticate, async (req, res) => {
  const { first = 20, after, from, to } = req.query;
  try {
    const access_token = await getUserToken(req.userId);

    const params = { first };
    if (after) params.after = after;
    if (from) params.from = from;   // ✅ new
    if (to)   params.to   = to; 

    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/auth/v1/activity-days`,
      {
        headers: qfHeaders(access_token),
        params,
        timeout: 15000,
      }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Reading /activity GET Error]', err.message);
    return res.status(500).json({ error: 'Failed to fetch activity history' });
  }
});

// ── GET /api/reading/sessions ─────────────────────────────────────────────────
// Get user's reading sessions (for 'continue reading' banner)
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/auth/v1/reading-sessions`,
        { headers: qfHeaders(access_token), params: { first: 10 }, timeout: 8000 }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Reading /sessions GET Error]', err.message);
    return res.status(500).json({ error: 'Failed to fetch reading sessions' });
  }
});

// ── GET /api/reading/circle-activity/:roomId ──────────────────────────────────
// Returns member last-active data for CircleProgressBoard.
// room_id in circle_membership is TEXT (QF room ID string).
// Returns: [{ userId, username, lastActive, isActiveToday }]
// Sorted: isActiveToday DESC, lastActive DESC NULLS LAST, username ASC
router.get('/circle-activity/:roomId', authenticate, async (req, res) => {
  const { roomId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT
         u.id                                                          AS "userId",
         u.username,
         ma.last_active                                                AS "lastActive",
         (DATE(ma.last_active AT TIME ZONE 'UTC') = CURRENT_DATE)     AS "isActiveToday"
       FROM circle_membership cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN member_activity ma ON ma.user_id = u.id
       WHERE cm.room_id = $1
       ORDER BY
         (DATE(ma.last_active AT TIME ZONE 'UTC') = CURRENT_DATE) DESC NULLS LAST,
         ma.last_active DESC NULLS LAST,
         u.username ASC`,
      [roomId]
    );

    const data = rows.map(r => ({
      ...r,
      isActiveToday: r.isActiveToday === true,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Reading /circle-activity Error]', err.message);
    return res.status(500).json({ error: 'Failed to fetch circle activity' });
  }
});

module.exports = router;