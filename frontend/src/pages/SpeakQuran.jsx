// ─────────────────────────────────────────────────────────────────────────────
// SpeakQuran.jsx
// Hub page for the Speak Qur'an learning feature.
// Route: /speak-quran  (ProtectedRoute)
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate }         from 'react-router-dom';
import { useQuery }            from '@tanstack/react-query';
import DashboardLayout         from '@/components/DashboardLayout';
import api                     from '@/lib/api';      // pre-configured axios instance

// ── Progress query ────────────────────────────────────────────────────────────
const useLearnProgress = () =>
  useQuery({
    queryKey : ['learn-progress'],
    queryFn  : () => api.get('/learn/progress').then(r => r.data.data),
    staleTime: 60_000,
  });

// ── Small helpers ─────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <div className='bg-stone-900 border border-stone-800 rounded-xl p-6 text-center flex flex-col items-center gap-1'>
    <span className={`text-3xl font-bold tabular-nums ${color}`}>{value}</span>
    <span className='text-xs text-stone-500 uppercase tracking-widest'>{label}</span>
  </div>
);

const LevelBadge = ({ text, color }) => {
  const map = {
    emerald : 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
    amber   : 'bg-amber-900/50  text-amber-400  border-amber-700/50',
    purple  : 'bg-purple-900/50 text-purple-400 border-purple-700/50',
  };
  return (
    <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full tracking-widest ${map[color]}`}>
      {text}
    </span>
  );
};

const ProgressBar = ({ value, max }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className='mt-4'>
      <div className='flex justify-between text-xs text-stone-500 mb-1'>
        <span>{value} / {max} words</span>
        <span>{pct}%</span>
      </div>
      <div className='h-1.5 bg-stone-800 rounded-full overflow-hidden'>
        <div
          className='h-full bg-emerald-500 rounded-full transition-all duration-700'
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ── Level card data ───────────────────────────────────────────────────────────
const LEVELS = [
  {
    id          : 1,
    icon        : '📖',
    title       : 'Level 1 — Word School',
    description : 'Learn word-by-word. Master the 900 most repeated Qur\'anic words.',
    badge       : { text: 'BEGINNER', color: 'emerald' },
    active      : true,
    border      : 'border-emerald-800',
    route       : '/speak-quran/lesson',
  },
  {
    id          : 2,
    icon        : '🔗',
    title       : 'Level 2 — Phrase Builder',
    description : 'Connect words into Qur\'anic phrases. Coming soon.',
    badge       : { text: 'COMING SOON', color: 'amber' },
    active      : false,
    border      : 'border-stone-700',
  },
  {
    id          : 3,
    icon        : '✨',
    title       : 'Level 3 — Sentence Master',
    description : 'Understand full ayat from first principles.',
    badge       : { text: 'COMING SOON', color: 'purple' },
    active      : false,
    border      : 'border-stone-700',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
const SpeakQuran = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useLearnProgress();

  const mastered  = data?.masteredWords ?? 0;
  const balance   = data?.balance       ?? 0;
  const total     = data?.totalWords    ?? 0;

  return (
    <DashboardLayout>
      <div className='max-w-4xl mx-auto'>

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className='text-center py-12'>
          {/* Arabic: Iqra */}
          <p
            className='text-6xl text-emerald-400 mb-2 leading-none select-none'
            style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
          >
            اقْرَأْ
          </p>
          <h1 className='text-2xl font-bold text-white mb-1'>
            Speak Qur'an — Learn the Language of Allah
          </h1>
          <p className='text-stone-400 max-w-lg mx-auto text-sm leading-relaxed'>
            Master the most repeated words in the Qur'an. Understand what you
            recite in every Salah.
          </p>
        </section>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <div className='grid grid-cols-3 gap-4 mt-8'>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='bg-stone-900 border border-stone-800 rounded-xl p-6 animate-pulse h-24' />
            ))
          ) : isError ? (
            <div className='col-span-3 text-center text-stone-500 text-sm py-4'>
              Could not load progress.
            </div>
          ) : (
            <>
              <StatCard label='Words Mastered' value={mastered}              color='text-emerald-400' />
              <StatCard label='Coin Balance'   value={`${balance} 🪙`}       color='text-amber-400'   />
              <StatCard label='Total Learned'  value={total}                 color='text-blue-400'   />
            </>
          )}
        </div>

        {/* ── Level cards ───────────────────────────────────────────── */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pb-12'>
          {LEVELS.map(lvl => (
            <div
              key={lvl.id}
              onClick={lvl.active ? () => navigate(lvl.route) : undefined}
              className={`
                relative bg-stone-900 border ${lvl.border} rounded-2xl p-6 flex flex-col gap-3
                ${lvl.active
                  ? 'cursor-pointer hover:border-emerald-600 hover:bg-stone-800/80 transition-all duration-200 hover:-translate-y-0.5'
                  : 'opacity-60 cursor-default select-none'
                }
              `}
            >
              {/* Icon + badge row */}
              <div className='flex items-start justify-between'>
                <span className='text-3xl'>{lvl.icon}</span>
                <LevelBadge text={lvl.badge.text} color={lvl.badge.color} />
              </div>

              {/* Title + description */}
              <div>
                <h2 className='text-sm font-semibold text-white leading-snug'>
                  {lvl.title}
                </h2>
                <p className='text-xs text-stone-400 mt-1 leading-relaxed'>
                  {lvl.description}
                </p>
              </div>

              {/* Level 1 only: progress bar + CTA */}
              {lvl.id === 1 && (
                <>
                  <ProgressBar value={mastered} max={900} />
                  <button
                    onClick={e => { e.stopPropagation(); navigate(lvl.route); }}
                    className='mt-auto w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold tracking-wide transition-colors'
                  >
                    Start Lesson →
                  </button>
                </>
              )}

              {/* Locked overlay for levels 2 & 3 */}
              {!lvl.active && (
                <div className='flex items-center gap-2 mt-auto'>
                  <span className='text-base'>🔒</span>
                  <span className='text-xs text-stone-500'>Complete Level 1 to unlock</span>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default SpeakQuran;