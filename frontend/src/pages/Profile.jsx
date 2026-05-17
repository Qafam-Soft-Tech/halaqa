// ─────────────────────────────────────────────────────────────────────────────
// Profile.jsx
// The authenticated user's personal profile page.
//
// Sections:
//   1. Hero      — avatar initials, display name, email, member-since date
//   2. Stats     — circles joined, streak, total sessions, total minutes
//   3. Reading   — last session detail card (continue reading shortcut)
//   4. Account   — QF account connection badge + sign-out
//
// All QF API calls use fetchSafe so the page never crashes if the prelive
// environment is unavailable.  Every section degrades gracefully to '--'.
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate }  from 'react-router-dom';
import { useQuery }     from '@tanstack/react-query';
import { motion }       from 'framer-motion';
import DashboardLayout  from '@/components/DashboardLayout';
import { useAuth }      from '@/context/AuthContext';
import api              from '@/lib/api';

// ── Safe fetch ────────────────────────────────────────────────────────────────
const fetchSafe = async (url) => {
  try {
    const res = await api.get(url);
    return res.data;
  } catch {
    return null;
  }
};

// ── Fetch circles (shared query key — will hit cache if Dashboard already ran) ─
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

// ── Stat tile ─────────────────────────────────────────────────────────────────
const StatTile = ({ label, value, icon, delay = 0 }) => (
  <motion.div
    className='bg-stone-900 border border-stone-800 rounded-2xl p-5 text-center'
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0  }}
    transition={{ delay, duration: 0.3 }}
  >
    <p className='text-2xl mb-2'>{icon}</p>
    <p className='text-2xl font-bold text-white mb-1'>
      {value ?? <span className='text-stone-600'>--</span>}
    </p>
    <p className='text-stone-500 text-xs'>{label}</p>
  </motion.div>
);

// ── Section card wrapper ──────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

// ── Info row inside a card ────────────────────────────────────────────────────
const InfoRow = ({ label, value, right }) => (
  <div className='flex items-center justify-between px-5 py-4 border-b border-stone-800/70 last:border-0'>
    <div>
      <p className='text-stone-400 text-xs mb-0.5'>{label}</p>
      <p className='text-white text-sm'>{value ?? '—'}</p>
    </div>
    {right && <div className='shrink-0 ml-4'>{right}</div>}
  </div>
);

// ── Profile page ──────────────────────────────────────────────────────────────
const Profile = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const initials = user?.username
    ? user.username.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: circles = [] } = useQuery({
    queryKey:  ['my-circles'],
    queryFn:   fetchMyCircles,
    staleTime: 60_000,
  });

  const { data: streakData } = useQuery({
    queryKey:  ['streak'],
    queryFn:   () => fetchSafe('/proxy/auth/v1/streaks?first=1'),
    retry:     false,
    staleTime: 60_000,
  });

  const { data: sessionData } = useQuery({
    queryKey:  ['last-reading-session'],
    queryFn:   () => fetchSafe('/proxy/auth/v1/reading-sessions?first=5'),
    retry:     false,
    staleTime: 30_000,
  });

  const { data: activityData } = useQuery({
    queryKey:  ['activity-days'],
    queryFn:   () => fetchSafe('/proxy/auth/v1/activity-days?first=20'),
    retry:     false,
    staleTime: 60_000,
  });

  // ── Derived values ───────────────────────────────────────────────────────
  // QF streaks response: { data: [{ status, days, ... }] } — same shape as AccountabilityDashboard
  const streakEntry   = streakData?.data?.find?.((s) => s.status === 'ACTIVE') ?? streakData?.data?.[0] ?? null;
  const streak        = streakEntry?.days ?? null;

  const sessions      = sessionData?.data ?? [];
  const lastSession   = sessions[0] ?? null;
  const totalSessions = sessionData?.total ?? sessions.length ?? null;

  // QF activity-days items use `seconds` not `duration`
  const totalMins = activityData?.data?.length
    ? Math.round(
        activityData.data.reduce((acc, d) => acc + (d.secondsRead ?? d.seconds ?? d.duration ?? 0), 0) / 60
      )
    : null;

  return (
    <DashboardLayout>

      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <motion.div
        className='flex flex-col sm:flex-row sm:items-center gap-5 mb-8'
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.3 }}
      >
        {/* Avatar */}
        <div className='w-20 h-20 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-200 text-2xl font-bold shrink-0 ring-4 ring-emerald-900/50'>
          {initials}
        </div>

        {/* Name + email */}
        <div className='flex-1'>
          <h1 className='text-2xl font-bold text-white mb-0.5'>
            {user?.username || 'User'}
          </h1>
          <p className='text-stone-500 text-sm mb-3'>{user?.email || '—'}</p>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='text-xs px-2.5 py-1 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-800/40'>
              ✓ QF Account linked
            </span>
            <button
              onClick={() => navigate('/settings')}
              className='text-xs px-2.5 py-1 rounded-full border border-stone-700 text-stone-400 hover:text-white hover:border-stone-600 transition-all'
            >
              ⊙ Settings
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Stats ─────────────────────────────────────────────── */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
        <StatTile label='Circles'         value={circles.length || 0} icon='◎' delay={0}    />
        <StatTile label='Day streak'      value={streak}              icon='◈' delay={0.05} />
        <StatTile label='Total sessions'  value={totalSessions}       icon='◧' delay={0.1}  />
        <StatTile label='Total minutes'   value={totalMins}           icon='◷' delay={0.15} />
      </div>

      {/* ── 3. Two-column layout ─────────────────────────────────── */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>

        {/* Reading history */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0  }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <p className='text-stone-500 text-xs font-semibold uppercase tracking-widest mb-3'>
            Recent sessions
          </p>

          <Card>
            {sessions.length === 0 ? (
              <div className='py-14 text-center'>
                <p className='text-stone-600 text-3xl mb-3'>📖</p>
                <p className='text-stone-500 text-sm'>No sessions recorded yet</p>
                <button
                  onClick={() =>
                    circles[0] && navigate(`/circle/${circles[0].id}/session`)
                  }
                  disabled={circles.length === 0}
                  className='mt-4 text-xs text-emerald-500 hover:text-emerald-400 disabled:opacity-40 transition-colors'
                >
                  Start your first session →
                </button>
              </div>
            ) : (
              sessions.slice(0, 5).map((s, i) => {
                // QF reading-sessions GET returns chapterNumber + verseNumber (not startVerseKey)
                const surahNum  = s.chapterNumber ?? s.startVerseKey?.split(':')[0];
                const verseNum  = s.verseNumber   ?? s.startVerseKey?.split(':')[1];
                const verseKey  = surahNum && verseNum ? `${surahNum}:${verseNum}` : null;
                return (
                <div
                  key={s.id ?? i}
                  className='flex items-center justify-between px-5 py-3.5 border-b border-stone-800/60 last:border-0'
                >
                  <div>
                    <p className='text-white text-sm font-medium'>
                      {surahNum ? `Surah ${surahNum}` : 'Session'}
                    </p>
                    <p className='text-stone-500 text-xs mt-0.5'>
                      {verseKey ?? '—'}
                    </p>
                  </div>
                  <div className='text-right shrink-0 ml-4'>
                    <p className='text-stone-400 text-xs'>
                      {s.seconds ? `${Math.round(s.seconds / 60)} min` : s.duration ? `${Math.round(s.duration / 60)} min` : '—'}
                    </p>
                  </div>
                </div>
                );
              })
            )}
          </Card>
        </motion.div>

        {/* Continue reading + circles */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className='space-y-5'
        >
          {/* Continue reading */}
          <div>
            <p className='text-stone-500 text-xs font-semibold uppercase tracking-widest mb-3'>
              Continue reading
            </p>
            {lastSession ? (
              <div className='bg-emerald-950 border border-emerald-800/50 rounded-2xl p-5'>
                <p className='text-emerald-400 text-xs mb-1'>Last position</p>
                <p className='text-white font-semibold text-base mb-0.5'>
                  Surah {lastSession.chapterNumber ?? lastSession.startVerseKey?.split(':')[0] ?? '—'}
                </p>
                <p className='text-emerald-300/60 text-xs mb-4'>
                  {lastSession.chapterNumber && lastSession.verseNumber
                    ? `${lastSession.chapterNumber}:${lastSession.verseNumber}`
                    : lastSession.startVerseKey ?? '—'}
                </p>
                <button
                  onClick={() => {
                    const surah    = lastSession.chapterNumber ?? lastSession.startVerseKey?.split(':')[0];
                    const circleId = circles[0]?.id;
                    if (circleId) {
                      navigate(`/circle/${circleId}/session${surah ? `?surah=${surah}` : ''}`);
                    }
                  }}
                  disabled={circles.length === 0}
                  className='w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-all hover:-translate-y-0.5'
                >
                  Resume →
                </button>
              </div>
            ) : (
              <Card className='py-10 text-center px-5'>
                <p className='text-stone-600 text-sm'>No reading history yet</p>
              </Card>
            )}
          </div>

          {/* My circles mini list */}
          {circles.length > 0 && (
            <div>
              <p className='text-stone-500 text-xs font-semibold uppercase tracking-widest mb-3'>
                My circles
              </p>
              <Card>
                {circles.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/circle/${c.id}`)}
                    className='w-full flex items-center gap-3 px-5 py-3.5 border-b border-stone-800/60 last:border-0 hover:bg-stone-800/40 transition-colors group'
                  >
                    <div className='w-7 h-7 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0'>
                      {c.name?.[0]?.toUpperCase() ?? 'C'}
                    </div>
                    <p className='flex-1 text-left text-stone-300 text-sm group-hover:text-white transition-colors truncate'>
                      {c.name}
                    </p>
                    <span className='text-stone-700 group-hover:text-emerald-500 text-xs transition-colors'>→</span>
                  </button>
                ))}
              </Card>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── 4. Account section ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <p className='text-stone-500 text-xs font-semibold uppercase tracking-widest mb-3'>
          Account
        </p>
        <Card>
          <InfoRow
            label='Display name'
            value={user?.username}
          />
          <InfoRow
            label='Email'
            value={user?.email}
          />
          <InfoRow
            label='Quran Foundation'
            value='Connected'
            right={
              <span className='text-xs px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'>
                ✓ Linked
              </span>
            }
          />
          <div className='px-5 py-4'>
            <button
              onClick={logout}
              className='text-red-400 hover:text-red-300 text-sm transition-colors flex items-center gap-2 group'
            >
              <span>Sign out</span>
              <span className='group-hover:translate-x-0.5 transition-transform'>→</span>
            </button>
          </div>
        </Card>
      </motion.div>

    </DashboardLayout>
  );
};

export default Profile;