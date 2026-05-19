// halaqa/backend/src/routes/learn.js
// ─────────────────────────────────────────────────────────────────────────────
// Phase 13A — Speak Qur'an MVP
// Routes: /api/learn/words  /api/learn/answer  /api/learn/progress  /api/learn/coins
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const axios = require('axios');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const QURAN_CONTENT_BASE = process.env.QURAN_API_BASE;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — mutates and returns the array */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Ensure the user has a user_coins row.
 * Returns the row (balance, total_earned).
 */
async function ensureCoinsRow(client, userId) {
    const existing = await client.query(
        'SELECT balance, total_earned FROM user_coins WHERE user_id = $1',
        [userId]
    );
    if (existing.rows.length > 0) return existing.rows[0];

    const inserted = await client.query(
        `INSERT INTO user_coins (user_id, balance, total_earned)
     VALUES ($1, 100, 100)
     ON CONFLICT (user_id) DO UPDATE
       SET updated_at = NOW()
     RETURNING balance, total_earned`,
        [userId]
    );
    return inserted.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1  GET /api/learn/words
// Fetch today's batch of 10 words from Surah Al-Baqarah
// ─────────────────────────────────────────────────────────────────────────────
router.get('/words', authenticate, async (req, res) => {
    const userId = req.userId;

    try {
        // 1. Obtain OAuth2 access token via client_credentials
        // WITH this
        const tokenRes = await axios.post(
            process.env.QURAN_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                auth: {
                    username: process.env.QURAN_CLIENT_ID,
                    password: process.env.QURAN_CLIENT_SECRET,
                },
            }
        );
        const accessToken = tokenRes.data.access_token;
        console.log('[learn/words] token acquired:', accessToken.slice(0, 20) + '...');
        console.log('[learn/words] hitting:', `${QURAN_CONTENT_BASE}/content/api/v4/verses/by_chapter/2`);

        // 2. Fetch verses from Surah Al-Baqarah
        const { data } = await axios.get(
            `${QURAN_CONTENT_BASE}/content/api/v4/verses/by_chapter/2`,
            {
                params: {
                    words: true,
                    word_fields: 'text_uthmani,transliteration',
                    translations: '131',
                    per_page: 5,
                    page: 1,
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'x-client-id': process.env.QURAN_CLIENT_ID,
                },
                timeout: 8000,
            }
        );

        // 3. Flatten all verse.words — keep only real words (not punctuation)
        const allWords = [];
        for (const verse of (data.verses || [])) {
            const verseKey = verse.verse_key; // e.g. '2:1'
            for (const word of (verse.words || [])) {
                if (word.char_type_name !== 'word') continue;
                allWords.push({
                    wordKey: `${verseKey}:${word.position}`,
                    arabic: word.text_uthmani || '',
                    transliteration: word.transliteration?.text || '',
                    translation: word.translation?.text || '',
                    audioUrl: word.audio_url || '',
                });
            }
        }

        // 4. Shuffle and take 10
        const batch = shuffle(allWords).slice(0, 10);

        // 5. Annotate each word with mastery status from DB
        const client = await pool.connect();
        try {
            for (const word of batch) {
                const row = await client.query(
                    'SELECT mastered FROM word_progress WHERE user_id = $1 AND word_key = $2',
                    [userId, word.wordKey]
                );
                word.mastered = row.rows.length > 0 ? row.rows[0].mastered : false;
            }
        } finally {
            client.release();
        }

        return res.json({
            success: true,
            data: { words: batch, totalWords: batch.length },
        });

    } catch (err) {
        console.error('[learn/words]', err.message, err.response?.status, err.response?.data);
        return res.status(500).json({ success: false, error: 'Failed to fetch words' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2  POST /api/learn/answer
// Submit answer for a word test, update progress + coins
// Body: { wordKey, arabic, translation, correct: true|false }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/answer', authenticate, async (req, res) => {
    const userId = req.userId;
    const { wordKey, arabic, translation, correct } = req.body;

    if (!wordKey || arabic === undefined || translation === undefined || correct === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const correctInt = correct ? 1 : 0;
    const coinDelta = correct ? 10 : -5;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Upsert word_progress
        const progressResult = await client.query(
            `INSERT INTO word_progress
         (user_id, word_key, arabic, translation, attempts, correct)
       VALUES ($1, $2, $3, $4, 1, $5::int)
       ON CONFLICT (user_id, word_key) DO UPDATE
         SET attempts  = word_progress.attempts + 1,
             correct   = word_progress.correct + ($5::int),
             last_seen = NOW(),
             mastered  = (word_progress.correct + ($5::int)) >= 3
       RETURNING correct, mastered`,
            [userId, wordKey, arabic, translation, correctInt]
        );

        const updatedRow = progressResult.rows[0];
        const nowMastered = updatedRow.mastered;

        // 2. Update coin balance (floor at 0)
        await ensureCoinsRow(client, userId);

        const coinsResult = await client.query(
            `UPDATE user_coins
         SET balance    = GREATEST(0, balance + $1),
             total_earned = CASE WHEN $1 > 0
                              THEN total_earned + $1
                              ELSE total_earned
                            END,
             updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance`,
            [coinDelta, userId]
        );

        const newBalance = coinsResult.rows[0]?.balance ?? 0;

        await client.query('COMMIT');

        return res.json({
            success: true,
            data: {
                correct: correct,
                coinDelta,
                newBalance,
                mastered: nowMastered,
            },
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[learn/answer]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to record answer' });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 3  GET /api/learn/progress
// Get user's learning stats (word counts + coin balance)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/progress', authenticate, async (req, res) => {
    const userId = req.userId;
    const client = await pool.connect();

    try {
        // Word stats
        const wordStats = await client.query(
            `SELECT
         COUNT(*)                                          AS total_words,
         SUM(CASE WHEN mastered THEN 1 ELSE 0 END)::int   AS mastered_words
       FROM word_progress
       WHERE user_id = $1`,
            [userId]
        );

        // Coin balance (auto-create row if missing)
        const coinsRow = await ensureCoinsRow(client, userId);

        const stats = wordStats.rows[0];

        return res.json({
            success: true,
            data: {
                totalWords: parseInt(stats.total_words, 10) || 0,
                masteredWords: parseInt(stats.mastered_words, 10) || 0,
                balance: coinsRow.balance,
                totalEarned: coinsRow.total_earned,
            },
        });

    } catch (err) {
        console.error('[learn/progress]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch progress' });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4  GET /api/learn/coins
// Get current coin balance (also mounted separately at /api/coins in server.js)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/coins', authenticate, async (req, res) => {
    const userId = req.userId;
    const client = await pool.connect();

    try {
        const row = await ensureCoinsRow(client, userId);
        return res.json({ success: true, data: { balance: row.balance } });
    } catch (err) {
        console.error('[learn/coins]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch coins' });
    } finally {
        client.release();
    }
});

module.exports = router;