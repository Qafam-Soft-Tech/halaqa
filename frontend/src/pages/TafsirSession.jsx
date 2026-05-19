import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import DashboardLayout from '@/components/DashboardLayout';
import VerseCard from '@/components/VerseCard';
import useSessionData from '@/hooks/useSessionData';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// ── Surah names 1-114 ─────────────────────────────────────────────────────────
const SURAHS = [
  'Al-Fatihah','Al-Baqarah','Ali \'Imran','An-Nisa','Al-Ma\'idah','Al-An\'am',
  'Al-A\'raf','Al-Anfal','At-Tawbah','Yunus','Hud','Yusuf','Ar-Ra\'d','Ibrahim',
  'Al-Hijr','An-Nahl','Al-Isra','Al-Kahf','Maryam','Ta-Ha','Al-Anbiya',
  'Al-Hajj','Al-Mu\'minun','An-Nur','Al-Furqan','Ash-Shu\'ara','An-Naml',
  'Al-Qasas','Al-\'Ankabut','Ar-Rum','Luqman','As-Sajdah','Al-Ahzab','Saba',
  'Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura',
  'Az-Zukhruf','Ad-Dukhan','Al-Jathiyah','Al-Ahqaf','Muhammad','Al-Fath',
  'Al-Hujurat','Qaf','Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman',
  'Al-Waqi\'ah','Al-Hadid','Al-Mujadila','Al-Hashr','Al-Mumtahanah','As-Saf',
  'Al-Jumu\'ah','Al-Munafiqun','At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk',
  'Al-Qalam','Al-Haqqah','Al-Ma\'arij','Nuh','Al-Jinn','Al-Muzzammil',
  'Al-Muddaththir','Al-Qiyamah','Al-Insan','Al-Mursalat','An-Naba','An-Nazi\'at',
  'Abasa','At-Takwir','Al-Infitar','Al-Mutaffifin','Al-Inshiqaq','Al-Buruj',
  'At-Tariq','Al-A\'la','Al-Ghashiyah','Al-Fajr','Al-Balad','Ash-Shams',
  'Al-Layl','Ad-Duhaa','Ash-Sharh','At-Tin','Al-\'Alaq','Al-Qadr','Al-Bayyinah',
  'Az-Zalzalah','Al-\'Adiyat','Al-Qari\'ah','At-Takathur','Al-\'Asr','Al-Humazah',
  'Al-Fil','Quraysh','Al-Ma\'un','Al-Kawthar','Al-Kafirun','An-Nasr','Al-Masad',
  'Al-Ikhlas','Al-Falaq','An-Nas',
];

// ── NEW [Feature C]: Pure helper — merge verse keys into range strings ─────────
// e.g. ['18:1','18:2','18:3','18:7'] → ['18:1-18:3', '18:7-18:7']
// Handles multi-chapter keys; sorts by chapter then verse before merging.
const mergeVerseRanges = (verseKeys) => {
  if (verseKeys.length === 0) return [];

  const parsed = verseKeys
    .map((k) => {
      const [ch, v] = k.split(':');
      return { chapter: parseInt(ch, 10), verse: parseInt(v, 10), key: k };
    })
    .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

  const ranges = [];
  let start = parsed[0];
  let end   = parsed[0];

  for (let i = 1; i < parsed.length; i++) {
    const curr = parsed[i];
    const isConsecutive =
      curr.chapter === end.chapter && curr.verse === end.verse + 1;

    if (isConsecutive) {
      end = curr;
    } else {
      ranges.push(`${start.key}-${end.key}`);
      start = curr;
      end   = curr;
    }
  }
  ranges.push(`${start.key}-${end.key}`);

  return ranges;
};

// ── Audio Player ──────────────────────────────────────────────────────────────
// UNCHANGED
const AudioPlayer = ({ audio }) => {
  const audioRef                = useRef(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);

  const audioUrl = audio?.audio_file?.audio_url
    ?? audio?.audio_files?.[0]?.audio_url
    ?? null;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  if (!audioUrl) return (
    <div className='flex items-center gap-3 px-4 py-2 bg-stone-800 rounded-xl text-stone-500 text-xs flex-1'>
      🎵 Audio not available for this recitation
    </div>
  );

  return (
    <div className='flex items-center gap-3 flex-1'>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        className='w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 rounded-full text-white text-sm transition-all shrink-0'
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className='flex-1 bg-stone-700 rounded-full h-1.5 overflow-hidden'>
        <div
          className='h-full bg-emerald-400 rounded-full transition-all'
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className='text-stone-500 text-xs shrink-0'>
        {playing ? 'Playing' : 'Paused'}
      </span>
    </div>
  );
};

// ── Session Complete Banner ───────────────────────────────────────────────────
// UNCHANGED
const SessionCompleteBanner = ({ onDismiss }) => (
  <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-800 border border-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm w-full mx-4'>
    <span className='text-2xl'>✅</span>
    <div className='flex-1'>
      <p className='font-semibold text-sm'>Session logged!</p>
      <p className='text-emerald-300 text-xs mt-0.5'>Your progress is saved.</p>
    </div>
    <button
      onClick={onDismiss}
      className='text-emerald-300 hover:text-white text-lg transition-colors'
    >
      ✕
    </button>
  </div>
);

// ── NEW [Feature C]: Activity Toast ──────────────────────────────────────────
// Separate from SessionCompleteBanner — shows the flushActivity confirmation.
const ActivityToast = ({ message, onDismiss }) => (
  <div className='fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-stone-800 border border-emerald-700/60 text-white px-5 py-3 rounded-2xl shadow-2xl max-w-xs w-full mx-4 animate-in fade-in slide-in-from-bottom-2 duration-300'>
    <span className='text-lg'>📖</span>
    <p className='flex-1 text-sm font-medium text-emerald-300'>{message}</p>
    <button
      onClick={onDismiss}
      className='text-stone-500 hover:text-white text-base transition-colors'
    >
      ✕
    </button>
  </div>
);

// ── TafsirSession ─────────────────────────────────────────────────────────────
const TafsirSession = () => {
  const { roomId }                      = useParams();
  const { user }                        = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const surahNumber                     = searchParams.get('surah') || '1';

  // ── Existing state ────────────────────────────────────────────────────────
  const [onlineCount,        setOnlineCount]        = useState(1);
  const [annotations,        setAnnotations]        = useState({});
  const [sessionLogged,      setSessionLogged]      = useState(false);
  const [loggingSession,     setLoggingSession]     = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);

  // ── NEW [Feature A]: Current verse state ─────────────────────────────────
  const [currentVerseKey, setCurrentVerseKey] = useState(null);

  // ── NEW [Feature C]: Activity toast state ────────────────────────────────
  const [activityToast, setActivityToast] = useState(null);

  // ── Existing refs ─────────────────────────────────────────────────────────
  const sessionStartRef = useRef(Date.now());
  const socketRef       = useRef(null);

  // ── NEW [Feature A]: IntersectionObserver + debounce refs ────────────────
  // verseElsRef: maps verseKey → DOM element, populated by ref callbacks below
  const verseElsRef     = useRef({});
  const observerRef     = useRef(null);
  const debounceTimerRef = useRef(null);

  // ── NEW [Feature B]: Active time + read ranges refs ──────────────────────
  const activeSecondsRef = useRef(0);  // total focused seconds this session
  const readRangesRef    = useRef([]); // accumulated verse keys seen
  const intervalRef      = useRef(null);

  // ── NEW [Feature C]: Mounted guard (prevents setState after unmount) ──────
  const mountedRef = useRef(true);

  const { verses, translations, tafsirs, audio, isLoading } = useSessionData(surahNumber);

  // ── NEW [Feature C]: flushActivity ───────────────────────────────────────
  // Called by: Complete Session button, component unmount, beforeunload.
  // Posts accumulated active time + read ranges to /api/reading/activity.
  const flushActivity = useCallback(async () => {
    // Stop the active-time interval so it doesn't keep incrementing
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Bail if below minimum thresholds
    if (activeSecondsRef.current < 10 || readRangesRef.current.length === 0) return;

    // Snapshot and immediately reset refs to prevent double-flush
    const seconds = activeSecondsRef.current;
    const ranges  = mergeVerseRanges([...readRangesRef.current]);
    activeSecondsRef.current  = 0;
    readRangesRef.current     = [];

    try {
      // Route through /api/reading/activity (not the proxy directly) so the
      // backend can also write to member_activity for CircleProgressBoard.
      await api.post('/reading/activity', {
        type: 'QURAN', seconds, ranges, mushafId: 1,
        roomId: roomId || null,   // roomId from useParams — links cache to circle
      });
    } catch {
      // Silent fail — activity logging is non-critical
    }

    // Only update UI if the component is still mounted
    if (mountedRef.current) {
      setActivityToast('Session logged! JazakAllah Khayran 📖');
      setTimeout(() => {
        if (mountedRef.current) setActivityToast(null);
      }, 4000);
    }
  }, []);

  // ── NEW [Feature C]: Mark unmounted on teardown ───────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── NEW [Feature B]: Active-time interval (mounts once) ──────────────────
  // Increments every 3 s only while the document has focus.
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.hasFocus()) {
        activeSecondsRef.current += 3;
      }
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── NEW [Features A + B]: IntersectionObserver ───────────────────────────
  // Re-runs whenever verses changes (new surah loaded).
  // Observes all verse wrapper divs; picks the most-visible verse each tick.
  useEffect(() => {
    if (verses.length === 0) return;

    // Clean up any previous observer
    if (observerRef.current) observerRef.current.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry currently most visible in the viewport
        let best = null;
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            (!best || entry.intersectionRatio > best.intersectionRatio)
          ) {
            best = entry;
          }
        });

        if (!best) return;
        const vk = best.target.dataset.verseKey;
        if (!vk) return;

        // Feature A: update current verse key (triggers debounced bookmark POST)
        setCurrentVerseKey(vk);

        // Feature B: accumulate seen verses for activity flush
        if (!readRangesRef.current.includes(vk)) {
          readRangesRef.current.push(vk);
        }
      },
      // Fire at multiple thresholds so we pick up partial visibility changes
      { threshold: [0, 0.25, 0.5, 0.75, 1.0] },
    );

    observerRef.current = observer;

    // Observe all currently-mounted verse elements
    Object.values(verseElsRef.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [verses]);

  // ── NEW [Feature A]: Debounced bookmark POST ──────────────────────────────
  // When currentVerseKey changes, wait 1500 ms then POST to /api/reading/session
  // so the QF API updates the user's "continue reading" position.
  useEffect(() => {
    if (!currentVerseKey) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      // QF requires: chapterNumber, startVerseKey, endVerseKey, duration
      // We send current verse as both start+end (position bookmark), duration=0
      const [ch, v] = currentVerseKey.split(':');
      try {
        // QF API only accepts chapterNumber + verseNumber — nothing else
        await api.post('/reading/session', {
          chapterNumber: parseInt(ch, 10),
          verseNumber:   parseInt(v, 10),
        });
      } catch {
        // Silent fail — bookmark update is a best-effort enhancement
      }
    }, 1500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [currentVerseKey]);

  // ── NEW [Feature C]: Component unmount → flush activity ──────────────────
  // flushActivity resets refs synchronously, so if beforeunload already fired
  // and reset them, this becomes a no-op (guards against double-flush).
  useEffect(() => {
    return () => {
      flushActivity();
    };
  }, [flushActivity]);

  // ── NEW [Feature C]: window beforeunload → sendBeacon flush ──────────────
  // sendBeacon is the only reliable delivery mechanism during page close.
  // Refs are reset synchronously so the unmount cleanup (above) exits early.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeSecondsRef.current < 10 || readRangesRef.current.length === 0) return;

      const ranges  = mergeVerseRanges([...readRangesRef.current]);
      const payload = JSON.stringify({
        seconds:  activeSecondsRef.current,
        ranges,
        mushafId: 1,
      });

      // Reset refs first — prevents the unmount cleanup from double-flushing
      activeSecondsRef.current = 0;
      readRangesRef.current    = [];

      navigator.sendBeacon(
        '/api/reading/activity',
        new Blob([JSON.stringify({ type: 'QURAN', seconds: activeSecondsRef.current, ranges, mushafId: 1, roomId: roomId || null })], { type: 'application/json' }),
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── MODIFIED: Reset session timer + NEW tracking refs on surah change ─────
  useEffect(() => {
    sessionStartRef.current = Date.now();
    setSessionLogged(false);
    // NEW: reset all three trackers so a surah switch starts fresh
    activeSecondsRef.current = 0;
    readRangesRef.current    = [];
    setCurrentVerseKey(null);
  }, [surahNumber]);

  // ── Socket.io ─────────────────────────────────────────────────────────────
  // UNCHANGED
  useEffect(() => {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join-session', { roomId });

    socket.on('annotation-received', ({ verseKey, note, username, timestamp }) => {
      setAnnotations((prev) => ({
        ...prev,
        [verseKey]: [...(prev[verseKey] ?? []), { note, username, timestamp }],
      }));
    });

    socket.on('session-members', ({ count }) => setOnlineCount(count));

    return () => {
      socket.off('annotation-received');
      socket.emit('leave-session', { roomId });
      socket.disconnect();
    };
  }, [roomId]);

  // ── Add annotation ────────────────────────────────────────────────────────
  // UNCHANGED
  const handleAddAnnotation = async (verseKey, note) => {
    setAnnotations((prev) => ({
      ...prev,
      [verseKey]: [
        ...(prev[verseKey] ?? []),
        { note, username: user?.username ?? 'You', timestamp: new Date().toISOString() },
      ],
    }));

    try {
      // QF Notes API requires: body, saveToQR (bool), and ranges (not verseKey).
      // ranges format: "chapter:verse-chapter:verse" e.g. "2:255-2:255"
      await api.post('/proxy/auth/v1/notes', {
        body:     note,
        saveToQR: false,
        ranges:   [`${verseKey}-${verseKey}`],
      });
    } catch {
      // Note saved locally even if API call fails
    }

    socketRef.current?.emit('new-annotation', {
      roomId, verseKey, note,
      username: user?.username ?? 'Anonymous',
    });
  };

  // ── MODIFIED: Complete Session ────────────────────────────────────────────
  // Existing QF /reading-sessions POST is preserved.
  // NEW: also calls flushActivity() to post active time + verse ranges.
  const handleCompleteSession = async () => {
    if (loggingSession || sessionLogged || verses.length === 0) return;
    setLoggingSession(true);

    const firstVerse = verses[0];
    const lastVerse  = verses[verses.length - 1];
    const duration   = Math.floor((Date.now() - sessionStartRef.current) / 1000);

    // QF only accepts chapterNumber + verseNumber — nothing else.
    // Route through /api/reading/session (same as the debounced bookmark above).
    try {
      await api.post('/reading/session', {
        chapterNumber: parseInt(surahNumber, 10),
        verseNumber:   parseInt(firstVerse.verse_key?.split(':')[1] ?? 1, 10),
      });
    } catch {
      // Still show success — session tracked locally
    }

    // NEW [Feature C]: flush active-time + verse-range activity log
    await flushActivity();

    setSessionLogged(true);
    setShowCompleteBanner(true);
    setLoggingSession(false);
  };

  const handleSurahChange = (e) => {
    setSearchParams({ surah: e.target.value });
    setAnnotations({});
  };

  // Format elapsed time as mm:ss — UNCHANGED
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [surahNumber]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <DashboardLayout>
      {/* ── Session toolbar ───────────────────────────────────────── */}
      {/* UNCHANGED */}
      <div className='flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 bg-stone-900 border border-stone-800 rounded-2xl p-4'>

        {/* Surah selector */}
        <div className='flex items-center gap-3 shrink-0'>
          <label className='text-stone-400 text-sm'>Surah</label>
          <select
            value={surahNumber}
            onChange={handleSurahChange}
            className='bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors'
          >
            {SURAHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}. {name}</option>
            ))}
          </select>
        </div>

        {/* Audio */}
        <div className='flex-1 w-full'>
          <AudioPlayer audio={audio} />
        </div>

        {/* Session timer + online count */}
        <div className='flex items-center gap-3 shrink-0'>
          <span className='text-stone-500 text-xs font-mono'>{formatTime(elapsed)}</span>
          <div className='flex items-center gap-2 bg-emerald-900/30 border border-emerald-800/40 px-3 py-1.5 rounded-full'>
            <div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
            <span className='text-emerald-400 text-xs font-medium'>{onlineCount} online</span>
          </div>
        </div>
      </div>

      {/* ── Surah title + Complete Session button ─────────────────── */}
      <div className='relative flex items-center justify-center mb-8'>
        {/* Title — always centered */}
        <div className='text-center'>
          <h1 className='text-white font-bold text-xl'>
            {surahNumber}. {SURAHS[Number(surahNumber) - 1]}
          </h1>
          <p className='text-stone-500 text-xs mt-1'>Live Session · Room {roomId}</p>
        </div>

        {/* Complete Session button — absolutely positioned top-right */}
        {verses.length > 0 && !sessionLogged && (
          <button
            onClick={handleCompleteSession}
            disabled={loggingSession}
            className='absolute right-0 flex items-center gap-2 bg-stone-800 hover:bg-emerald-700 border border-stone-700 hover:border-emerald-600 text-stone-300 hover:text-white text-xs font-medium px-4 py-2 rounded-xl transition-all'
          >
            {loggingSession ? (
              <div className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin' />
            ) : (
              <span>✓</span>
            )}
            {loggingSession ? 'Logging...' : 'Complete Session'}
          </button>
        )}

        {sessionLogged && (
          <span className='absolute right-0 flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-900/30 border border-emerald-800/40 px-3 py-2 rounded-xl'>
            ✓ Session logged
          </span>
        )}
      </div>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {isLoading && (
        <div className='flex flex-col items-center justify-center py-24 gap-4'>
          <div className='w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin' />
          <p className='text-stone-500 text-sm'>Loading verses...</p>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!isLoading && verses.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 text-center bg-stone-900 border border-stone-800 rounded-2xl'>
          <div className='text-4xl mb-3'>📖</div>
          <p className='text-stone-400 text-sm mb-1'>No verses found for this Surah.</p>
          <p className='text-stone-600 text-xs'>Please try selecting a different Surah.</p>
        </div>
      )}

      {/* ── Verse list ────────────────────────────────────────────── */}
      {/*
        MODIFIED [Feature A + B]:
        Each VerseCard is wrapped in a <div> that:
          • carries data-verse-key for the IntersectionObserver callback
          • uses a ref callback to register/unregister the element in verseElsRef
        Everything else (key, VerseCard props) is unchanged.
      */}
      {!isLoading && verses.length > 0 && (
        <div className='space-y-4'>
          {verses.map((verse, i) => {
            const vk = verse.verse_key;
            return (
              <div
                key={verse.id ?? vk ?? i}
                data-verse-key={vk}
                ref={(el) => {
                  // Register when mounting, clean up when unmounting
                  if (el) {
                    verseElsRef.current[vk] = el;
                    // If observer already exists, start observing the new element
                    if (observerRef.current) observerRef.current.observe(el);
                  } else {
                    delete verseElsRef.current[vk];
                  }
                }}
              >
                <VerseCard
                  verse={verse}
                  translation={translations?.[i] ?? null}
                  tafsir={tafsirs?.[i] ?? null}
                  annotations={annotations[vk] ?? []}
                  onAddAnnotation={handleAddAnnotation}
                />
              </div>
            );
          })}

          {/* Bottom Complete Session button (after all verses) — UNCHANGED */}
          {!sessionLogged && (
            <div className='flex justify-center pt-4'>
              <button
                onClick={handleCompleteSession}
                disabled={loggingSession}
                className='flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm px-8 py-3 rounded-xl transition-all hover:-translate-y-0.5'
              >
                {loggingSession ? (
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                ) : '✓'}
                {loggingSession ? 'Logging session...' : 'Complete Session'}
              </button>
            </div>
          )}

          {sessionLogged && (
            <div className='flex justify-center pt-4'>
              <div className='flex items-center gap-2 text-emerald-400 text-sm bg-emerald-900/20 border border-emerald-800/30 px-6 py-3 rounded-xl'>
                ✓ Session logged! Your progress is saved.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Completion banner — UNCHANGED ─────────────────────────── */}
      {showCompleteBanner && (
        <SessionCompleteBanner onDismiss={() => setShowCompleteBanner(false)} />
      )}

      {/* ── NEW [Feature C]: Activity toast ──────────────────────── */}
      {/* Sits above SessionCompleteBanner (z-50, bottom-24 vs bottom-6) */}
      {activityToast && (
        <ActivityToast
          message={activityToast}
          onDismiss={() => setActivityToast(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default TafsirSession;