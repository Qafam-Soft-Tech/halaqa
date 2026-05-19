// ─────────────────────────────────────────────────────────────────────────────
// DailyVerse.jsx
// Full-screen immersive Daily Quran Share page — public, no auth required.
// Route: /daily
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { useNavigate }  from 'react-router-dom';
import { useQuery }     from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import axios            from 'axios';

// ── Helpers ──────────────────────────────────────────────────────────────────
const stripHtml = (str = '') => str.replace(/<[^>]*>/g, '').trim();

const fmtTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ── Reaction config ───────────────────────────────────────────────────────────
const REACTIONS = [
  { emoji: '❤️',        label: 'love'      },
  { emoji: '🤲',        label: 'dua'       },
  { emoji: '✨',        label: 'inspired'  },
  { emoji: 'سُبْحَانَ', label: 'subhaan'   },
  { emoji: 'آمِين',    label: 'ameen'     },
];

// ── ShareBtn — reusable share row button, fully inline-styled ─────────────────
// (Avoids Tailwind JIT arbitrary-value miss for brand hex colours)
const ShareBtn = ({ onClick, iconBg, iconBorder, rowBg, rowBorder, label, labelColor = '#fff', icon }) => {
  const [hov, setHov] = useState(false);
  const hovBg = rowBg
    ? rowBg.replace(/[\d.]+\)$/, m => String(Math.min(1, parseFloat(m) * 2)) + ')')
    : 'rgba(255,255,255,0.08)';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem',
        background: hov ? hovBg : (rowBg || 'transparent'),
        border: `1px solid ${rowBorder || 'rgba(255,255,255,0.10)'}`,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      <span style={{
        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
        background: iconBg || 'rgba(255,255,255,0.10)',
        border: iconBorder || 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {icon}
      </span>
      <span style={{ color: labelColor, fontWeight: 500, fontSize: '0.875rem' }}>{label}</span>
    </button>
  );
};

// ── Audio player hook ─────────────────────────────────────────────────────────
function useAudioPlayer(src) {
  const audioRef     = useRef(null);
  const hasCredited  = useRef(false);
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);   // 0–1
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);

  const onTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
    setProgress(el.duration ? el.currentTime / el.duration : 0);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    setDuration(audioRef.current?.duration || 0);
  }, []);

  const onEnded = useCallback(() => setPlaying(false), []);

  const toggle = useCallback(async (verseKey) => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      await el.play();
      setPlaying(true);
      // Credit reading activity once per session
      if (!hasCredited.current) {
        hasCredited.current = true;
        axios.post('/api/reading/activity', {
          seconds:  60,
          ranges:   [`${verseKey}-${verseKey}`],
          mushafId: 1,
        }).catch(() => {}); // fire-and-forget, ignore errors silently
      }
    }
  }, [playing]);

  const seek = useCallback((ratio) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    el.currentTime = ratio * el.duration;
  }, []);

  return {
    audioRef, playing, progress, current, duration,
    toggle, seek,
    handlers: { onTimeUpdate, onLoadedMetadata, onEnded },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function DailyVerse() {
  const navigate = useNavigate();

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:  ['daily-verse'],
    queryFn:   () => axios.get('/api/daily/today').then(r => r.data.data),
    staleTime: 60 * 60 * 1000,
  });

  // ── Audio ──────────────────────────────────────────────────────────────────
  const audio = useAudioPlayer(data?.reciter?.audioUrl);

  // ── Reactions ──────────────────────────────────────────────────────────────
  const [reactionCounts, setReactionCounts] = useState(
    Object.fromEntries(REACTIONS.map(r => [r.label, 0]))
  );
  const [bumpKey, setBumpKey] = useState({});

  const handleReaction = (label) => {
    setReactionCounts(prev => ({ ...prev, [label]: prev[label] + 1 }));
    setBumpKey(prev => ({ ...prev, [label]: (prev[label] || 0) + 1 }));
  };

  // ── Comment drawer ─────────────────────────────────────────────────────────
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [reflection,    setReflection]    = useState('');
  const [reflections,   setReflections]   = useState([]);
  const [submitting,    setSubmitting]    = useState(false);

  const submitReflection = async () => {
    if (!reflection.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('/api/proxy/user/v1/posts', {
        body:       reflection,
        verseKey:   data?.verse?.key,
        privacy:    'public',
      });
      setReflections(prev => [
        { text: reflection, time: 'Just now' },
        ...prev,
      ]);
      setReflection('');
    } catch {
      // show inline error if needed
    } finally {
      setSubmitting(false);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied,         setCopied]         = useState(false);

  const buildShareText = (d) => [
    '🌙 ' + d.dates.hijri,
    '📅 ' + d.dates.gregorian,
    '',
    d.verse.arabic,
    '',
    '« ' + d.verse.transliteration + ' »',
    '',
    '" ' + d.verse.translation.replace(/<[^>]*>/g, '') + ' "',
    '',
    '— ' + d.verse.surahName + ' ' + d.verse.key,
    '',
    '📖 Read & reflect on Halaqa: https://halaqaat.vercel.app/daily',
  ].join('\n');

  const handleShare = () => {
    // Only use the OS native share sheet on actual mobile devices.
    // On Windows/Mac/Linux desktop, navigator.share exists but opens the OS
    // share panel (a plain white dialog) which is a worse UX than our modal.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
      navigator.share({
        title: "Today's Verse — " + data.verse.surahName,
        text:  buildShareText(data),
        url:   'https://halaqaat.vercel.app/daily',
      }).catch((e) => {
        if (e.name !== 'AbortError') setShowShareModal(true);
      });
      return;
    }
    // Desktop: always show our custom share modal
    setShowShareModal(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildShareText(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className='fixed inset-0 bg-stone-950 flex flex-col items-center justify-center gap-4'>
        <div className='w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin' />
        <p className='text-white/60 text-sm tracking-widest uppercase'>
          Preparing today's verse…
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ERROR
  // ─────────────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className='fixed inset-0 bg-stone-950 flex flex-col items-center justify-center gap-4'>
        <p className='text-white/70 text-base'>Could not load today's verse. Please try again.</p>
        <button
          onClick={() => refetch()}
          className='px-6 py-2 rounded-full bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors'
        >
          Retry
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className='fixed inset-0 overflow-hidden'>

      {/* Hidden audio element */}
      <audio
        ref={audio.audioRef}
        src={data.reciter.audioUrl}
        preload='metadata'
        {...audio.handlers}
      />

      {/* ── LAYER 1: Background ─────────────────────────────────────────── */}
      <div className='absolute inset-0 z-0'>
        <img
          src={data.backgroundUrl}
          alt=''
          className='w-full h-full object-cover'
        />
        {/* Dark overlay */}
        <div className='absolute inset-0 bg-black/65' />
        {/* Bottom gradient */}
        <div className='absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent' />
      </div>

      {/* ── LAYER 2: Content ────────────────────────────────────────────── */}
      <div className='relative z-10 h-full flex flex-col px-6 py-8 overflow-y-auto'>

        {/* ── SECTION A: Top bar ──────────────────────────────────────── */}
        <div className='flex items-center justify-between'>
          {/* Logo */}
          <div className='flex items-center gap-2'>
            <div className='w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center'>
              <span className='text-amber-300 text-xs font-bold'>ح</span>
            </div>
            <span
              className='text-white font-semibold tracking-wide text-sm'
              style={{ fontFamily: 'Amiri, serif' }}
            >
              HALAQA
            </span>
          </div>

          {/* Back link */}
          <button
            onClick={() => navigate('/dashboard')}
            className='flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors group'
          >
            <span className='group-hover:-translate-x-0.5 transition-transform'>←</span>
            Back to Dashboard
          </button>
        </div>

        {/* ── SECTION B: Date display ──────────────────────────────────── */}
        <div className='text-center mt-8'>
          <p
            className='text-amber-300 font-semibold text-base tracking-wide'
            style={{ fontFamily: 'Amiri, serif' }}
          >
            {data.dates.hijri}
          </p>
          <p className='text-white/60 text-sm mt-1'>
            {data.dates.gregorian}
          </p>
          <div className='mt-4 mx-auto w-24 border-t border-white/20' />
        </div>

        {/* ── SECTION C: Verse block ───────────────────────────────────── */}
        <div className='flex-1 flex flex-col items-center justify-center text-center px-2'>

          {/* Surah label */}
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.5 }}
            className='text-white/50 text-xs tracking-widest uppercase mb-8'
          >
            {data.verse.surahName}&nbsp;&nbsp;·&nbsp;&nbsp;Verse {data.verse.key}
          </motion.p>

          {/* Arabic */}
          <motion.p
            dir='rtl'
            lang='ar'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.8 }}
            className='text-white text-3xl md:text-4xl leading-loose'
            style={{ fontFamily: 'Amiri, serif' }}
          >
            {data.verse.arabic}
          </motion.p>

          {/* Transliteration */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className='text-amber-200/80 text-base italic mt-6 max-w-2xl leading-relaxed'
          >
            {data.verse.transliteration}
          </motion.p>

          {/* Translation */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className='text-white/80 text-lg mt-4 max-w-2xl leading-relaxed font-light'
          >
            {stripHtml(data.verse.translation) || (
              <span className='text-white/40 italic text-base'>Translation unavailable</span>
            )}
          </motion.p>
        </div>

        {/* ── SECTION D: Audio player ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className='mt-6 w-full max-w-md mx-auto'
        >
          <div className='bg-white/10 backdrop-blur-md rounded-full px-5 py-3 flex items-center gap-4 border border-white/10'>

            {/* Play / Pause button */}
            <button
              onClick={() => audio.toggle(data.verse.key)}
              className='w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 hover:bg-amber-100 transition-colors shadow-md'
            >
              {audio.playing ? (
                <span className='text-stone-900 text-xs font-bold leading-none'>⏸</span>
              ) : (
                <span className='text-stone-900 text-xs font-bold leading-none pl-0.5'>▶</span>
              )}
            </button>

            {/* Middle: reciter + progress */}
            <div className='flex-1 min-w-0'>
              <p className='text-white/60 text-xs truncate mb-1.5'>
                {data.reciter.name}
              </p>
              {/* Progress bar */}
              <div
                className='w-full h-1 bg-white/20 rounded-full cursor-pointer'
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  audio.seek((e.clientX - rect.left) / rect.width);
                }}
              >
                <div
                  className='h-full bg-amber-400 rounded-full transition-all'
                  style={{ width: `${audio.progress * 100}%` }}
                />
              </div>
            </div>

            {/* Time */}
            <span className='text-white/50 text-xs shrink-0 tabular-nums'>
              {fmtTime(audio.current)}&nbsp;/&nbsp;{fmtTime(audio.duration)}
            </span>
          </div>
        </motion.div>

        {/* ── SECTION E: Action bar ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className='mt-5 flex flex-wrap items-center justify-center gap-3'
        >
          {/* Reactions */}
          <div className='bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3 border border-white/10'>
            {REACTIONS.map(({ emoji, label }) => (
              <motion.button
                key={label}
                onClick={() => handleReaction(label)}
                whileTap={{ scale: 1.4 }}
                className='flex flex-col items-center leading-none group'
              >
                <motion.span
                  key={bumpKey[label]}
                  initial={{ scale: 1.4, y: -4 }}
                  animate={{ scale: 1,   y: 0   }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className='text-lg'
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {emoji}
                </motion.span>
                <span className='text-white/50 text-[10px] mt-0.5 group-hover:text-white/80 transition-colors'>
                  {reactionCounts[label] || ''}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Reflect (comment) */}
          <button
            onClick={() => setDrawerOpen(true)}
            className='bg-white/10 backdrop-blur-sm rounded-full px-4 py-2.5 text-white text-sm flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-colors'
          >
            <span>💬</span> Reflect
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className='bg-emerald-600 hover:bg-emerald-500 rounded-full px-6 py-2.5 text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/40'
          >
            <span>📤</span> Share
          </button>
        </motion.div>

      </div>{/* end LAYER 2 */}

      {/* ── Comment Drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key='backdrop'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className='fixed inset-0 z-20 bg-black/50 backdrop-blur-sm'
            />

            {/* Drawer panel */}
            <motion.div
              key='drawer'
              initial={{ y: '100%' }}
              animate={{ y: 0        }}
              exit={{ y: '100%'      }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className='fixed bottom-0 left-0 right-0 z-30 bg-stone-900 rounded-t-3xl border-t border-white/10 px-6 pt-4 pb-8 max-h-[75vh] flex flex-col'
            >
              {/* Handle */}
              <div className='w-10 h-1 bg-white/20 rounded-full mx-auto mb-4' />

              <h3
                className='text-white font-semibold text-lg mb-4'
                style={{ fontFamily: 'Amiri, serif' }}
              >
                Circle Reflections
              </h3>

              {/* Existing reflections */}
              <div className='flex-1 overflow-y-auto space-y-3 mb-4'>
                {reflections.length === 0 ? (
                  <p className='text-white/40 text-sm italic text-center py-6'>
                    Be the first to share a reflection on this verse.
                  </p>
                ) : (
                  reflections.map((r, i) => (
                    <div key={i} className='bg-white/5 rounded-2xl p-4'>
                      <p className='text-white/80 text-sm leading-relaxed'>{r.text}</p>
                      <p className='text-white/30 text-xs mt-2'>{r.time}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className='flex gap-3 items-end'>
                <textarea
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                  placeholder='Share your reflection…'
                  rows={2}
                  className='flex-1 bg-white/10 text-white placeholder-white/30 text-sm rounded-2xl px-4 py-3 resize-none border border-white/10 focus:border-amber-400/50 focus:outline-none transition-colors'
                />
                <button
                  onClick={submitReflection}
                  disabled={submitting || !reflection.trim()}
                  className='px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-500 transition-colors'
                >
                  {submitting ? '…' : 'Post'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Share Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <>
            {/* Overlay — inline style so bg always applies regardless of JIT */}
            <motion.div
              key='share-overlay'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
              className='fixed inset-0 z-40'
            />

            {/* Centering shell — pointer-events-none so overlay click-to-close works */}
            <motion.div
              key='share-card'
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.92, y: 20    }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className='fixed inset-0 z-50 flex items-center justify-center px-4'
              style={{ pointerEvents: 'none' }}
            >
              {/* Card — inline bg so it's never white regardless of Tailwind scan */}
              <div
                style={{
                  backgroundColor: '#1c1917',   /* stone-900 */
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                  width: '100%',
                  maxWidth: '24rem',
                  position: 'relative',
                  pointerEvents: 'auto',
                }}
              >
                {/* Close × */}
                <button
                  onClick={() => setShowShareModal(false)}
                  style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    width: '2rem', height: '2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', border: 'none', background: 'transparent',
                    color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '1.25rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent'; }}
                  aria-label='Close share menu'
                >
                  ×
                </button>

                {/* Title */}
                <h3 style={{ fontFamily: 'Amiri, serif', color: '#fff', fontWeight: 600, fontSize: '1.125rem', marginBottom: '1.25rem', paddingRight: '2rem' }}>
                  Share Today's Verse
                </h3>

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                  {/* WhatsApp */}
                  <ShareBtn
                    onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(buildShareText(data)), '_blank')}
                    iconBg='#25D366'
                    rowBg='rgba(37,211,102,0.10)'
                    rowBorder='rgba(37,211,102,0.22)'
                    label='Share to WhatsApp'
                    icon={
                      <svg viewBox='0 0 24 24' fill='white' style={{ width: 20, height: 20 }}>
                        <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'/>
                      </svg>
                    }
                  />

                  {/* Facebook */}
                  <ShareBtn
                    onClick={() => window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://halaqaat.vercel.app/daily'), '_blank')}
                    iconBg='#1877F2'
                    rowBg='rgba(24,119,242,0.10)'
                    rowBorder='rgba(24,119,242,0.22)'
                    label='Share to Facebook'
                    icon={
                      <svg viewBox='0 0 24 24' fill='white' style={{ width: 20, height: 20 }}>
                        <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'/>
                      </svg>
                    }
                  />

                  {/* X / Twitter */}
                  <ShareBtn
                    onClick={() => {
                      const tweetText = data.verse.surahName + ' ' + data.verse.key
                        + '\n\n' + data.verse.translation.replace(/<[^>]*>/g, '').slice(0, 200)
                        + '...\n\nhttps://halaqaat.vercel.app/daily #Quran #Halaqa';
                      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText), '_blank');
                    }}
                    iconBg='#000'
                    iconBorder='1px solid rgba(255,255,255,0.18)'
                    rowBg='rgba(255,255,255,0.04)'
                    rowBorder='rgba(255,255,255,0.10)'
                    label='Post to X'
                    icon={
                      <svg viewBox='0 0 24 24' fill='white' style={{ width: 16, height: 16 }}>
                        <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.264 5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z'/>
                      </svg>
                    }
                  />

                  {/* Copy to clipboard */}
                  <ShareBtn
                    onClick={handleCopy}
                    iconBg='rgba(16,185,129,0.18)'
                    iconBorder='1px solid rgba(16,185,129,0.30)'
                    rowBg='rgba(16,185,129,0.08)'
                    rowBorder='rgba(16,185,129,0.20)'
                    label={copied ? 'Copied!' : 'Copy to clipboard'}
                    labelColor={copied ? '#34d399' : '#fff'}
                    icon={<span style={{ fontSize: 18 }}>{copied ? '✅' : '📋'}</span>}
                  />

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}