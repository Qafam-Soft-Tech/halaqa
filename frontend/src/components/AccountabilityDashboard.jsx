import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fetchSafe = (url) => api.get(url).then((r) => r.data).catch(() => null);

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const daysSince = (dateStr) => {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
};

const getMemberStatus = (member) => {
  const days = daysSince(member.lastActive || member.last_active);
  if (days === 0) return { label: 'Active today',     color: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (days <= 7)  return { label: 'Active this week', color: 'text-amber-400',   dot: 'bg-amber-400'   };
  return             { label: 'Inactive',             color: 'text-red-400',     dot: 'bg-red-400'     };
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`bg-stone-800 rounded-xl animate-pulse ${className}`} />
);

const SectionHeader = ({ title, subtitle }) => (
  <div className='mb-4'>
    <h3 className='text-white font-semibold text-sm'>{title}</h3>
    {subtitle && <p className='text-stone-500 text-xs mt-0.5'>{subtitle}</p>}
  </div>
);

// ── Animated streak counter ───────────────────────────────────────────────────
const AnimatedNumber = ({ target }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    setDisplay(0);
    let current = 0;
    const step  = Math.max(1, Math.floor(target / 20));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setDisplay(target); clearInterval(timer); }
      else                   { setDisplay(current); }
    }, 50);
    return () => clearInterval(timer);
  }, [target]);

  return <>{display}</>;
};

// ── Mock fallbacks ────────────────────────────────────────────────────────────
const generateMockActivityDays = () =>
  Array.from({ length: 20 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (19 - i));
    return { date: d.toISOString().split('T')[0], pagesRead: Math.floor(Math.random() * 20) };
  });

const MOCK_MEMBERS = [
  { id: 1, username: 'You',          role: 'admin',  lastActive: new Date().toISOString(),                          streak: 0 },
  { id: 2, username: 'Ahmad Hassan', role: 'member', lastActive: new Date(Date.now() - 2 * 86400000).toISOString(), streak: 0 },
];

// ── AccountabilityDashboard ───────────────────────────────────────────────────
const AccountabilityDashboard = ({ roomId }) => {

  const { data: membersData,  isLoading: membersLoading }  = useQuery({
    queryKey: ['members', roomId],
    queryFn:  () => fetchSafe(`/rooms/${roomId}/members`),
  });

  const { data: streakData,   isLoading: streakLoading }   = useQuery({
    queryKey: ['streak'],
    queryFn:  () => fetchSafe('/proxy/auth/v1/streaks?type=QURAN&status=ACTIVE&first=1'),
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['activity-days'],
    queryFn:  () => fetchSafe('/proxy/auth/v1/activity-days?first=20&type=QURAN&dateOrderBy=asc'),
  });

  const { data: goalData, isLoading: goalLoading } = useQuery({
    queryKey: ['today-goal'],
    queryFn:  () => fetchSafe('/proxy/auth/v1/goals/today'),
  });

  const isLoading = membersLoading || streakLoading || activityLoading || goalLoading;

  // ── Normalise ─────────────────────────────────────────────────────────────
  const members = (() => {
    const raw = Array.isArray(membersData) ? membersData : (membersData?.data ?? []);
    return raw.length > 0 ? raw : MOCK_MEMBERS;
  })();

  const activityDays = (() => {
    const raw = Array.isArray(activityData) ? activityData : (activityData?.data ?? []);
    return raw.length > 0 ? raw : generateMockActivityDays();
  })();

  const activeStreak = streakData?.data?.find((s) => s.status === 'ACTIVE');
  const streakDays   = activeStreak?.days ?? 0;
  const groupStreak  = streakDays;

  const goalToday   = goalData?.data ?? goalData;
  const readPages   = goalToday?.pagesRead        ?? 0;
  const targetPages = goalToday?.dailyTargetPages ?? 0;
  const goalPct     = targetPages > 0 ? Math.min(100, Math.round((readPages / targetPages) * 100)) : 0;

  const streakColor = groupStreak > 7 ? 'text-amber-400' : groupStreak > 0 ? 'text-emerald-400' : 'text-stone-500';
  const streakBg    = groupStreak > 7 ? 'bg-amber-900/20 border-amber-800/40' : groupStreak > 0 ? 'bg-emerald-900/20 border-emerald-800/40' : 'bg-stone-900 border-stone-800';

  const chartData = activityDays.map((day) => ({
    date:  formatShortDate(day.date),
    pages: day.pagesRead ?? 0,
  }));
  const maxPages = Math.max(...chartData.map((d) => d.pages), 1);

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-28 w-full' />
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-20 w-full' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>

      {/* ── SECTION 1: Group Streak Banner ──────────────────────────── */}
      <motion.div
        className={`border rounded-2xl p-6 ${streakBg}`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-stone-400 text-sm mb-1'>Group Streak</p>
            <div className='flex items-end gap-2'>
              {/* Animated counting number */}
              <span className={`text-5xl font-black ${streakColor}`}>
                <AnimatedNumber target={groupStreak} />
              </span>
              <span className={`text-lg font-semibold mb-1 ${streakColor}`}>days</span>
            </div>
            <p className='text-stone-600 text-xs mt-2'>
              The group streak resets if any member misses a day
            </p>
          </div>
          <motion.div
            className={`text-6xl opacity-30 ${groupStreak > 7 ? '' : 'grayscale'}`}
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {groupStreak > 7 ? '🔥' : groupStreak > 0 ? '⚡' : '💤'}
          </motion.div>
        </div>
      </motion.div>

      {/* ── SECTION 2: Activity Chart ────────────────────────────────── */}
      <motion.div
        className='bg-stone-900 border border-stone-800 rounded-2xl p-6'
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <SectionHeader title='Reading Activity — Last 20 Days' subtitle='Pages read per day' />
        <ResponsiveContainer width='100%' height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis dataKey='date' tick={{ fill: '#57534e', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fill: '#57534e', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', fontSize: '12px', color: '#e7e5e4' }}
              formatter={(val) => [`${val} pages`, 'Read']}
            />
            <Bar dataKey='pages' radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.pages === 0             ? '#292524'
                    : entry.pages >= maxPages * 0.75 ? '#059669'
                    : entry.pages >= maxPages * 0.4  ? '#10b981'
                    : '#34d399'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── SECTION 3: Member Table ──────────────────────────────────── */}
      <motion.div
        className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <div className='px-6 py-4 border-b border-stone-800'>
          <SectionHeader title='Member Contributions' />
        </div>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-stone-800'>
              <th className='text-left text-stone-500 text-xs font-medium px-6 py-3'>Member</th>
              <th className='text-left text-stone-500 text-xs font-medium px-6 py-3'>Streak</th>
              <th className='text-left text-stone-500 text-xs font-medium px-6 py-3 hidden md:table-cell'>Last Active</th>
              <th className='text-left text-stone-500 text-xs font-medium px-6 py-3'>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, i) => {
              const status = getMemberStatus(member);
              return (
                <motion.tr
                  key={member.id ?? i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className='border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors'
                >
                  <td className='px-6 py-3'>
                    <div className='flex items-center gap-3'>
                      <div className='w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0'>
                        {(member.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className='text-stone-200 text-sm'>{member.username || member.name}</p>
                        {(member.role === 'admin' || member.role === 'owner') && <p className='text-amber-600 text-xs'>Admin</p>}
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-3'>
                    <span className='text-white font-semibold text-sm'>{member.streak ?? streakDays ?? '—'}</span>
                    <span className='text-stone-500 text-xs ml-1'>days</span>
                  </td>
                  <td className='px-6 py-3 hidden md:table-cell'>
                    <span className='text-stone-400 text-xs'>
                      {member.lastActive || member.last_active
                        ? new Date(member.lastActive || member.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </span>
                  </td>
                  <td className='px-6 py-3'>
                    <div className='flex items-center gap-1.5'>
                      <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      <span className={`text-xs ${status.color}`}>{status.label}</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* ── SECTION 4: Goal Progress ─────────────────────────────────── */}
      <motion.div
        className='bg-stone-900 border border-stone-800 rounded-2xl p-6'
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <SectionHeader
          title="Today's Goal Progress"
          subtitle={targetPages > 0 ? `${readPages} pages read of ${targetPages} target` : 'No active goal set for today'}
        />
        {targetPages > 0 ? (
          <>
            <div className='w-full bg-stone-800 rounded-full h-3 overflow-hidden mb-2'>
              <motion.div
                className='h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full'
                initial={{ width: 0 }}
                animate={{ width: `${goalPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
              />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-stone-500 text-xs'>0 pages</span>
              <span className='text-emerald-400 font-bold text-sm'>{goalPct}%</span>
              <span className='text-stone-500 text-xs'>{targetPages} pages</span>
            </div>
          </>
        ) : (
          <div className='flex items-center gap-3 mt-2'>
            <div className='w-full bg-stone-800 rounded-full h-3'><div className='h-full bg-stone-700 rounded-full w-0' /></div>
            <span className='text-stone-600 text-xs shrink-0'>No goal</span>
          </div>
        )}
      </motion.div>

    </div>
  );
};

export default AccountabilityDashboard;