// ─────────────────────────────────────────────────────────────────────────────
// MyCircles.jsx
// List of the authenticated user's Quran accountability circles.
// This is the original Dashboard.jsx circle-list logic, extracted unchanged.
// The only difference from the old file is the exported component name.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

// ── Fetch helper ──────────────────────────────────────────────────────────────
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

// ── Create Circle Modal ───────────────────────────────────────────────────────
const CreateCircleModal = ({ onClose, onSuccess }) => {
  const [form,    setForm]    = useState({ name: '', url: '', description: '', type: 'study' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    setForm((prev) => ({ ...prev, name, url: slug }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Circle name is required.');
    if (!form.url.trim())  return setError('Circle URL is required.');
    setError('');
    setLoading(true);
    try {
      const res  = await api.post('/rooms/create', form);
      const room = res.data?.data ?? res.data;
      onSuccess(room);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Failed to create circle. Please try again.'
      );
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className='fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className='bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6 shadow-2xl'
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-white font-bold text-lg'>New Circle</h2>
            <button
              onClick={onClose}
              className='text-stone-500 hover:text-white text-xl transition-colors'
            >
              ✕
            </button>
          </div>

          <div className='space-y-4'>
            {/* Name */}
            <div>
              <label className='block text-stone-400 text-sm mb-1.5'>
                Circle Name <span className='text-red-400'>*</span>
              </label>
              <input
                type='text'
                value={form.name}
                onChange={handleNameChange}
                placeholder='e.g. Al-Fajr Study Group'
                maxLength={50}
                className='w-full bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white placeholder-stone-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors'
              />
            </div>

            {/* URL slug */}
            <div>
              <label className='block text-stone-400 text-sm mb-1.5'>
                Circle URL <span className='text-red-400'>*</span>
                <span className='text-stone-600 text-xs ml-2'>(unique identifier)</span>
              </label>
              <div className='flex items-center bg-stone-800 border border-stone-700 focus-within:border-emerald-500 rounded-lg px-4 py-2.5 gap-1'>
                <span className='text-stone-500 text-sm shrink-0'>quranreflect.com/</span>
                <input
                  type='text'
                  value={form.url}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50),
                    })
                  }
                  placeholder='my-circle'
                  className='bg-transparent text-white text-sm outline-none flex-1 min-w-0'
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className='block text-stone-400 text-sm mb-1.5'>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder='What is this circle about?'
                rows={3}
                maxLength={200}
                className='w-full bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white placeholder-stone-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors resize-none'
              />
            </div>

            {/* Type */}
            <div>
              <label className='block text-stone-400 text-sm mb-1.5'>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className='w-full bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white rounded-lg px-4 py-2.5 text-sm outline-none transition-colors'
              >
                <option value='study'>Study Group (Public)</option>
                <option value='family'>Family Circle (Private)</option>
                <option value='mosque'>Mosque Page (Public)</option>
              </select>
            </div>

            {error && <p className='text-red-400 text-sm'>{error}</p>}
          </div>

          <div className='flex gap-3 mt-6'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-2.5 rounded-lg border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 text-sm transition-all'
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className='flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all'
            >
              {loading ? 'Creating...' : 'Create Circle'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Skeleton loading card ─────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className='bg-stone-900 border border-stone-800 rounded-2xl p-6 animate-pulse'>
    <div className='h-5 bg-stone-700 rounded w-2/3 mb-3' />
    <div className='h-4 bg-stone-800 rounded w-full mb-2' />
    <div className='h-4 bg-stone-800 rounded w-3/4 mb-6' />
    <div className='h-3 bg-stone-800 rounded w-1/4' />
  </div>
);

// ── Badge config keyed by room type string ────────────────────────────────────
const typeBadge = {
  GROUP:  { label: 'Group',  color: 'bg-blue-900/50 text-blue-300'     },
  PAGE:   { label: 'Page',   color: 'bg-amber-900/50 text-amber-300'   },
  study:  { label: 'Study',  color: 'bg-blue-900/50 text-blue-300'     },
  family: { label: 'Family', color: 'bg-violet-900/50 text-violet-300' },
  mosque: { label: 'Mosque', color: 'bg-amber-900/50 text-amber-300'   },
};

// ── MyCircles page ────────────────────────────────────────────────────────────
const MyCircles = () => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: circles = [], isLoading } = useQuery({
    queryKey: ['my-circles'],
    queryFn:  fetchMyCircles,
  });

  const handleCircleCreated = (room) => {
    queryClient.invalidateQueries({ queryKey: ['my-circles'] });
    setShowModal(false);
    if (room?.id) navigate(`/circle/${room.id}`);
  };

  return (
    <DashboardLayout>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <motion.div
        className='flex items-center justify-between mb-8'
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className='text-2xl font-bold text-white'>My Circles</h1>
          <p className='text-stone-500 text-sm mt-1'>Your Quran accountability groups</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className='flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-900/40'
        >
          <span className='text-base leading-none'>+</span>
          New Circle
        </button>
      </motion.div>

      {/* ── Loading skeletons ────────────────────────────────────────── */}
      {isLoading && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {!isLoading && circles.length === 0 && (
        <motion.div
          className='flex flex-col items-center justify-center py-24 text-center'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className='text-5xl mb-4 opacity-30'>◎</div>
          <p className='text-stone-400 text-base mb-1'>You have no circles yet.</p>
          <p className='text-stone-600 text-sm'>Create one to get started.</p>
          <button
            onClick={() => setShowModal(true)}
            className='mt-6 bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-5 py-2.5 rounded-xl transition-all'
          >
            + Create your first circle
          </button>
        </motion.div>
      )}

      {/* ── Circle cards ─────────────────────────────────────────────── */}
      {!isLoading && circles.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {circles.map((circle, index) => {
            const badgeKey = circle.roomType || circle.type || 'study';
            const badge    = typeBadge[badgeKey] ?? typeBadge.study;
            return (
              <motion.div
                key={circle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                onClick={() => navigate(`/circle/${circle.id}`)}
                className='group bg-stone-900 border border-stone-800 hover:border-emerald-700 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950'
              >
                <div className='flex items-start justify-between mb-3'>
                  <h3 className='text-white font-semibold text-base group-hover:text-emerald-400 transition-colors'>
                    {circle.name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <p className='text-stone-500 text-sm leading-relaxed mb-5 line-clamp-2'>
                  {circle.description || 'No description provided.'}
                </p>
                <div className='flex items-center justify-between'>
                  <span className='text-stone-600 text-xs'>
                    {circle.membersCount ?? circle.members_count ?? '—'} members
                  </span>
                  <span className='text-emerald-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity'>
                    Open →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Create circle modal ──────────────────────────────────────── */}
      {showModal && (
        <CreateCircleModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCircleCreated}
        />
      )}
    </DashboardLayout>
  );
};

export default MyCircles;