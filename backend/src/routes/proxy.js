const express  = require('express');
const axios    = require('axios');
const router   = express.Router();
const pool     = require('../db/pool');
const { authenticate } = require('../middleware/authMiddleware');

// ── ALL /api/proxy/* ──────────────────────────────────────────────────────────
router.all('/*', authenticate, async (req, res) => {
  try {
    // 1. Get user's access token from DB
    const result = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [req.userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { access_token } = result.rows[0];

    // 2. Build target URL
    const targetPath = req.path;
    const targetUrl  = `${process.env.QURAN_API_BASE}${targetPath}`;
    console.log('[Proxy] →', req.method, targetUrl, req.method !== 'GET' ? JSON.stringify(req.body) : '');

    // 3. Forward request to Quran Foundation API
    const response = await axios({
      method:  req.method,
      url:     targetUrl,
      params:  req.query,
      data:    req.body,
      headers: {
        'x-auth-token': access_token,
        'x-client-id':  process.env.QURAN_CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    // 4. Return upstream response
    return res.status(response.status).json(response.data);

  } catch (err) {
    // 5. Handle upstream errors
    if (err.response) {
      console.error('[Proxy Error]', err.response.status, JSON.stringify(err.response.data));
      return res.status(err.response.status).json(err.response.data);
    }
    console.error('[Proxy Error]', err.message);
    return res.status(500).json({ error: 'Proxy error' });
  }
});

module.exports = router;