// halaqa/backend/src/routes/tournament.js
// ─────────────────────────────────────────────────────────────────────────────
// Phase 13B — Tournament MVP
// Routes: /api/tournament/status  /api/tournament/enter  /api/tournament/submit
// ─────────────────────────────────────────────────────────────────────────────

const express  = require('express');
const axios    = require('axios');
const pool     = require('../db/pool');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// ── League config ─────────────────────────────────────────────────────────────
const LEAGUES = [
  { id: 'bronze',   label: 'Bronze',   icon: '🥉', minCoins: 0,    entryCost: 0,   requirement: 'Open to all — no requirements' },
  { id: 'silver',   label: 'Silver',   icon: '🥈', minCoins: 200,  entryCost: 20,  requirement: '200+ coins' },
  { id: 'gold',     label: 'Gold',     icon: '🥇', minCoins: 500,  entryCost: 50,  requirement: '500+ coins' },
  { id: 'platinum', label: 'Platinum', icon: '💎', minCoins: 1000, entryCost: 100, requirement: '1000+ coins' },
  { id: 'diamond',  label: 'Diamond',  icon: '👑', minCoins: 2500, entryCost: 200, requirement: '2500+ coins' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — mutates and returns the array. */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Ensure the user has a user_coins row.
 * Returns the row { balance, total_earned }.
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

/**
 * Determine which league the user is in based on their balance.
 * Iterates LEAGUES in reverse (highest first) and returns the first match.
 */
function resolveLeague(balance) {
  const reversed = [...LEAGUES].reverse();
  return reversed.find(l => balance >= l.minCoins) ?? LEAGUES[0];
}

/**
 * Fetch 10 random Arabic words from Surah Al-Baqarah via the QF content API.
 * Mirrors the pattern used in learn.js exactly.
 */
async function fetchWords() {
  // 1. Obtain OAuth2 access token via client_credentials
  const tokenRes = await axios.post(
    process.env.QURAN_TOKEN_URL,
    new URLSearchParams({ grant_type: 'client_credentials', scope: 'content' }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: process.env.QURAN_CLIENT_ID,
        password: process.env.QURAN_CLIENT_SECRET,
      },
    }
  );
  const accessToken = tokenRes.data.access_token;

  // 2. Fetch verses
  const { data } = await axios.get(
    `${process.env.QURAN_API_BASE}/content/api/v4/verses/by_chapter/2`,
    {
      params: {
        words:       true,
        word_fields: 'text_uthmani,transliteration',
        translations: '131',
        per_page:    5,
        page:        1,
      },
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'x-auth-token': accessToken,
        'x-client-id':  process.env.QURAN_CLIENT_ID,
      },
      timeout: 8000,
    }
  );

  // 3. Flatten and filter real words only
  const allWords = [];
  for (const verse of (data.verses || [])) {
    const verseKey = verse.verse_key;
    for (const word of (verse.words || [])) {
      if (word.char_type_name !== 'word') continue;
      allWords.push({
        wordKey:        `${verseKey}:${word.position}`,
        arabic:         word.text_uthmani  || '',
        transliteration: word.transliteration?.text || '',
        translation:    word.translation?.text      || '',
        audioUrl:       word.audio_url              || '',
      });
    }
  }

  // 4. Shuffle and take 10
  return shuffle(allWords).slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1  GET /api/tournament/status
// Returns the user's coin balance, current league, all leagues (with canEnter),
// and the next league above the current one.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
  const userId = req.userId;
  const client = await pool.connect();

  try {
    const coinsRow     = await ensureCoinsRow(client, userId);
    const balance      = coinsRow.balance;
    const currentLeague = resolveLeague(balance);

    // Annotate every league with canEnter flag
    const allLeagues = LEAGUES.map(l => ({
      ...l,
      canEnter: balance >= l.minCoins,
    }));

    // Next league above current (null if already diamond)
    const currentIdx = LEAGUES.findIndex(l => l.id === currentLeague.id);
    const nextLeague = currentIdx < LEAGUES.length - 1
      ? LEAGUES[currentIdx + 1]
      : null;

    return res.json({
      success: true,
      data: {
        balance,
        currentLeague,
        allLeagues,
        nextLeague,
      },
    });

  } catch (err) {
    console.error('[tournament/status]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch tournament status' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2  POST /api/tournament/enter
// Deduct entry cost, create a round record, return 10 words.
// Body: { leagueId }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/enter', authenticate, async (req, res) => {
  const userId   = req.userId;
  const { leagueId } = req.body;

  if (!leagueId) {
    return res.status(400).json({ success: false, error: 'leagueId is required' });
  }

  const league = LEAGUES.find(l => l.id === leagueId);
  if (!league) {
    return res.status(400).json({ success: false, error: `Unknown league: ${leagueId}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get current balance (auto-create row if missing)
    const coinsRow = await ensureCoinsRow(client, userId);
    const balance  = coinsRow.balance;

    // 2. Eligibility checks
    if (balance < league.minCoins) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Not enough coins — ${league.label} requires ${league.minCoins} coins`,
      });
    }
    if (balance < league.entryCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Cannot afford entry — entry costs ${league.entryCost} coins`,
      });
    }

    // 3. Deduct entry cost
    const deductResult = await client.query(
      `UPDATE user_coins
         SET balance    = balance - $1,
             updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance`,
      [league.entryCost, userId]
    );
    const newBalance = deductResult.rows[0].balance;

    // 4. Create tournament round record
    const roundResult = await client.query(
      `INSERT INTO tournament_rounds (user_id, league, coins_staked, completed)
       VALUES ($1, $2, $3, false)
       RETURNING id`,
      [userId, league.id, league.entryCost]
    );
    const roundId = roundResult.rows[0].id;

    await client.query('COMMIT');

    // 5. Fetch words (outside transaction — external HTTP call)
    let words = [];
    try {
      words = await fetchWords();
    } catch (wordErr) {
      console.error('[tournament/enter] word fetch failed:', wordErr.message);
      // Non-fatal — return empty words array; frontend should handle gracefully
    }

    return res.json({
      success: true,
      data: {
        roundId,
        words,
        entryCost:  league.entryCost,
        newBalance,
      },
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tournament/enter]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to enter tournament' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 3  POST /api/tournament/submit
// Submit completed round results; award coins based on performance.
// Body: { roundId, answers: [{ wordKey, correct }], score }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/submit', authenticate, async (req, res) => {
  const userId = req.userId;
  const { roundId, answers, score } = req.body;

  if (roundId === undefined || !Array.isArray(answers)) {
    return res.status(400).json({ success: false, error: 'roundId and answers are required' });
  }

  const client = await pool.connect();
  try {
    // 1. Fetch the round — must belong to this user and be incomplete
    const roundResult = await client.query(
      'SELECT * FROM tournament_rounds WHERE id = $1 AND user_id = $2',
      [roundId, userId]
    );

    if (roundResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Round not found' });
    }

    const round = roundResult.rows[0];

    if (round.completed) {
      return res.status(400).json({ success: false, error: 'Round already completed' });
    }

    // 2. Calculate performance
    const correctCount = answers.filter(a => a.correct).length;
    const total        = answers.length || 1; // guard against division by zero
    const percentage   = correctCount / total;

    let coinsEarned;
    if (percentage >= 0.8) {
      coinsEarned = round.coins_staked * 2 + 50;
    } else if (percentage >= 0.6) {
      coinsEarned = round.coins_staked + 20;
    } else if (percentage >= 0.4) {
      coinsEarned = Math.floor(round.coins_staked * 0.5);
    } else {
      coinsEarned = 0; // lost the stake
    }

    const passed = percentage >= 0.6;

    await client.query('BEGIN');

    // 3. Credit coins (even if 0 — keeps the UPDATE path consistent)
    const coinsResult = await client.query(
      `UPDATE user_coins
         SET balance      = balance + $1,
             total_earned = CASE WHEN $1 > 0 THEN total_earned + $1 ELSE total_earned END,
             updated_at   = NOW()
       WHERE user_id = $2
       RETURNING balance`,
      [coinsEarned, userId]
    );
    const newBalance = coinsResult.rows[0]?.balance ?? 0;

    // 4. Mark round as completed
    await client.query(
      `UPDATE tournament_rounds
         SET score        = $1,
             coins_earned = $2,
             completed    = true
       WHERE id = $3`,
      [score ?? correctCount, coinsEarned, roundId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        score:        score ?? correctCount,
        correctCount,
        coinsEarned,
        newBalance,
        passed,
        message: passed ? 'MashaAllah! You won!' : 'Keep practicing!',
      },
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[tournament/submit]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to submit tournament' });
  } finally {
    client.release();
  }
});

module.exports = router;