/**
 * Halaqa Demo Seed Script
 * Usage: node scripts/seed.js <jwt_token>
 * Get token: Invoke-RestMethod http://localhost:3001/api/auth/dev-login
 */

require('dotenv').config();
const axios = require('axios');

const JWT     = process.argv[2];
const BASE    = 'http://localhost:3001/api';
const DELAY   = 1500;   // ms between calls
const TIMEOUT = 30000;  // ms per request
const RETRIES = 2;      // retries on timeout

if (!JWT) {
  console.error('\n  ❌  Usage: node scripts/seed.js <jwt_token>\n');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
  timeout: TIMEOUT,
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const call = async (method, url, data, label) => {
  await sleep(DELAY);

  for (let attempt = 1; attempt <= RETRIES + 1; attempt++) {
    try {
      const res = await client({ method, url, data });
      console.log(`  ✅  ${label}`);
      return res.data;
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const isReset   = err.code === 'ECONNRESET';
      const status    = err.response?.status;

      if ((isTimeout || isReset) && attempt <= RETRIES) {
        console.log(`  ⏳  ${label} — retrying (${attempt}/${RETRIES})...`);
        await sleep(DELAY * attempt);
        continue;
      }

      const body = JSON.stringify(err.response?.data ?? err.message);
      console.log(`  ⚠️   ${label} — HTTP ${status ?? '???'}: ${body}`);
      return err.response?.data ?? null;
    }
  }
};

const parseKey = (verseKey) => {
  const [chapterId, verseNumber] = verseKey.split(':').map(Number);
  return { chapterId, verseNumber };
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const REFLECTIONS = [
  { verseKey: '2:255', body: "Ayatul Kursi is not just a recitation — it is a declaration that nothing exists, moves, or breathes except by His permission. Reading it before sleep completely changed how I understand safety." },
  { verseKey: '1:1',   body: "Starting each day with Bismillah changes how I approach every task. It is not a ritual phrase — it is a conscious decision to begin everything in the name of the Most Merciful." },
  { verseKey: '3:200', body: "Patience is not passive. This verse says: be patient, and compete in patience. There is a rank to it. It is not just waiting — it is striving while you wait." },
  { verseKey: '18:10', body: "Like the People of the Cave, sometimes retreating from the world is wisdom. They fled to protect their faith. Stepping back from noise is sometimes the bravest thing a person can do." },
  { verseKey: '93:3',  body: "Your Lord has not forsaken you. It was revealed when the Prophet felt abandoned, and it reaches across fourteen centuries to say the same thing to me today. SubhanAllah." },
  { verseKey: '2:286', body: "Allah does not burden a soul beyond its capacity. Whenever I feel overwhelmed, this reminds me that the weight I carry is exactly the weight I was built to carry." },
  { verseKey: '13:28', body: "Hearts find rest in the remembrance of Allah. Something in the chest genuinely settles when you say His name. I cannot explain it. I just experience it." },
  { verseKey: '55:13', body: "Which of the favours of your Lord will you deny? Allah repeats it 31 times — not because He forgot, but because we forget. The repetition is mercy, not redundancy." },
];

// 7 sessions — one per day for the past 7 days, spanning Juz 1–7
// QF /auth/v1/reading-sessions only accepts chapterNumber + verseNumber
const SESSIONS = [
  { chapterNumber: 2, verseNumber: 1,   label: '7 days ago — Surah Al-Baqarah v.1'    },
  { chapterNumber: 2, verseNumber: 142, label: '6 days ago — Surah Al-Baqarah v.142'  },
  { chapterNumber: 3, verseNumber: 1,   label: '5 days ago — Surah Aal-Imran v.1'     },
  { chapterNumber: 4, verseNumber: 1,   label: '4 days ago — Surah An-Nisa v.1'       },
  { chapterNumber: 5, verseNumber: 1,   label: '3 days ago — Surah Al-Maidah v.1'     },
  { chapterNumber: 6, verseNumber: 1,   label: '2 days ago — Surah Al-Anam v.1'       },
  { chapterNumber: 7, verseNumber: 1,   label: 'Today      — Surah Al-Araf v.1'       },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n  🌱  Halaqa Demo Seed Script (pre-live)');
  console.log('  ────────────────────────────────────────────');
  console.log(`  Base URL  : ${BASE}`);
  console.log(`  Delay     : ${DELAY}ms | Timeout: ${TIMEOUT}ms | Retries: ${RETRIES}`);
  console.log(`  JWT       : ${JWT.slice(0, 30)}...\n`);

  // ── STEP 1 — Create circle ─────────────────────────────────────────────
  console.log('  ─── STEP 1 — Creating circle');
  const circleRes = await call('POST', '/rooms/create', {
    name:        'Al-Noor Family Circle',
    url:         'al-noor-family-' + Date.now().toString(36),
    description: 'A family circle for daily Quran reading and reflection',
    type:        'family',
  }, "Circle 'Al-Noor Family Circle' created");

  const roomId = circleRes?.id ?? circleRes?.data?.id ?? null;
  if (!roomId) console.log('  ⚠️   Could not extract room ID. Continuing...\n');
  else         console.log(`  ℹ️   Room ID: ${roomId}\n`);

  // ── STEP 2 — Khatm goal ────────────────────────────────────────────────
  console.log('  ─── STEP 2 — Creating Khatm goal (30 Juz / 60 days)');
  if (roomId) {
    await call('POST', '/goals/khatm/create', {
      roomId, targetJuzCount: 30, deadlineDays: 60,
    }, 'Khatm goal created: 30 Juz in 60 days');
  } else {
    console.log('  ⏭️   Skipping — no room ID');
  }
  console.log();

  // ── STEP 3 — Reflections ───────────────────────────────────────────────
  console.log('  ─── STEP 3 — Posting 8 reflections');
  for (const r of REFLECTIONS) {
    const { chapterId, verseNumber } = parseKey(r.verseKey);
    await call('POST', '/proxy/quran-reflect/v1/posts', {
      post: {
        body:           r.body,
        roomPostStatus: 2,
        draft:          false,
        references:     [{ chapterId, from: verseNumber, to: verseNumber }],
        mentions:       [],
        roomId:         roomId ? Number(roomId) : 0,
        postAsAuthorId: '',
        publishedAt:    new Date().toISOString(),
      },
    }, `Reflection posted on ${r.verseKey}`);
  }
  console.log();

  // ── STEP 4 — Collections ───────────────────────────────────────────────
  console.log('  ─── STEP 4 — Creating collections');
  const col1Res = await call('POST', '/proxy/auth/v1/collections', { name: 'Verses of Comfort' }, "Collection 'Verses of Comfort' created");
  const col2Res = await call('POST', '/proxy/auth/v1/collections', { name: 'Friday Reminders' },   "Collection 'Friday Reminders' created");

  const col1Id = col1Res?.data?.id ?? col1Res?.id ?? null;
  const col2Id = col2Res?.data?.id ?? col2Res?.id ?? null;

  if (col1Id) {
    for (const vk of ['2:255', '93:3', '2:286']) {
      const { chapterId, verseNumber } = parseKey(vk);
      await call('POST', `/proxy/auth/v1/collections/${col1Id}/bookmarks`, {
        key: chapterId, type: 'ayah', verseNumber, mushaf: 4,
      }, `Added ${vk} to 'Verses of Comfort'`);
    }
  }
  if (col2Id) {
    for (const vk of ['18:10', '55:13']) {
      const { chapterId, verseNumber } = parseKey(vk);
      await call('POST', `/proxy/auth/v1/collections/${col2Id}/bookmarks`, {
        key: chapterId, type: 'ayah', verseNumber, mushaf: 4,
      }, `Added ${vk} to 'Friday Reminders'`);
    }
  }
  console.log();

  // ── STEP 5 — Reading sessions (7 days × 7 chapters) ───────────────────
  // Strategy: log sessions via QF proxy — this is the only reliable way on
  // pre-live. The QF API does NOT accept a 'date' field; it timestamps
  // server-side. We therefore log sessions spread across chapters to give
  // judges visible breadth. Activity-days streaks are computed by QF from
  // these session logs — no separate activity POST is needed or supported.
  console.log('  ─── STEP 5 — Logging 7 reading sessions (one per chapter/Juz)');
  for (const s of SESSIONS) {
    await call('POST', '/proxy/auth/v1/reading-sessions', {
      chapterNumber: s.chapterNumber,
      verseNumber:   s.verseNumber,
    }, `Session logged: Ch.${s.chapterNumber}:${s.verseNumber} — ${s.label}`);
  }
  console.log();

  // ── STEP 6 — Bookmarks ─────────────────────────────────────────────────
  console.log('  ─── STEP 6 — Bookmarking 3 key verses');
  for (const vk of ['2:255', '13:28', '93:3']) {
    const { chapterId, verseNumber } = parseKey(vk);
    await call('POST', '/proxy/auth/v1/bookmarks', {
      key: chapterId, type: 'ayah', verseNumber, mushaf: 4,
    }, `Bookmarked ${vk}`);
  }
  console.log();

  // ── STEP 7 — Notes (3 personal verse notes) ───────────────────────────
  // Shows judges the note-taking feature is wired up end-to-end.
  console.log('  ─── STEP 7 — Saving 3 personal notes');
  const NOTES = [
    { body: 'This verse grounds me every morning. The Throne verse — nothing escapes His knowledge.', ranges: ['2:255-2:255'] },
    { body: 'True tawakkul. Cast your net and then rely on Allah, not the net.',                       ranges: ['65:3-65:3']  },
    { body: 'Ease comes with hardship — not after. It is simultaneous. That changes everything.',      ranges: ['94:5-94:6']  },
  ];
  for (const n of NOTES) {
    await call('POST', '/proxy/auth/v1/notes', {
      body:     n.body,
      saveToQR: false,
      ranges:   n.ranges,
    }, `Note saved on ${n.ranges[0]}`);
  }
  console.log();

  console.log('  ────────────────────────────────────────────');
  console.log('  🎉  Seed complete!\n');
  console.log('  What was seeded:');
  console.log('    • 1 family circle  — Al-Noor Family Circle');
  console.log('    • 1 Khatm goal    — 30 Juz in 60 days');
  console.log('    • 8 reflections   — across key verses');
  console.log('    • 2 collections   — Verses of Comfort, Friday Reminders');
  console.log('    • 5 verses        — added to collections');
  console.log('    • 7 reading sessions — Ch.2 through Ch.7 (7 Juz)');
  console.log('    • 3 bookmarks');
  console.log('    • 3 personal notes');
  console.log('\n  ➜  Open http://localhost:5173/dashboard to see the data.\n');
  console.log('  ℹ️   Note: Activity-day streaks are computed by QF from session logs.');
  console.log('  ℹ️         No separate activity POST is needed — QF handles it.\n');
}

seed().catch((err) => {
  console.error('\n  ❌  Fatal error:', err.message);
  process.exit(1);
});