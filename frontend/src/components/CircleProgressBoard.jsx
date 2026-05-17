// ─────────────────────────────────────────────────────────────────────────────
// src/components/CircleProgressBoard.jsx
//
// The accountability centrepiece of Halaqa.
// Shows who in the circle read today, per-member status, and your personal
// 30-day reading heatmap.
//
// Props: { roomId } — QF Rooms API room_id string (TEXT)
//
// Data sources:
//   GET /api/reading/circle-activity/:roomId   → member last-active (our DB)
//   GET /api/reading/activity?first=20&type=QURAN → personal 30-day history (QF)
//
// Depends on: @tanstack/react-query, framer-motion, @/lib/api
// ─────────────────────────────────────────────────────────────────────────────

import { useState }  from 'react';
import { useQuery }  from '@tanstack/react-query';
import { motion }    from 'framer-motion';
import api           from '@/lib/api';

// ── Pure helpers ──────────────────────────────────────────────────────────────

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
};

const relativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  const d = daysSince(dateStr);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d} days ago`;
  if (d < 30)  return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
};

const statusInfo = (lastActive) => {
  const d = daysSince(lastActive);
  if (d === null) return { label: 'Inactive',  cls: 'bg-stone-800 text-stone-500' };
  if (d === 0)    return { label: 'Read today', cls: 'bg-emerald-900/70 text-emerald-400 border border-emerald-700/50' };
  if (d <= 7)     return { label: 'This week',  cls: 'bg-amber-900/50 text-amber-400 border border-amber-700/40' };
  return           { label: 'Inactive',          cls: 'bg-stone-800 text-stone-500' };
};

/** Last N calendar dates oldest → newest as YYYY-MM-DD strings */
const lastNDays = (n) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });

// ── Sub-components ────────────────────────────────────────────────────────────

const MemberAvatar = ({ username, isActiveToday, lastActive }) => {
  const [tip, setTip] = useState(false);
  return (
    <div
      className='relative cursor-default'
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 select-none transition-all
        ${isActiveToday
          ? 'bg-emerald-700 text-emerald-100 ring-emerald-500/70'
          : 'bg-stone-700 text-stone-400 ring-stone-600'}`}
      >
        {username?.[0]?.toUpperCase() ?? '?'}
      </div>

      {isActiveToday && (
        <span className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-stone-900' />
      )}

      {tip && (
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none'>
          <div className='whitespace-nowrap bg-stone-900 border border-stone-700 text-stone-200 text-xs px-2.5 py-1.5 rounded-lg shadow-xl'>
            {username} · {relativeTime(lastActive)}
          </div>
          <div className='mx-auto w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-stone-700' />
        </div>
      )}
    </div>
  );
};

const HeatCell = ({ date, active }) => {
  const [tip, setTip] = useState(false);
  return (
    <div
      className='relative cursor-default'
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <div className={`w-4.5 h-4.5 rounded-[3px] transition-colors
        ${active ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-stone-800 hover:bg-stone-700'}`}
      />
      {tip && (
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 pointer-events-none'>
          <div className='whitespace-nowrap bg-stone-900 border border-stone-700 text-stone-300 text-xs px-2 py-1 rounded-md shadow-xl'>
            {date} · {active ? '✓ Active' : 'No reading'}
          </div>
          <div className='mx-auto w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-stone-700' />
        </div>
      )}
    </div>
  );
};

const Shimmer = ({ className = '' }) => (
  <div className={`bg-stone-800 animate-pulse rounded ${className}`} />
);

// ── CircleProgressBoard ───────────────────────────────────────────────────────

const CircleProgressBoard = ({ roomId }) => {

  // ── 1. Circle member activity — our backend ───────────────────────────────
  const {
    data: circleActivity = [],
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ['circle-activity', roomId],
    queryFn: async () => {
      const res = await api.get(`/reading/circle-activity/${roomId}`);
      // Backend returns { success: true, data: [...] }
      return res.data?.data ?? [];
    },
    enabled: !!roomId,
    staleTime: 60_000,
    retry: false,
  });

  // ── 2. Personal 30-day activity — QF via GET /api/reading/activity ────────
  const { data: myActivity = [] } = useQuery({
    queryKey: ['my-activity', roomId],
    queryFn: async () => {
      // GET /api/reading/activity — QF GET activity-days does not support
      // a ?type filter (type is POST-only). Just pass first=30.
      const res = await api.get('/reading/activity?first=20');
      return res.data?.data ?? [];
    },
    staleTime: 60_000,
    retry: false,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const totalMembers = circleActivity.length;
  const activeToday  = circleActivity.filter(m => m.isActiveToday).length;
  const allActive    = totalMembers > 0 && activeToday === totalMembers;

  // QF activity-days returns objects with a `date` field (YYYY-MM-DD)
  const activeDateSet = new Set(myActivity.map(d => d.date).filter(Boolean));

  const days30   = lastNDays(30);
  const heatRows = Array.from({ length: 5 }, (_, r) => days30.slice(r * 6, r * 6 + 6));

  const bannerColor = activeToday > 0 ? 'text-emerald-400' : 'text-amber-400';
  const bannerBadge = allActive
    ? { text: '🌟 Full circle!',  cls: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50' }
    : activeToday > 0
    ? { text: '📖 In progress',   cls: 'bg-amber-900/40 text-amber-400 border border-amber-700/40' }
    : { text: '😴 No reads yet',  cls: 'bg-stone-800 text-stone-500' };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='space-y-5'>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 1 — Who read today banner
      ──────────────────────────────────────────────────────────────────── */}
      <motion.div
        className='bg-stone-900 border border-stone-800 rounded-2xl p-5'
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className='flex items-start justify-between mb-5'>
          <div>
            <p className='text-stone-500 text-xs uppercase tracking-widest mb-1.5'>
              Circle progress · today
            </p>
            {membersLoading ? (
              <Shimmer className='h-9 w-24 mb-1' />
            ) : (
              <p className={`text-4xl font-bold tabular-nums ${bannerColor}`}>
                {activeToday}
                <span className='text-stone-600 text-2xl font-normal'> / {totalMembers}</span>
              </p>
            )}
            <p className='text-stone-400 text-sm mt-1'>members read today</p>
          </div>

          {!membersLoading && (
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${bannerBadge.cls}`}>
              {bannerBadge.text}
            </span>
          )}
        </div>

        {membersLoading ? (
          <div className='flex gap-2'>
            {[1,2,3,4,5].map(i => <Shimmer key={i} className='w-9 h-9 rounded-full' />)}
          </div>
        ) : membersError ? (
          <p className='text-stone-600 text-xs'>Could not load member data.</p>
        ) : circleActivity.length === 0 ? (
          <p className='text-stone-600 text-xs'>No members found for this circle.</p>
        ) : (
          <motion.div
            className='flex flex-wrap gap-2'
            initial='hidden'
            animate='visible'
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {circleActivity.map((member) => (
              <motion.div
                key={member.userId}
                variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              >
                <MemberAvatar
                  username={member.username}
                  isActiveToday={member.isActiveToday}
                  lastActive={member.lastActive}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 2 — Member list table
      ──────────────────────────────────────────────────────────────────── */}
      <motion.div
        className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.07 }}
      >
        <div className='px-5 py-3.5 border-b border-stone-800 flex items-center justify-between'>
          <h3 className='text-stone-300 text-sm font-medium'>Member activity</h3>
          <span className='text-stone-600 text-xs'>{totalMembers} members</span>
        </div>

        {membersLoading ? (
          <div className='p-5 space-y-4'>
            {[1,2,3].map(i => (
              <div key={i} className='flex items-center gap-3'>
                <Shimmer className='w-8 h-8 rounded-full shrink-0' />
                <Shimmer className='flex-1 h-4' />
                <Shimmer className='w-20 h-5 rounded-full' />
                <Shimmer className='w-16 h-4' />
              </div>
            ))}
          </div>
        ) : circleActivity.length === 0 ? (
          <div className='flex items-center justify-center py-14'>
            <p className='text-stone-500 text-sm'>No members in this circle yet.</p>
          </div>
        ) : (
          <>
            <div className='grid grid-cols-3 px-5 py-2 text-[10px] text-stone-600 uppercase tracking-widest border-b border-stone-800/50'>
              <span>Member</span>
              <span className='text-center'>Status</span>
              <span className='text-right'>Last read</span>
            </div>

            <div className='divide-y divide-stone-800/40'>
              {circleActivity.map((member, i) => {
                const { label, cls } = statusInfo(member.lastActive);
                return (
                  <motion.div
                    key={member.userId}
                    className='grid grid-cols-3 items-center px-5 py-3.5 hover:bg-stone-800/30 transition-colors'
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${member.isActiveToday
                          ? 'bg-emerald-800 text-emerald-200'
                          : 'bg-stone-700 text-stone-400'}`}
                      >
                        {member.username?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className='text-stone-300 text-sm truncate'>{member.username}</span>
                    </div>

                    <div className='flex justify-center'>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cls}`}>
                        {label}
                      </span>
                    </div>

                    <p className='text-stone-500 text-xs text-right tabular-nums'>
                      {relativeTime(member.lastActive)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 3 — Personal 30-day heatmap
      ──────────────────────────────────────────────────────────────────── */}
      <motion.div
        className='bg-stone-900 border border-stone-800 rounded-2xl p-5'
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.14 }}
      >
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-stone-300 text-sm font-medium'>Your last 30 days</h3>
          <div className='flex items-center gap-3 text-xs text-stone-600'>
            <span className='flex items-center gap-1.5'>
              <span className='w-3 h-3 rounded-xs bg-stone-800 inline-block' />
              No reading
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='w-3 h-3 rounded-xs bg-emerald-600 inline-block' />
              Active
            </span>
          </div>
        </div>

        <div className='space-y-0.75'>
          {heatRows.map((row, r) => (
            <div key={r} className='flex gap-0.75'>
              {row.map(date => (
                <HeatCell
                  key={date}
                  date={date}
                  active={activeDateSet.has(date)}
                />
              ))}
            </div>
          ))}
        </div>

        <div className='flex justify-between mt-2.5 text-[10px] text-stone-600'>
          <span>{days30[0]}</span>
          <span>Today</span>
        </div>

        <p className='text-stone-600 text-xs mt-3'>
          {activeDateSet.size} active day{activeDateSet.size !== 1 ? 's' : ''} in the last 30 days
        </p>
      </motion.div>

    </div>
  );
};

export default CircleProgressBoard;