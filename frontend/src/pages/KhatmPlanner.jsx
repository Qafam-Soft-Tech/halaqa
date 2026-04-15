import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

// ── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ percent }) => (
  <div className='mb-8'>
    <div className='flex items-center justify-between mb-2'>
      <span className='text-stone-400 text-sm'>Overall Progress</span>
      <span className='text-emerald-400 font-bold text-sm'>{percent}% complete</span>
    </div>
    <div className='w-full bg-stone-800 rounded-full h-3 overflow-hidden'>
      <motion.div
        className='h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full'
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  </div>
);

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    complete:      'bg-emerald-900/50 text-emerald-400',
    'in-progress': 'bg-blue-900/50 text-blue-400',
    pending:       'bg-stone-800 text-stone-500',
  };
  const labels = {
    complete:      'Complete',
    'in-progress': 'In Progress',
    pending:       'Pending',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full ${styles[status] ?? styles['in-progress']}`}>
      {labels[status] ?? 'In Progress'}
    </span>
  );
};

// ── KhatmPlanner ──────────────────────────────────────────────────────────────
const KhatmPlanner = () => {
  const { roomId } = useParams();

  const [juzCount,     setJuzCount]     = useState(30);
  const [deadlineDays, setDeadlineDays] = useState(30);
  const [khatmResult,  setKhatmResult]  = useState(null);
  const [createError,  setCreateError]  = useState('');

  const { data: todayGoal } = useQuery({
    queryKey: ['today-goal'],
    queryFn:  () => api.get('/goals/today').then((r) => r.data).catch(() => null),
  });

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/goals/khatm/create', payload),
    onSuccess: (res) => {
      setKhatmResult(res.data);
      setCreateError('');
    },
    onError: (err) => {
      setCreateError(err.response?.data?.error || 'Failed to create Khatm plan. Please try again.');
    },
  });

  const handleCreate = () => {
    setCreateError('');
    mutation.mutate({ roomId, targetJuzCount: juzCount, deadlineDays });
  };

  const activeKhatm = khatmResult ?? (todayGoal?.type === 'reading' ? { goal: todayGoal, assignments: [] } : null);
  const completedCount = activeKhatm?.assignments?.filter((a) => a.status === 'complete').length ?? 0;
  const totalCount     = activeKhatm?.assignments?.length ?? 1;
  const progressPct    = Math.round((completedCount / totalCount) * 100);

  return (
    <DashboardLayout>
      <div className='max-w-3xl mx-auto'>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='mb-8'
        >
          <h1 className='text-2xl font-bold text-white mb-1'>Khatm Planner</h1>
          <p className='text-stone-500 text-sm'>Plan and distribute a full Quran completion across your circle.</p>
        </motion.div>

        <AnimatePresence mode='wait'>

          {/* ── STATE A: Create form ──────────────────────────────────── */}
          {!activeKhatm && (
            <motion.div
              key='create-form'
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className='bg-stone-900 border border-stone-800 rounded-2xl p-8'>
                <h2 className='text-white font-semibold text-lg mb-6'>Create a New Khatm</h2>

                {/* Juz slider */}
                <div className='mb-8'>
                  <div className='flex items-center justify-between mb-3'>
                    <label className='text-stone-300 text-sm font-medium'>How many Juz?</label>
                    <span className='text-emerald-400 font-bold text-lg w-12 text-right'>{juzCount}</span>
                  </div>
                  <input
                    type='range' min={1} max={30} value={juzCount}
                    onChange={(e) => setJuzCount(Number(e.target.value))}
                    className='w-full h-2 bg-stone-700 rounded-full appearance-none cursor-pointer accent-emerald-500'
                  />
                  <div className='flex justify-between text-stone-600 text-xs mt-1'>
                    <span>1 Juz</span>
                    <span>30 Juz (Full Quran)</span>
                  </div>
                </div>

                {/* Days input */}
                <div className='mb-8'>
                  <label className='block text-stone-300 text-sm font-medium mb-3'>Days to complete?</label>
                  <div className='flex items-center gap-4'>
                    <input
                      type='number' min={1} max={365} value={deadlineDays}
                      onChange={(e) => setDeadlineDays(Number(e.target.value))}
                      className='w-32 bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white rounded-lg px-4 py-2.5 text-sm outline-none transition-colors'
                    />
                    <span className='text-stone-500 text-sm'>
                      Deadline: {new Date(Date.now() + deadlineDays * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div className='bg-stone-800/50 rounded-xl p-4 mb-6 flex gap-6'>
                  {[
                    { value: juzCount,        label: 'Juz total'   },
                    { value: juzCount * 20,   label: 'Pages total' },
                    { value: deadlineDays,    label: 'Days'        },
                  ].map(({ value, label }) => (
                    <div key={label} className='text-center'>
                      <p className='text-emerald-400 font-bold text-2xl'>{value}</p>
                      <p className='text-stone-500 text-xs mt-0.5'>{label}</p>
                    </div>
                  ))}
                </div>

                {createError && <p className='text-red-400 text-sm mb-4'>{createError}</p>}

                <button
                  onClick={handleCreate} disabled={mutation.isPending}
                  className='w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all hover:-translate-y-0.5'
                >
                  {mutation.isPending ? (
                    <>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                      Creating plan...
                    </>
                  ) : <>📖 Create Khatm Plan</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STATE B: Khatm result ─────────────────────────────────── */}
          {activeKhatm && (
            <motion.div
              key='khatm-result'
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ProgressBar percent={progressPct} />

              {/* Stats */}
              <div className='grid grid-cols-3 gap-4 mb-6'>
                {[
                  { label: 'Total Pages', value: activeKhatm.goal?.pages ?? juzCount * 20 },
                  { label: 'Days Left',   value: activeKhatm.goal?.days  ?? deadlineDays  },
                  { label: 'Members',     value: activeKhatm.assignments?.length ?? '—'   },
                ].map(({ label, value }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    className='bg-stone-900 border border-stone-800 rounded-xl p-4 text-center'
                  >
                    <p className='text-emerald-400 font-bold text-2xl'>{value}</p>
                    <p className='text-stone-500 text-xs mt-1'>{label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Assignments table — animated in */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className='overflow-hidden'
              >
                <div className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
                  <div className='px-6 py-4 border-b border-stone-800'>
                    <h2 className='text-white font-semibold text-sm'>Juz Assignments</h2>
                  </div>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-stone-800'>
                        <th className='text-left text-stone-500 text-xs font-medium px-6 py-3'>Member</th>
                        <th className='text-left text-stone-500 text-xs font-medium px-6 py-3'>Juz Assigned</th>
                        <th className='text-left text-stone-500 text-xs font-medium px-6 py-3'>Pages</th>
                        <th className='text-left text-stone-500 text-xs font-medium px-6 py-3'>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeKhatm.assignments?.map((member, i) => (
                        <motion.tr
                          key={member.memberId ?? i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.08 }}
                          className='border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors'
                        >
                          <td className='px-6 py-4'>
                            <div className='flex items-center gap-3'>
                              <div className='w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-300 text-xs font-bold'>
                                {(member.username || '?')[0].toUpperCase()}
                              </div>
                              <span className='text-stone-200 text-sm'>{member.username}</span>
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <span className='text-white font-semibold'>{member.juzAssigned}</span>
                            <span className='text-stone-500 text-xs ml-1'>Juz</span>
                          </td>
                          <td className='px-6 py-4 text-stone-400 text-sm'>{member.juzAssigned * 20} pages</td>
                          <td className='px-6 py-4'>
                            <StatusBadge status={member.status ?? 'in-progress'} />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              <button
                onClick={() => setKhatmResult(null)}
                className='mt-4 text-stone-600 hover:text-stone-400 text-xs transition-colors'
              >
                ← Create a new Khatm plan
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default KhatmPlanner;