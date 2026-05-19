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

    // Cache in local DB — this is the fallback when QF API is unreachable
    await pool.query(
      `INSERT INTO circle_membership (user_id, room_id, role, room_name, room_description, room_type, room_public)
       VALUES ($1, $2, 'admin', $3, $4, $5, $6)
       ON CONFLICT (user_id, room_id) DO UPDATE
         SET room_name = EXCLUDED.room_name,
             room_description = EXCLUDED.room_description`,
      [
        req.userId,
        String(room.id),
        name,
        description || '',
        'GROUP',
        type !== 'family',
      ]
    );

    return res.status(201).json(room);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Rooms /create Error]', err.message);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// ── GET /api/rooms/my ─────────────────────────────────────────────────────────
// Try QF API first. If unreachable, fall back to local DB cache.
router.get('/my', authenticate, async (req, res) => {
  // Always try local DB first as primary cache
  const localRooms = await pool.query(
    `SELECT room_id as id, room_name as name, room_description as description,
            room_type as "roomType", room_public as public, role, joined_at
     FROM circle_membership
     WHERE user_id = $1
     ORDER BY joined_at DESC`,
    [req.userId]
  );

  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/auth/v1/rooms/joined-rooms`,
      { headers: qfHeaders(access_token), timeout: 15000 }
    );
    const qfData = qfRes.data;

    // Merge QF data into local DB for future fallback
    const qfRooms = Array.isArray(qfData) ? qfData : (qfData?.data ?? []);
    for (const room of qfRooms) {
      await pool.query(
        `INSERT INTO circle_membership (user_id, room_id, role, room_name, room_description, room_type, room_public)
         VALUES ($1, $2, 'member', $3, $4, $5, $6)
         ON CONFLICT (user_id, room_id) DO UPDATE
           SET room_name        = COALESCE(EXCLUDED.room_name, circle_membership.room_name),
               room_description = COALESCE(EXCLUDED.room_description, circle_membership.room_description)`,
        [req.userId, String(room.id), room.name || '', room.description || '', room.roomType || 'GROUP', room.public ?? true]
      ).catch(() => {}); // silently skip cache write errors
    }

    return res.json(qfData);
  } catch (err) {
    // QF API unreachable — serve from local DB cache
    console.error('[Rooms /my Error]', err.message);
    if (localRooms.rows.length > 0) {
      console.log(`[Rooms /my] Serving ${localRooms.rows.length} room(s) from local cache`);
      return res.json({ data: localRooms.rows });
    }
    return res.status(503).json({ error: 'Unable to fetch rooms', data: [] });
  }
});

// ── GET /api/rooms/:roomId/profile ───────────────────────────────────────────
// Try QF API first; fall back to local circle_membership cache.
router.get('/:roomId/profile', authenticate, async (req, res) => {
  const { roomId } = req.params;
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/quran-reflect/v1/rooms/${roomId}`,
      { headers: qfHeaders(access_token), timeout: 15000 }
    );
    return res.json(qfRes.data);
  } catch (err) {
    try {
      const { rows } = await pool.query(
        `SELECT room_id AS id, room_name AS name, room_description AS description,
                room_type AS "roomType", room_public AS public, role
         FROM circle_membership
         WHERE room_id = $1
         LIMIT 1`,
        [String(roomId)]
      );
      if (rows.length > 0) return res.json({ data: rows[0] });
    } catch (_) {}
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(404).json({ error: 'Room not found' });
  }
});

// ── GET /api/rooms/:roomId/members ────────────────────────────────────────────
router.get('/:roomId/members', authenticate, async (req, res) => {
  const { roomId } = req.params;
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/quran-reflect/v1/rooms/${roomId}/members`,
      { headers: qfHeaders(access_token), timeout: 15000 }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Rooms /members Error]', err.message);
    // Fallback — serve all cached members from circle_membership
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.username, u.email, cm.role
         FROM circle_membership cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.room_id = $1
         ORDER BY cm.joined_at ASC`,
        [String(roomId)]
      );
      return res.json({ data: rows });
    } catch (_) {
      const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.userId]);
      return res.json({ data: user.rows.map(u => ({ ...u, role: 'admin' })) });
    }
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