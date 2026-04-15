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

// ── POST /api/rooms/create ────────────────────────────────────────────────────
// Rooms are QuranReflect rooms → /quran-reflect/v1/rooms/groups
router.post('/create', authenticate, async (req, res) => {
  const { name, description, type, url } = req.body;
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.post(
      `${process.env.QURAN_API_BASE}/quran-reflect/v1/rooms/groups`,
      { name, description: description || '', url, public: type !== 'family' },
      { headers: qfHeaders(access_token) }
    );
    const room = qfRes.data?.data ?? qfRes.data;
    await pool.query(
      `INSERT INTO circle_membership (user_id, room_id, role) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
      [req.userId, String(room.id)]
    );
    return res.status(201).json(room);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Rooms /create Error]', err.message);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// ── GET /api/rooms/my ─────────────────────────────────────────────────────────
router.get('/my', authenticate, async (req, res) => {
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/quran-reflect/v1/rooms`,
      { headers: qfHeaders(access_token) }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Rooms /my Error]', err.message);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// ── GET /api/rooms/:roomId/members ────────────────────────────────────────────
router.get('/:roomId/members', authenticate, async (req, res) => {
  const { roomId } = req.params;
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/quran-reflect/v1/rooms/${roomId}/members`,
      { headers: qfHeaders(access_token) }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Rooms /members Error]', err.message);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ── POST /api/rooms/:roomId/invite ────────────────────────────────────────────
router.post('/:roomId/invite', authenticate, async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.post(
      `${process.env.QURAN_API_BASE}/quran-reflect/v1/rooms/${roomId}/invite`,
      { userId },
      { headers: qfHeaders(access_token) }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Rooms /invite Error]', err.message);
    return res.status(500).json({ error: 'Failed to send invite' });
  }
});

module.exports = router;