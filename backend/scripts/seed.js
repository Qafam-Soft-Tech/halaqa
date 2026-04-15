/**
 * Halaqa Demo Seed Script
 * Usage: node scripts/seed.js <jwt_token>
 * Get token: Invoke-RestMethod http://localhost:3001/api/auth/dev-login
 *
 * API prefix reference:
 *   /auth/v1/            → personal user data (bookmarks, collections, goals, streaks)
 *   /quran-reflect/v1/   → rooms, posts, comments (QuranReflect content)
 *   /content/api/v4/     → Quran content (verses, translations)
 */

require('dotenv').config();
const axios = require('axios');

const JWT  = process.argv[2];
const BASE = 'http://localhost:3001/api';

if (!JWT) {
  console.error('\n  ❌  Usage: node scripts/seed.js <jwt_token>\n');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
});

// ── Helper ────────────────────────────────────────────────────────────────────
const call = async (method, url, data, label) => {
  try {
    const res = await client({ method, url, data });
    console.log(`  ✅  ${label}`);
    return res.data;
  } catch (err) {
    const status = err.response?.status ?? '???';
    const body   = JSON.stringify(err.response?.data ?? err.message);
    console.log(`  ⚠️   ${label} — HTTP ${status}: ${body}`);
    return err.response?.data ?? null;
  }
};

const parseKey = (verseKey) => {
  const [chapterId, verseNumber] = verseKey.split(':').map(Number);
  return { chapterId, verseNumber };
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const REFLECTIONS = [
  { verseKey: '2:255', body: "This verse reminds me that Allah's protection encompasses everything. Ayatul Kursi is not just a recitation — it is a declaration that nothing exists, moves, or breathes except by His permission. Reading it before sleep completely changed how I understand safety." },
  { verseKey: '1:1',   body: "Starting each day with Bismillah changes how I approach every task. It is not a ritual phrase — it is a conscious decision to begin everything in the name of the Most Merciful. I have started saying it before even opening my laptop." },
  { verseKey: '3:200', body: "Patience is not passive — it requires active effort and commitment. This verse says: be patient, and compete in patience. There is a rank to it. It is not just waiting — it is striving while you wait. That distinction changed everything for me." },
  { verseKey: '18:10', body: "Like the People of the Cave, sometimes retreating from the world is wisdom. They did not flee out of weakness — they fled to protect their faith. There are moments when stepping back from noise is the bravest thing a person can do." },
  { verseKey: '93:3',  body: "Your Lord has not forsaken you — this came at a moment I needed it most. It was revealed when the Prophet (PBUH) felt abandoned, and it reaches across fourteen centuries to say the same thing to me today. SubhanAllah." },
  { verseKey: '2:286', body: "Allah does not burden a soul beyond its capacity — I return to this weekly. Whenever I feel overwhelmed, this verse does not just comfort me — it reminds me that the weight I carry is exactly the weight I was built to carry." },
  { verseKey: '13:28', body: "Hearts find rest in the remembrance of Allah. I felt this during Fajr today. Not a philosophical statement — a physiological one. Something in the chest genuinely settles when you say His name. I cannot explain it. I just experience it." },
  { verseKey: '55:13', body: "Which of the favours of your Lord will you deny? A question worth sitting with every single day. Allah repeats it 31 times in this Surah — not because He forgot, but because we forget. The repetition is mercy, not redundancy." },
];

const SESSIONS = [
  { chapterNumber: 1,  endVerse: 7,  label: '5 days ago' },
  { chapterNumber: 2,  endVerse: 20, label: '4 days ago' },
  { chapterNumber: 2,  endVerse: 40, label: '3 days ago' },
  { chapterNumber: 2,  endVerse: 60, label: '2 days ago' },
  { chapterNumber: 2,  endVerse: 80, label: 'yesterday'  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n  🌱  Halaqa Demo Seed Script (pre-live)');
  console.log('  ────────────────────────────────────────────');
  console.log(`  Base URL  : ${BASE}`);
  console.log(`  JWT       : ${JWT.slice(0, 30)}...\n`);

  // ── STEP 1 — Create circle (/quran-reflect/v1/rooms/groups) ────────────
  console.log('  ─── STEP 1 — Creating circle');
  const circleRes = await call('POST', '/rooms/create', {
    name:        'Al-Noor Family Circle',
    url:         'al-noor-family-' + Date.now().toString(36),
    description: 'A family circle for daily Quran reading and reflection',
    type:        'family',
  }, "Circle 'Al-Noor Family Circle' created");

  const roomId = circleRes?.id ?? circleRes?.data?.id ?? null;
  if (!roomId) {
    console.log('  ⚠️   Could not extract room ID. Continuing with remaining steps...\n');
  } else {
    console.log(`  ℹ️   Room ID: ${roomId}\n`);
  }

  // ── STEP 2 — Create Khatm goal ─────────────────────────────────────────
  console.log('  ─── STEP 2 — Creating Khatm goal (30 Juz / 60 days)');
  if (roomId) {
    await call('POST', '/goals/khatm/create', {
      roomId, targetJuzCount: 30, deadlineDays: 60,
    }, 'Khatm goal created: 30 Juz in 60 days');
  } else {
    console.log('  ⏭️   Skipping — no room ID available');
  }
  console.log();

  // ── STEP 3 — Post reflections (/quran-reflect/v1/posts) ───────────────
  console.log('  ─── STEP 3 — Posting 8 reflections');
  for (const r of REFLECTIONS) {
    const { chapterId, verseNumber } = parseKey(r.verseKey);
    await call('POST', '/proxy/quran-reflect/v1/posts', {
      post: {
        body:           r.body,
        roomPostStatus: 1,
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

  // ── STEP 4 — Collections (/auth/v1/collections ✅) ─────────────────────
  console.log('  ─── STEP 4 — Creating collections');
  const col1Res = await call('POST', '/proxy/auth/v1/collections', { name: 'Verses of Comfort' },  "Collection 'Verses of Comfort' created");
  const col2Res = await call('POST', '/proxy/auth/v1/collections', { name: 'Friday Reminders' },    "Collection 'Friday Reminders' created");

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

  // ── STEP 5 — Reading sessions (/auth/v1/reading-sessions ✅) ───────────
  console.log('  ─── STEP 5 — Logging 5 reading sessions');
  for (const s of SESSIONS) {
    await call('POST', '/proxy/auth/v1/reading-sessions', {
      chapterNumber: s.chapterNumber,
      verseNumber:   s.endVerse,
    }, `Session logged: Ch.${s.chapterNumber} v.${s.endVerse} (${s.label})`);
  }
  console.log();

  // ── STEP 6 — Bookmarks (/auth/v1/bookmarks ✅) ─────────────────────────
  console.log('  ─── STEP 6 — Bookmarking 3 key verses');
  for (const vk of ['2:255', '13:28', '93:3']) {
    const { chapterId, verseNumber } = parseKey(vk);
    await call('POST', '/proxy/auth/v1/bookmarks', {
      key: chapterId, type: 'ayah', verseNumber, mushaf: 4,
    }, `Bookmarked ${vk}`);
  }
  console.log();

  console.log('  ────────────────────────────────────────────');
  console.log('  🎉  Seed complete!\n');
  console.log('  What was seeded:');
  console.log('    • 1 family circle  — Al-Noor Family Circle');
  console.log('    • 1 Khatm goal    — 30 Juz in 60 days');
  console.log('    • 8 reflections   — spread across key verses');
  console.log('    • 2 collections   — Verses of Comfort, Friday Reminders');
  console.log('    • 5 verses        — added to collections');
  console.log('    • 5 reading sessions');
  console.log('    • 3 bookmarks     — key verses bookmarked');
  console.log('\n  ➜  Open http://localhost:5173/dashboard to see the data.\n');
}

seed().catch((err) => {
  console.error('\n  ❌  Fatal error:', err.message);
  process.exit(1);
});