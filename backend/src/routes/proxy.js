const express  = require('express');
const axios    = require('axios');
const router   = express.Router();
const pool     = require('../db/pool');
const { authenticate } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT API — Client Credentials Token Cache
//
// The QF Content API (/content/api/v4/*) requires a token obtained via the
// client_credentials grant with scope=content.  This is DIFFERENT from the
// user's access token (authorization_code grant).  We fetch it once, cache it
// server-side, and refresh automatically before it expires.
// ─────────────────────────────────────────────────────────────────────────────

let contentTokenCache = {
  token:     null,
  expiresAt: 0,   // Unix ms — refresh 60 s before actual expiry
};

async function getContentApiToken() {
  const now = Date.now();

  // Return cached token if still valid (with 60-second early-refresh buffer)
  if (contentTokenCache.token && now < contentTokenCache.expiresAt - 60_000) {
    return contentTokenCache.token;
  }

  console.log('[Proxy] Fetching fresh content API client_credentials token…');

  // client_secret_basic: credentials go in the Authorization header as
  // Basic base64(clientId:clientSecret) — same scheme your auth.js already uses
  const basicAuth = Buffer.from(
    `${process.env.QURAN_CLIENT_ID}:${process.env.QURAN_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    process.env.QURAN_TOKEN_URL,                     // already in your .env
    'grant_type=client_credentials&scope=content',   // content scope = key difference
    {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, expires_in } = response.data;

  // Cache the token; expires_in is in seconds
  contentTokenCache = {
    token:     access_token,
    expiresAt: now + (expires_in ?? 3600) * 1000,
  };

  console.log('[Proxy] Content API token cached, expires in', expires_in, 's');
  return access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER API — Refresh Token Helper
//
// When the user's access_token is expired, use their stored refresh_token to
// silently obtain a new pair, persist it to the DB, and return the new
// access_token so the original request can be retried once.
// ─────────────────────────────────────────────────────────────────────────────

async function refreshUserToken(userId) {
  const result = await pool.query(
    'SELECT refresh_token FROM users WHERE id = $1',
    [userId]
  );

  if (!result.rows.length || !result.rows[0].refresh_token) {
    throw new Error('No refresh token available for user');
  }

  const basicAuth = Buffer.from(
    `${process.env.QURAN_CLIENT_ID}:${process.env.QURAN_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    process.env.QURAN_TOKEN_URL,
    `grant_type=refresh_token&refresh_token=${encodeURIComponent(result.rows[0].refresh_token)}`,
    {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, refresh_token: new_refresh_token } = response.data;

  // Persist the new tokens — refresh_token may rotate on each use
  await pool.query(
    'UPDATE users SET access_token = $1, refresh_token = $2 WHERE id = $3',
    [access_token, new_refresh_token ?? result.rows[0].refresh_token, userId]
  );

  console.log('[Proxy] User token refreshed for userId', userId);
  return access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route helper: is this request destined for the public Content API?
// Content paths:  /content/api/v4/…
// User paths:     /auth/v1/…
// ─────────────────────────────────────────────────────────────────────────────
const isContentApiPath = (path) => path.startsWith('/content/');

// ─────────────────────────────────────────────────────────────────────────────
// ALL /api/proxy/* requests
// ─────────────────────────────────────────────────────────────────────────────
router.all('/*', authenticate, async (req, res) => {
  try {
    const targetPath = req.path;
    const targetUrl  = `${process.env.QURAN_API_BASE}${targetPath}`;

    let authToken;

    if (isContentApiPath(targetPath)) {
      // ── Content API: use client_credentials token (scope=content) ──────────
      // This token is shared across all users and cached at the server level.
      try {
        authToken = await getContentApiToken();
      } catch (tokenErr) {
        console.error('[Proxy] Failed to obtain content API token:', tokenErr.message);
        return res.status(502).json({ error: 'Could not obtain content API token' });
      }
    } else {
      // ── User API: use the individual user's access token ───────────────────
      const result = await pool.query(
        'SELECT access_token FROM users WHERE id = $1',
        [req.userId]
      );

      if (!result.rows.length) {
        return res.status(401).json({ error: 'User not found' });
      }
      authToken = result.rows[0].access_token;
    }

    console.log(
      '[Proxy] →', req.method, targetUrl,
      req.method !== 'GET' ? JSON.stringify(req.body) : ''
    );

    // ── Forward request to QF API ─────────────────────────────────────────────
    const response = await axios({
      method:  req.method,
      url:     targetUrl,
      params:  req.query,
      data:    req.body,
      headers: {
        'x-auth-token': authToken,
        'x-client-id':  process.env.QURAN_CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    return res.status(response.status).json(response.data);

  } catch (err) {
    if (err.response) {
      // ── Content API: clear cached token so next request fetches a fresh one ─
      if (
        isContentApiPath(req.path) &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
        console.warn('[Proxy] Content token rejected — clearing cache for next request');
        contentTokenCache = { token: null, expiresAt: 0 };
      }

      // ── User API: silently refresh + retry once on expired token ─────────────
      const isExpiredToken =
        err.response.status === 403 &&
        err.response.data?.message?.toLowerCase().includes('expired');

      if (!isContentApiPath(req.path) && isExpiredToken) {
        try {
          console.log('[Proxy] User access token expired — attempting refresh…');
          const newToken = await refreshUserToken(req.userId);

          const retryResponse = await axios({
            method:  req.method,
            url:     `${process.env.QURAN_API_BASE}${req.path}`,
            params:  req.query,
            data:    req.body,
            headers: {
              'x-auth-token': newToken,
              'x-client-id':  process.env.QURAN_CLIENT_ID,
              'Content-Type': 'application/json',
            },
          });

          return res.status(retryResponse.status).json(retryResponse.data);

        } catch (refreshErr) {
          console.error('[Proxy] Token refresh failed:', refreshErr.message);
          // Fall through — return 401 so the frontend can redirect to login
          return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }
      }

      console.error('[Proxy Error]', err.response.status, JSON.stringify(err.response.data));

      // ── Option B: Translate QF 401 → 403 ─────────────────────────────────
      // Any QF 401 that reaches here is a PERMISSION error (room membership,
      // page access, etc.) — NOT a session expiry. Session expiry is handled
      // above (refresh + retry, or explicit 401 from refreshErr path).
      // Translating to 403 prevents the frontend interceptor from mistakenly
      // treating QF permission errors as "your login expired".
      const forwardStatus = err.response.status === 401 ? 403 : err.response.status;

      return res.status(forwardStatus).json(err.response.data);
    }
    console.error('[Proxy Error]', err.message);
    return res.status(500).json({ error: 'Proxy error' });
  }
});

module.exports = router;