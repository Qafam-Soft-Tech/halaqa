// ─────────────────────────────────────────────────────────────────────────────
// Dashboard.jsx  (new home page — replaces the old circles-only view)
//
// Sections:
//   1. Greeting + quick-action buttons
//   2. Four stat cards (circles, streak, verses read, active minutes)
//   3. Two-column layout:
//      Left  (2/3)  — recent circle activity feed
//      Right (1/3)  — "Continue reading" bookmark + mini circles list
//
// Data sources:
//   • /api/rooms/my            → circle count + mini list
//   • /api/proxy/auth/v1/streaks           → current reading streak
//   • /api/proxy/auth/v1/reading-sessions  → last session for "continue reading"
//   • /api/proxy/auth/v1/activity-days     → active minutes / days
//
// All fetches use a safe wrapper — 403/404/network errors show '--' rather
// than crashing the page.  The dashboard is fully functional even when the
// QF prelive API is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { useQuery }    from '@tanstack/react-query';
import { motion }      from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth }     from '@/context/AuthContext';
import api             from '@/lib/api';

// ── Safe fetch helper — returns null instead of throwing ──────────────────────
const fetchSafe = async (url) => {
  try {
    const res = await api.get(url);
    return res.data;
  } catch {
    return null;
  }
};

// ── Fetch circles (re-uses the shared query key so data is cached) ────────────
const fetchMyCircles = async () => {
  try {
    const res   = await api.get('/rooms/my');
    const data  = res.data;
    const items = data?.data ?? data;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

// ── Time-of-day greeting ──────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'Assalamu Alaikum';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Assalamu Alaikum';
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, accent = false, delay = 0 }) => (
  <motion.div
    className='bg-stone-900 border border-stone-800 rounded-2xl p-5'
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0  }}
    transition={{ delay, duration: 0.3 }}
  >
    <p className='text-stone-500 text-xs mb-3 flex items-center gap-1.5'>
      <span className='text-sm'>{icon}</span>
      {label}
    </p>
    <p className={`text-3xl font-bold ${accent ? 'text-emerald-400' : 'text-white'}`}>
      {value ?? '--'}
    </p>
  </motion.div>
);

// ── Avatar initials circle ────────────────────────────────────────────────────
const Avatar = ({ name = '?', colorClass = 'bg-emerald-800 text-emerald-300' }) => (
  <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colorClass}`}
  >
    {name[0]?.toUpperCase() ?? '?'}
  </div>
);

// ── Single activity row ───────────────────────────────────────────────────────
const ActivityRow = ({ avatar, avatarColor, name, action, detail, time }) => (
  <div className='flex gap-3 items-start py-3 border-b border-stone-800/60 last:border-0'>
    <Avatar name={avatar} colorClass={avatarColor} />
    <div className='flex-1 min-w-0'>
      <p className='text-sm text-stone-300 leading-snug'>
        <span className='font-medium text-white'>{name}</span>{' '}
        {action}
        {detail && (
          <span className='text-emerald-400'> {detail}</span>
        )}
      </p>
      <p className='text-xs text-stone-600 mt-0.5'>{time}</p>
    </div>
  </div>
);

// ── Continue Reading Banner ───────────────────────────────────────────────────
// Shown at top of dashboard when the user has a prior reading session.
// Fetches the chapter name from the QF content API for a richer display.
const ContinueReadingBanner = ({ session, circles, navigate }) => {
  // QF reading-sessions returns chapterNumber + verseNumber
  const chapterNum = session?.chapterNumber
    ?? Number(session?.startVerseKey?.split(':')[0])
    ?? null;
  const verseNum   = session?.verseNumber
    ?? Number(session?.startVerseKey?.split(':')[1])
    ?? null;

  // Fetch the chapter name from QF content API
  const { data: chapterData } = useQuery({
    queryKey:  ['chapter', chapterNum],
    queryFn:   () => fetchSafe(`/proxy/content/api/v4/chapters/${chapterNum}`),
    enabled:   !!chapterNum,
    staleTime: Infinity, // chapter names never change
    retry:     false,
  });

  // QF content API returns { chapter: { name_simple, nameSimple, ... } }
  const chapter     = chapterData?.chapter ?? chapterData;
  const chapterName = chapter?.name_simple ?? chapter?.nameSimple ?? `Surah ${chapterNum}`;
  const firstRoom   = circles?.[0];

  if (!chapterNum) return null;

  return (
    <motion.div
      className='mb-8 flex flex-col sm:flex-row sm:items-center gap-4 bg-emerald-950/70 border border-emerald-800/50 border-l-4 border-l-emerald-500 rounded-2xl px-5 py-4'
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0   }}
      transition={{ duration: 0.35 }}
    >
      {/* Icon */}
      <span className='text-3xl shrink-0 select-none'>📖</span>

      {/* Text */}
      <div className='flex-1 min-w-0'>
        <p className='text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-0.5'>
          Continue where you left off
        </p>
        <p className='text-white font-bold text-lg leading-tight truncate'>
          {chapterName}
        </p>
        {verseNum && (
          <p className='text-emerald-300/60 text-xs mt-0.5'>
            Ayah {verseNum} · Surah {chapterNum}
          </p>
        )}
      </div>

      {/* Resume button */}
      <button
        onClick={() => {
          if (firstRoom && chapterNum) {
            navigate(`/circle/${firstRoom.id}/session?surah=${chapterNum}`);
          } else if (firstRoom) {
            navigate(`/circle/${firstRoom.id}/session`);
          } else {
            navigate('/circles');
          }
        }}
        className='shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-900/50 whitespace-nowrap'
      >
        Resume Reading →
      </button>
    </motion.div>
  );
};

// ── Skeleton shimmer block ────────────────────────────────────────────────────
const Shimmer = ({ className = '' }) => (
  <div className={`bg-stone-800 animate-pulse rounded ${className}`} />
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const firstName  = user?.username?.split(' ')[0] ?? 'there';

  // ── Data fetching ───────────────────────────────────────────────────────────

  // Circles — shared query key with MyCircles so the cache is warm
  const { data: circles = [], isLoading: circlesLoading } = useQuery({
    queryKey: ['my-circles'],
    queryFn:  fetchMyCircles,
  });

  // Reading streak from QF user API
  const { data: streakData } = useQuery({
    queryKey: ['streak'],
    queryFn:  () => fetchSafe('/proxy/auth/v1/streaks?first=1&status=ACTIVE'),
    retry:    false,
    staleTime: 60_000,
  });

  // Last reading session → banner + "continue reading" sidebar card
  // Primary: dedicated /reading/sessions backend route (queryKey per spec)
  const { data: readingSessionsData } = useQuery({
    queryKey: ['reading-sessions'],
    queryFn:  () => fetchSafe('/reading/sessions'),
    retry:    false,
    staleTime: 30_000,
  });

  // Last reading session → "continue reading" card (proxy fallback)
  const { data: sessionData } = useQuery({
    queryKey: ['last-reading-session'],
    queryFn:  () => fetchSafe('/proxy/auth/v1/reading-sessions?first=1'),
    retry:    false,
    staleTime: 30_000,
  });

  // Daily verse — reuses cached data from DailyVerse page (same queryKey)
  const { data: dailyVerse, isLoading: dailyLoading } = useQuery({
    queryKey:  ['daily-verse'],
    queryFn:   () => fetch('/api/daily/today').then(r => r.json()).then(r => r.data),
    staleTime: 60 * 60 * 1000,
    retry:     false,
  });

  // Activity days for "active minutes" stat
  const { data: activityData } = useQuery({
    queryKey: ['activity-days'],
    queryFn:  () => {
      const today = new Date().toISOString().split('T')[0];
      return fetchSafe(`/proxy/auth/v1/activity-days?first=1&type=QURAN&from=${today}&to=${today}`);
    },
    retry:    false,
    staleTime: 60_000,
  });

  // streak: QF returns { data: [{ days: N, status: 'ACTIVE' }] }
  const streak      = streakData?.data?.[0]?.days ?? 0;

  // Banner session: prefer dedicated query, fall back to proxy query
  const bannerSession = readingSessionsData?.data?.[0]
    ?? readingSessionsData?.[0]
    ?? sessionData?.data?.[0]
    ?? sessionData?.[0]
    ?? null;

  // Sidebar "continue reading" uses same resolved session
  const lastSession = bannerSession;
  // secondsRead is the correct field (not 'duration')
  const todayMins   = activityData?.data?.[0]?.secondsRead != null
    ? Math.round(activityData.data[0].secondsRead / 60)
    : null;

  // versesRead is a direct field on each activity day record
  const versesRead  = activityData?.data?.[0]?.versesRead ?? null;

  return (
    <DashboardLayout>

      {/* ── 1. Greeting + CTA ─────────────────────────────────────── */}
      <motion.div
        className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8'
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <p className='text-stone-500 text-sm mb-1'>{getGreeting()} 👋</p>
          <h1 className='text-2xl font-bold text-white'>{firstName}</h1>
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate('/circles')}
            className='flex items-center gap-2 border border-stone-700 hover:border-stone-600 text-stone-300 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-all'
          >
            ◎ My circles
          </button>
          <button
            onClick={() => navigate('/circles')}
            className='flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-900/40'
          >
            + New circle
          </button>
        </div>
      </motion.div>

      {/* ── 1.5 Today's Verse Teaser Card ────────────────────────── */}
      {dailyLoading ? (
        <div className='mb-6 h-36 rounded-2xl bg-stone-800 animate-pulse' />
      ) : dailyVerse ? (
        <motion.div
          className='mb-6 rounded-2xl overflow-hidden relative'
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <img src={dailyVerse.backgroundUrl} alt='' className='absolute inset-0 w-full h-full object-cover' />
          <div className='absolute inset-0 bg-black/60' />
          <div className='relative z-10 p-5'>
            <div className='flex items-start justify-between mb-3'>
              <span className='bg-emerald-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wide'>
                TODAY'S VERSE
              </span>
              <div className='text-right'>
                <p className='text-emerald-300 text-xs font-medium'>{dailyVerse.dates.hijri}</p>
                <p className='text-white/60 text-xs mt-0.5'>{dailyVerse.dates.gregorian}</p>
              </div>
            </div>
            <p dir='rtl' lang='ar' className='text-white text-xl leading-relaxed mb-1 truncate' style={{ fontFamily: 'Amiri, serif' }}>
              {dailyVerse.verse.arabic.length > 50 ? dailyVerse.verse.arabic.slice(0, 50) + '…' : dailyVerse.verse.arabic}
            </p>
            <p className='text-white/60 text-sm mb-4'>{dailyVerse.verse.surahName} · {dailyVerse.verse.key}</p>
            <div className='flex items-center justify-between'>
              <p className='text-white/50 text-xs truncate max-w-[55%]'>Recited by {dailyVerse.reciter.name}</p>
              <button
                onClick={() => navigate('/daily')}
                className='bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors shrink-0'
              >
                Listen &amp; Reflect →
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* ── 1.6 Continue Reading Banner ───────────────────────────── */}
      {bannerSession && (
        <ContinueReadingBanner
          session={bannerSession}
          circles={circles}
          navigate={navigate}
        />
      )}

      {/* ── 2. Stat cards ─────────────────────────────────────────── */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        <StatCard
          label='My circles'
          value={circlesLoading ? null : circles.length || 0}
          icon='◎'
          delay={0}
        />
        <StatCard
          label='Day streak'
          value={streak}
          icon='◈'
          accent
          delay={0.05}
        />
        <StatCard
          label='Verses read'
          value={versesRead}
          icon='◧'
          delay={0.1}
        />
        <StatCard
          label='Mins today'
          value={todayMins}
          icon='◷'
          accent
          delay={0.15}
        />
      </div>

      {/* ── 3. Two-column grid ────────────────────────────────────── */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* ── Left: activity feed (2 cols) ──────────────────────── */}
        <motion.div
          className='lg:col-span-2'
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0  }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <h2 className='text-stone-400 text-xs font-medium uppercase tracking-widest mb-3'>
            Recent activity
          </h2>

          <div className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
            {circlesLoading ? (
              /* Loading state */
              <div className='p-5 space-y-4'>
                {[1, 2, 3].map((i) => (
                  <div key={i} className='flex gap-3'>
                    <Shimmer className='w-8 h-8 rounded-full shrink-0' />
                    <div className='flex-1 space-y-2'>
                      <Shimmer className='h-4 w-3/4' />
                      <Shimmer className='h-3 w-1/4' />
                    </div>
                  </div>
                ))}
              </div>
            ) : circles.length === 0 ? (
              /* No circles yet */
              <div className='flex flex-col items-center justify-center py-16 text-center px-6'>
                <div className='text-4xl mb-3 opacity-20'>◎</div>
                <p className='text-stone-500 text-sm mb-1'>No activity yet</p>
                <p className='text-stone-600 text-xs mb-5'>
                  Create a circle to start tracking group activity
                </p>
                <button
                  onClick={() => navigate('/circles')}
                  className='text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-700 px-4 py-2 rounded-lg transition-all'
                >
                  + Create first circle
                </button>
              </div>
            ) : (
              /* Activity rows built from circle data we have */
              <div className='px-5 divide-y-0'>
                {circles.slice(0, 5).map((circle, i) => (
                  <ActivityRow
                    key={circle.id}
                    avatar={circle.name?.[0] ?? 'C'}
                    avatarColor={
                      i % 3 === 0 ? 'bg-emerald-800 text-emerald-300' :
                      i % 3 === 1 ? 'bg-violet-900  text-violet-300'  :
                                    'bg-stone-700    text-stone-300'
                    }
                    name={circle.name}
                    action='is active in your circles'
                    detail={null}
                    time={`${circle.membersCount ?? circle.members_count ?? 0} members`}
                  />
                ))}

                {/* CTA to enter a circle */}
                <div className='px-0 pt-4 pb-1'>
                  <button
                    onClick={() => navigate('/circles')}
                    className='text-xs text-emerald-500 hover:text-emerald-400 transition-colors'
                  >
                    View all circles →
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Right: continue reading + mini circle list ─────────── */}
        <motion.div
          className='space-y-5'
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >

          {/* Continue reading card */}
          <div>
            <h2 className='text-stone-400 text-xs font-medium uppercase tracking-widest mb-3'>
              Continue reading
            </h2>

            {lastSession ? (
              <div className='bg-emerald-950 border border-emerald-800/50 rounded-2xl p-5'>
                <p className='text-emerald-400 text-xs mb-1'>Last position</p>
                <p className='text-white font-semibold text-base mb-0.5'>
                  {lastSession.chapterNumber
                    ? `Surah ${lastSession.chapterNumber}`
                    : lastSession.startVerseKey
                    ? `Surah ${lastSession.startVerseKey.split(':')[0]}`
                    : 'Quran'}
                </p>
                {(lastSession.chapterNumber || lastSession.startVerseKey) && (
                  <p className='text-emerald-300/70 text-xs mb-4'>
                    {lastSession.chapterNumber && lastSession.verseNumber
                      ? `${lastSession.chapterNumber}:${lastSession.verseNumber}`
                      : lastSession.startVerseKey ?? ''}
                  </p>
                )}
                <button
                  onClick={() => {
                    const surah    = lastSession.chapterNumber ?? lastSession.startVerseKey?.split(':')[0];
                    const circleId = circles[0]?.id;
                    if (circleId && surah) {
                      navigate(`/circle/${circleId}/session?surah=${surah}`);
                    } else if (circleId) {
                      navigate(`/circle/${circleId}/session`);
                    } else {
                      navigate('/circles');
                    }
                  }}
                  className='w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 rounded-xl transition-all hover:-translate-y-0.5'
                >
                  Resume →
                </button>
              </div>
            ) : (
              <div className='bg-stone-900 border border-stone-800 rounded-2xl p-5 text-center'>
                <p className='text-stone-600 text-3xl mb-3'>📖</p>
                <p className='text-stone-500 text-sm mb-1'>No sessions yet</p>
                <p className='text-stone-600 text-xs mb-4'>
                  Start a tafsir session to track your reading
                </p>
                <button
                  onClick={() => circles[0] && navigate(`/circle/${circles[0].id}/session`)}
                  disabled={circles.length === 0}
                  className='w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-300 text-xs py-2 rounded-lg transition-all'
                >
                  Start reading
                </button>
              </div>
            )}
          </div>

          {/* Mini circles list */}
          {circles.length > 0 && (
            <div>
              <h2 className='text-stone-400 text-xs font-medium uppercase tracking-widest mb-3'>
                My circles
              </h2>
              <div className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-800/60'>
                {circles.slice(0, 4).map((circle) => (
                  <button
                    key={circle.id}
                    onClick={() => navigate(`/circle/${circle.id}`)}
                    className='w-full flex items-center justify-between px-4 py-3 hover:bg-stone-800/50 transition-colors group'
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='w-7 h-7 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0'>
                        {circle.name?.[0]?.toUpperCase() ?? 'C'}
                      </div>
                      <p className='text-stone-300 text-sm truncate group-hover:text-white transition-colors'>
                        {circle.name}
                      </p>
                    </div>
                    <span className='text-stone-700 group-hover:text-emerald-500 text-xs transition-colors shrink-0 ml-2'>
                      →
                    </span>
                  </button>
                ))}

                {circles.length > 4 && (
                  <button
                    onClick={() => navigate('/circles')}
                    className='w-full px-4 py-2.5 text-xs text-emerald-600 hover:text-emerald-400 transition-colors'
                  >
                    + {circles.length - 4} more circles
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;