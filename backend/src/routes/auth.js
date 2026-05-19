const express = require('express');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const pool    = require('../db/pool');
const { authenticate } = require('../middleware/authMiddleware');

// ── DEV ONLY: GET /api/auth/dev-login ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  router.get('/dev-login', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE quran_user_id = $1',
        ['dev-user-001']
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Dev user not found. Run: node scripts/seedDevUser.js' });
      }
      const user  = result.rows[0];
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      console.error('[Dev Login Error]', err.message);
      return res.status(500).json({ error: 'Dev login failed' });
    }
  });
}

// ── GET /api/auth/login ───────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  const state = require('crypto').randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id:     process.env.QURAN_CLIENT_ID,
    redirect_uri:  process.env.QURAN_REDIRECT_URI,
    response_type: 'code',
    state,
    scope: [
      'openid', 'profile',
      'bookmark', 'collection', 'reading_session', 'preference',
      'activity_day', 'goal', 'streak', 'user',
      'post', 'comment', 'room', 'note', 'tag',
    ].join(' '),
  });
  return res.redirect(`${process.env.QURAN_AUTH_URL}?${params}`);
});

// ── GET /api/auth/callback ────────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  console.log('[Auth Callback] Query params:', req.query);
  try {
    if (!code) throw new Error('No authorization code received');

    const tokenBody = new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: process.env.QURAN_REDIRECT_URI,
    });

    const tokenResponse = await axios.post(
      process.env.QURAN_TOKEN_URL,
      tokenBody.toString(),
      {
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            process.env.QURAN_CLIENT_ID + ':' + process.env.QURAN_CLIENT_SECRET
          ).toString('base64'),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    const profile        = jwt.decode(tokenResponse.data.id_token);

    if (!profile || !profile.sub) throw new Error('Failed to decode user profile from id_token');

    const result = await pool.query(
      `INSERT INTO users (quran_user_id, username, email, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (quran_user_id) DO UPDATE
         SET access_token     = EXCLUDED.access_token,
             refresh_token    = EXCLUDED.refresh_token,
             token_expires_at = EXCLUDED.token_expires_at
       RETURNING *`,
      [
        profile.sub,
        (profile.first_name && profile.last_name)
          ? `${profile.first_name} ${profile.last_name}`
          : profile.sub,
        profile.email || null,
        access_token,
        refresh_token || null,
        tokenExpiresAt,
      ]
    );

    const user     = result.rows[0];
    const appToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${appToken}`);

  } catch (err) {
    console.error('[Auth Callback Error]', err.message);
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

// ── GET /api/auth/me (protected) ──────────────────────────────────────────────
// Returns id, username, email AND quranUserId (needed for post creation)
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, quran_user_id FROM users WHERE id = $1',
      [req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

    const { id, username, email, quran_user_id } = result.rows[0];
    return res.json({ id, username, email, quranUserId: quran_user_id });

  } catch (err) {
    console.error('[Auth /me Error]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;