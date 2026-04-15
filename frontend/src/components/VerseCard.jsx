import { useState } from 'react';
import api from '@/lib/api';

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, onDone }) => {
  setTimeout(onDone, 2500);
  return (
    <div className='fixed bottom-6 right-6 z-50 bg-emerald-700 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2'>
      <span>✓</span>
      {message}
    </div>
  );
};

// ── Parse verseKey "2:255" → { chapterId: 2, verseNumber: 255 } ──────────────
const parseVerseKey = (verseKey) => {
  if (!verseKey) return null;
  const parts = verseKey.split(':');
  if (parts.length !== 2) return null;
  return { chapterId: parseInt(parts[0]), verseNumber: parseInt(parts[1]) };
};

// ── VerseCard ─────────────────────────────────────────────────────────────────
const VerseCard = ({ verse, translation, tafsir, annotations = [], onAddAnnotation }) => {
  const [showTafsir,       setShowTafsir]       = useState(false);
  const [showNoteBox,      setShowNoteBox]       = useState(false);
  const [noteText,         setNoteText]          = useState('');
  const [submitting,       setSubmitting]        = useState(false);
  const [bookmarked,       setBookmarked]        = useState(false);
  const [bookmarking,      setBookmarking]       = useState(false);
  const [showBookmarkToast, setShowBookmarkToast] = useState(false);

  // ── Bookmark ────────────────────────────────────────────────────────────
  // API: POST /auth/v1/bookmarks
  // Body: { key: chapterId, type: 'ayah', verseNumber, mushaf: 4 }
  const handleBookmark = async () => {
    if (bookmarked || bookmarking) return;
    setBookmarking(true);

    const parsed = parseVerseKey(verse.verse_key);
    if (parsed) {
      try {
        await api.post('/proxy/auth/v1/bookmarks', {
          key:         parsed.chapterId,
          type:        'ayah',
          verseNumber: parsed.verseNumber,
          mushaf:      4, // UthmaniHafs
        });
      } catch {
        // Silently fail — bookmark may already exist
      }
    }

    setBookmarked(true);
    setShowBookmarkToast(true);
    setBookmarking(false);
  };

  const handleSubmitNote = async () => {
    if (!noteText.trim()) return;
    setSubmitting(true);
    await onAddAnnotation(verse.verse_key, noteText.trim());
    setNoteText('');
    setShowNoteBox(false);
    setSubmitting(false);
  };

  return (
    <>
      <div className='bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-6 transition-all'>

        {/* ── Header row: verse key + bookmark ───────────────────────── */}
        <div className='flex items-center justify-between mb-4'>
          <span className='text-xs text-stone-500 bg-stone-800 px-2.5 py-1 rounded-full'>
            {verse.verse_key}
          </span>

          <button
            onClick={handleBookmark}
            disabled={bookmarking}
            title={bookmarked ? 'Bookmarked' : 'Bookmark this verse'}
            className={`p-1.5 rounded-lg transition-all ${
              bookmarked
                ? 'text-emerald-400'
                : 'text-stone-600 hover:text-emerald-400 hover:bg-stone-800'
            }`}
          >
            {bookmarked ? (
              <svg className='w-4 h-4' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M5 3a2 2 0 00-2 2v16l9-4 9 4V5a2 2 0 00-2-2H5z'/>
              </svg>
            ) : (
              <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M5 3a2 2 0 00-2 2v16l9-4 9 4V5a2 2 0 00-2-2H5z'/>
              </svg>
            )}
          </button>
        </div>

        {/* ── Arabic text ─────────────────────────────────────────────── */}
        <p
          dir='rtl'
          className='text-right text-2xl leading-loose text-white mb-4'
          style={{ fontFamily: '"Amiri", "Scheherazade New", serif', lineHeight: '2.5' }}
        >
          {verse.text_uthmani}
        </p>

        {/* ── Translation ─────────────────────────────────────────────── */}
        {translation && (
          <p className='text-stone-400 text-sm leading-relaxed italic border-l-2 border-emerald-800 pl-4 mb-4'>
            {translation.text?.replace(/<[^>]+>/g, '') || '—'}
          </p>
        )}

        {/* ── Tafsir toggle ────────────────────────────────────────────── */}
        {tafsir && (
          <div className='mb-4'>
            <button
              onClick={() => setShowTafsir(!showTafsir)}
              className='text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5'
            >
              <span>{showTafsir ? '▼' : '▶'}</span>
              {showTafsir ? 'Hide Tafsir' : 'Show Tafsir'}
            </button>
            {showTafsir && (
              <div className='mt-3 bg-stone-800/50 rounded-xl p-4'>
                <p className='text-stone-300 text-sm leading-relaxed'>
                  {tafsir.text?.replace(/<[^>]+>/g, '') || '—'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Annotations ─────────────────────────────────────────────── */}
        {annotations.length > 0 && (
          <div className='mb-4 space-y-2'>
            {annotations.map((ann, i) => (
              <div key={i} className='bg-amber-900/20 border border-amber-800/30 rounded-lg px-4 py-2.5'>
                <p className='text-amber-200 text-sm'>{ann.note}</p>
                <div className='flex items-center gap-2 mt-1'>
                  <span className='text-amber-600 text-xs font-medium'>{ann.username}</span>
                  <span className='text-stone-600 text-xs'>
                    {ann.timestamp ? new Date(ann.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Add Note ────────────────────────────────────────────────── */}
        <div>
          {!showNoteBox ? (
            <button
              onClick={() => setShowNoteBox(true)}
              className='text-xs text-stone-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5'
            >
              <span>✎</span> Add Note
            </button>
          ) : (
            <div className='mt-2'>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder='Share your reflection on this verse...'
                rows={3}
                className='w-full bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white placeholder-stone-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors resize-none'
              />
              <div className='flex gap-2 mt-2'>
                <button
                  onClick={handleSubmitNote}
                  disabled={submitting || !noteText.trim()}
                  className='text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-all'
                >
                  {submitting ? 'Saving...' : 'Save Note'}
                </button>
                <button
                  onClick={() => { setShowNoteBox(false); setNoteText(''); }}
                  className='text-xs text-stone-500 hover:text-stone-300 px-3 py-1.5 transition-colors'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showBookmarkToast && (
        <Toast
          message='Verse bookmarked'
          onDone={() => setShowBookmarkToast(false)}
        />
      )}
    </>
  );
};

export default VerseCard;