const express = require('express');
const axios = require('axios');
const router = express.Router();

const QURAN_CONTENT_BASE =
  process.env.QURAN_CONTENT_API_BASE || 'https://api.qurancdn.com';

const BACKGROUNDS = [
  'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=1200', // Mecca aerial
  'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=1200', // Mosque interior
  'https://images.unsplash.com/photo-1609158774391-6b4a2c7de98b?w=1200', // Quran closeup
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200', // Blue mosque
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200', // Dome interior
  'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200', // Medina
  'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1200', // Arabic calligraphy
  'https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=1200', // Stars mosque
  'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=1200', // Mosque at night
  'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200', // Geometric tiles
];

// GET /api/daily/today — PUBLIC, no auth middleware
router.get('/today', async (req, res) => {
  try {
    // ─── STEP A: Date info ────────────────────────────────────────────────────
    const now = new Date();

    const gregorianDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const hijriRaw = now.toLocaleDateString('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const hijriFormatted = hijriRaw.includes('AH') ? hijriRaw : hijriRaw + ' AH';

    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));

    // ─── STEP B: Fetch verse by key derived from dayOfYear ───────────────────
    const chapterNumber = (dayOfYear % 114) + 1;
    const verseInChapter = (dayOfYear % 7) + 1;
    const verseKey = `${chapterNumber}:${verseInChapter}`;

    const verseRes = await axios.get(
      `${QURAN_CONTENT_BASE}/api/v4/verses/by_key/${verseKey}`,
      {
        params: {
          words: 'true',
          translations: '20,131',       // Saheeh International (English)
          fields: 'text_uthmani,verse_key,chapter_id',
          word_fields: 'text_uthmani,transliteration',
        },
      }
    );

    const verse = verseRes.data.verse;
    const arabicText = verse.text_uthmani;
      const rawTranslation = verse.translations?.find(t => t.text && t.text.length > 10)?.text || ''
      const translation = rawTranslation.replace(/<[^>]*>/g, '').trim()
    const transliteration = verse.words
      ?.filter((w) => w.char_type_name !== 'end')
      ?.map((w) => w.transliteration?.text || '')
      ?.join(' ') || '';

    // ─── STEP C: Fetch chapter name ───────────────────────────────────────────
    const chapterId = verse.chapter_id;

    const chapterRes = await axios.get(
      `${QURAN_CONTENT_BASE}/api/v4/chapters/${chapterId}`,
      { params: { language: 'en' } }
    );

    const surahName = chapterRes.data.chapter.name_simple;    // e.g. 'Al-Baqarah'
    const surahNameArabic = chapterRes.data.chapter.name_arabic;

    // ─── STEP D: Fetch recitations and select daily recitation ───────────────
    const recitationsRes = await axios.get(
      `${QURAN_CONTENT_BASE}/api/v4/resources/recitations`
    );

    const recitations = recitationsRes.data.recitations;
    const recitation = recitations[dayOfYear % recitations.length];

    const audioRes = await axios.get(
      `${QURAN_CONTENT_BASE}/api/v4/recitations/${recitation.id}/by_ayah/${verseKey}`
    );

      const rawUrl = audioRes.data.audio_files?.[0]?.url || '';
      const audioUrl = rawUrl.startsWith('http')
          ? rawUrl
          : rawUrl.startsWith('//')
              ? `https:${rawUrl}`
              : `https://verses.quran.foundation/${rawUrl}`;

    // ─── STEP E: Select daily background ─────────────────────────────────────
    const backgroundUrl = BACKGROUNDS[dayOfYear % BACKGROUNDS.length];

    // ─── STEP F: Return assembled response ───────────────────────────────────
    res.json({
      success: true,
      data: {
        dates: {
          hijri: hijriFormatted,
          gregorian: gregorianDate,
          dayOfYear,
        },
        verse: {
          key: verseKey,
          arabic: arabicText,
          transliteration,
          translation,
          surahName,
          surahNameArabic,
          chapterId,
        },
        reciter: {
          id: recitation.id,
          name: recitation.reciter_name,
          audioUrl,
        },
        backgroundUrl,
      },
    });
  } catch (err) {
    console.error('[daily/today] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;