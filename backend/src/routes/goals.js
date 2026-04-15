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

// ── POST /api/goals/khatm/create ──────────────────────────────────────────────
// Creates a QURAN_PAGES goal + distributes Juz among members
// Goal API: POST /auth/v1/goals?mushafId=4
// Body: { type, amount, duration, category }
router.post('/khatm/create', authenticate, async (req, res) => {
  const { roomId, targetJuzCount, deadlineDays } = req.body;
  try {
    const access_token = await getUserToken(req.userId);
    const headers      = qfHeaders(access_token);

    // 1. Get room members
    const membersRes = await axios.get(
      `${process.env.QURAN_API_BASE}/quran-reflect/v1/rooms/${roomId}/members`,
      { headers }
    );
    const members = membersRes.data.data || membersRes.data || [];

    // 2. Fetch activity days for proportional assignment
    const activityResults = await Promise.all(
      members.map(async (member) => {
        try {
          const actRes = await axios.get(
            `${process.env.QURAN_API_BASE}/auth/v1/activity-days?first=30&type=QURAN`,
            { headers }
          );
          const days = actRes.data.data || actRes.data;
          return { ...member, activeDays: Array.isArray(days) ? days.length : 5 };
        } catch {
          return { ...member, activeDays: 5 };
        }
      })
    );

    // 3. Calculate proportional Juz assignments (min 1 per member)
    const totalActivity = activityResults.reduce((sum, m) => sum + m.activeDays, 0) || 1;
    const assignments   = activityResults.map((member) => ({
      memberId:    member.id || member.userId,
      username:    member.username || member.name || 'Unknown',
      activeDays:  member.activeDays,
      juzAssigned: Math.max(1, Math.round((member.activeDays / totalActivity) * targetJuzCount)),
    }));

    // 4. Create goal on Quran Foundation
    // Correct body per docs: { type, amount (pages), duration (days), category }
    // Query param: mushafId=4 (UthmaniHafs)
    const goalRes = await axios.post(
      `${process.env.QURAN_API_BASE}/auth/v1/goals?mushafId=4`,
      {
        type:     'QURAN_PAGES',
        amount:   targetJuzCount * 20,   // pages
        duration: deadlineDays,
        category: 'QURAN',
      },
      { headers }
    );

    return res.status(201).json({
      goal:        goalRes.data,
      assignments,
    });

  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Goals /khatm/create Error]', err.message);
    return res.status(500).json({ error: 'Failed to create khatm goal' });
  }
});

// ── GET /api/goals/today ──────────────────────────────────────────────────────
// GET /auth/v1/goals/today?type=QURAN_PAGES
router.get('/today', authenticate, async (req, res) => {
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/auth/v1/goals/today?type=QURAN_PAGES`,
      { headers: qfHeaders(access_token) }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Goals /today Error]', err.message);
    return res.status(500).json({ error: 'Failed to fetch today goals' });
  }
});

// ── GET /api/goals/timeline/:goalId ──────────────────────────────────────────
router.get('/timeline/:goalId', authenticate, async (req, res) => {
  const { goalId } = req.params;
  try {
    const access_token = await getUserToken(req.userId);
    const qfRes = await axios.get(
      `${process.env.QURAN_API_BASE}/auth/v1/goals/${goalId}/timeline`,
      { headers: qfHeaders(access_token) }
    );
    return res.json(qfRes.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Goals /timeline Error]', err.message);
    return res.status(500).json({ error: 'Failed to fetch goal timeline' });
  }
});

module.exports = router;