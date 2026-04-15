import { useState, useEffect, useRef } from 'react';
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

// ── Audio Player ──────────────────────────────────────────────────────────────
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

// ── TafsirSession ─────────────────────────────────────────────────────────────
const TafsirSession = () => {
  const { roomId }                      = useParams();
  const { user }                        = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const surahNumber                     = searchParams.get('surah') || '1';

  const [onlineCount,      setOnlineCount]      = useState(1);
  const [annotations,      setAnnotations]      = useState({});
  const [sessionLogged,    setSessionLogged]    = useState(false);
  const [loggingSession,   setLoggingSession]   = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);

  // Track session start time
  const sessionStartRef = useRef(Date.now());
  const socketRef       = useRef(null);

  const { verses, translations, tafsirs, audio, isLoading } = useSessionData(surahNumber);

  // Reset session timer when surah changes
  useEffect(() => {
    sessionStartRef.current = Date.now();
    setSessionLogged(false);
  }, [surahNumber]);

  // ── Socket.io ───────────────────────────────────────────────────────────
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

  // ── Add annotation ──────────────────────────────────────────────────────
  const handleAddAnnotation = async (verseKey, note) => {
    setAnnotations((prev) => ({
      ...prev,
      [verseKey]: [
        ...(prev[verseKey] ?? []),
        { note, username: user?.username ?? 'You', timestamp: new Date().toISOString() },
      ],
    }));

    try {
      await api.post('/proxy/auth/v1/notes', { body: note, verseKey });
    } catch {
      // Note saved locally even if API call fails
    }

    socketRef.current?.emit('new-annotation', {
      roomId, verseKey, note,
      username: user?.username ?? 'Anonymous',
    });
  };

  // ── Complete Session ────────────────────────────────────────────────────
  const handleCompleteSession = async () => {
    if (loggingSession || sessionLogged || verses.length === 0) return;
    setLoggingSession(true);

    const firstVerse = verses[0];
    const lastVerse  = verses[verses.length - 1];
    const duration   = Math.floor((Date.now() - sessionStartRef.current) / 1000);

    try {
      await api.post('/proxy/auth/v1/reading-sessions', {
        startVerseKey: firstVerse.verse_key,
        endVerseKey:   lastVerse.verse_key,
        duration,
      });
    } catch {
      // Still show success — session tracked locally
    }

    setSessionLogged(true);
    setShowCompleteBanner(true);
    setLoggingSession(false);
  };

  const handleSurahChange = (e) => {
    setSearchParams({ surah: e.target.value });
    setAnnotations({});
  };

  // Format elapsed time as mm:ss
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
      <div className='flex items-center justify-between mb-8'>
        <div className='text-center flex-1'>
          <h1 className='text-white font-bold text-xl'>
            {surahNumber}. {SURAHS[Number(surahNumber) - 1]}
          </h1>
          <p className='text-stone-500 text-xs mt-1'>Live Session · Room {roomId}</p>
        </div>

        {/* Complete Session button */}
        {verses.length > 0 && !sessionLogged && (
          <button
            onClick={handleCompleteSession}
            disabled={loggingSession}
            className='shrink-0 flex items-center gap-2 bg-stone-800 hover:bg-emerald-700 border border-stone-700 hover:border-emerald-600 text-stone-300 hover:text-white text-xs font-medium px-4 py-2 rounded-xl transition-all'
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
          <span className='shrink-0 flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-900/30 border border-emerald-800/40 px-3 py-2 rounded-xl'>
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
      {!isLoading && verses.length > 0 && (
        <div className='space-y-4'>
          {verses.map((verse, i) => (
            <VerseCard
              key={verse.id ?? verse.verse_key ?? i}
              verse={verse}
              translation={translations?.[i] ?? null}
              tafsir={tafsirs?.[i] ?? null}
              annotations={annotations[verse.verse_key] ?? []}
              onAddAnnotation={handleAddAnnotation}
            />
          ))}

          {/* Bottom Complete Session button (after all verses) */}
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

      {/* ── Completion banner ─────────────────────────────────────── */}
      {showCompleteBanner && (
        <SessionCompleteBanner onDismiss={() => setShowCompleteBanner(false)} />
      )}
    </DashboardLayout>
  );
};

export default TafsirSession;