// ─────────────────────────────────────────────────────────────────────────────
// Explore.jsx
// Discover public Quran circles and browse community reflections.
//
// Data sources:
//   • /api/proxy/auth/v1/rooms?public=true  → public circle listing
//   • /api/proxy/content/api/v4/... (Quran Reflect posts) — future extension
//
// All fetches are wrapped in fetchSafe so the page never crashes on API errors.
// The search and surah filter run entirely client-side against the fetched list.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useQuery }          from '@tanstack/react-query';
import { motion }            from 'framer-motion';
import { useNavigate }       from 'react-router-dom';
import DashboardLayout       from '@/components/DashboardLayout';
import api                   from '@/lib/api';

// ── Safe fetch ────────────────────────────────────────────────────────────────
const fetchSafe = async (url) => {
  try {
    const res = await api.get(url);
    return res.data;
  } catch {
    return null;
  }
};

// ── Fetch public circles ──────────────────────────────────────────────────────
const fetchPublicCircles = async () => {
  try {
    // Try the QF rooms endpoint with public flag
    const res   = await api.get('/proxy/auth/v1/rooms?public=true&per_page=20');
    const data  = res.data;
    const items = data?.data ?? data;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className='bg-stone-900 border border-stone-800 rounded-2xl p-5 animate-pulse'>
    <div className='h-4 bg-stone-700 rounded w-1/2 mb-3' />
    <div className='h-3 bg-stone-800 rounded w-full mb-2' />
    <div className='h-3 bg-stone-800 rounded w-3/4 mb-5' />
    <div className='h-8 bg-stone-800 rounded-xl' />
  </div>
);

// ── Circle access badge ───────────────────────────────────────────────────────
const AccessBadge = ({ isPublic }) =>
  isPublic ? (
    <span className='text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-800/40'>
      Open
    </span>
  ) : (
    <span className='text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-500 border border-stone-700'>
      Invite only
    </span>
  );

// ── Public Circle card ────────────────────────────────────────────────────────
const CircleCard = ({ circle, index }) => {
  const navigate   = useNavigate();
  const isPublic   = circle.public ?? circle.isPublic ?? true;
  const memberCount = circle.membersCount ?? circle.members_count ?? 0;

  return (
    <motion.div
      className='bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 flex flex-col'
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
    >
      {/* Header */}
      <div className='flex items-start justify-between gap-2 mb-2'>
        <div className='flex items-center gap-3 min-w-0'>
          <div className='w-9 h-9 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0'>
            {circle.name?.[0]?.toUpperCase() ?? 'C'}
          </div>
          <h3 className='text-white font-semibold text-sm leading-snug truncate'>
            {circle.name}
          </h3>
        </div>
        <AccessBadge isPublic={isPublic} />
      </div>

      {/* Description */}
      <p className='text-stone-500 text-xs leading-relaxed mb-4 line-clamp-2 flex-1 ml-12'>
        {circle.description || 'A Quran accountability circle.'}
      </p>

      {/* Meta */}
      <div className='flex items-center gap-3 ml-12 mb-4'>
        <span className='text-stone-600 text-xs'>◎ {memberCount} members</span>
      </div>

      {/* CTA */}
      <button
        onClick={() => isPublic && navigate(`/circle/${circle.id}`)}
        disabled={!isPublic}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
          isPublic
            ? 'bg-emerald-700 hover:bg-emerald-600 text-white hover:-translate-y-0.5'
            : 'bg-stone-800 text-stone-600 cursor-not-allowed'
        }`}
      >
        {isPublic ? 'View circle →' : 'Invite only'}
      </button>
    </motion.div>
  );
};

// ── Community reflection row ──────────────────────────────────────────────────
// Shown when the QF Quran Reflect feed is available; renders static placeholder
// until the API integration is extended.
const ReflectionRow = ({ text, verseKey, author, time, avatarColor }) => (
  <div className='flex gap-3 items-start py-3.5 border-b border-stone-800/60 last:border-0'>
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor}`}
    >
      {author?.[0]?.toUpperCase() ?? '?'}
    </div>
    <div className='flex-1 min-w-0'>
      <p className='text-stone-300 text-sm leading-snug line-clamp-2'>
        "{text}"
      </p>
      <div className='flex items-center gap-3 mt-1'>
        {verseKey && (
          <span className='text-emerald-500 text-xs'>{verseKey}</span>
        )}
        <span className='text-stone-600 text-xs'>{author} · {time}</span>
      </div>
    </div>
  </div>
);

// ── Static placeholder reflections (shown until live feed is wired) ───────────
// Replace with real Quran Reflect API data when the endpoint is confirmed.
const PLACEHOLDER_REFLECTIONS = [
  {
    id:    1,
    text:  'This verse transformed how I understand tawakkul — real reliance is paired with real action.',
    verse: '2:286',
    author: 'Mohammed A.',
    time:  '1h ago',
    avatarColor: 'bg-violet-900 text-violet-300',
  },
  {
    id:    2,
    text:  'Reading Ayat al-Kursi with tafsir today brought so much peace to my morning.',
    verse: '2:255',
    author: 'Zainab H.',
    time:  '3h ago',
    avatarColor: 'bg-amber-900 text-amber-300',
  },
  {
    id:    3,
    text:  'The commentary on Al-Fatihah in the session today was incredible. SubhanAllah.',
    verse: '1:1',
    author: 'Ibrahim K.',
    time:  '5h ago',
    avatarColor: 'bg-emerald-900 text-emerald-300',
  },
];

// ── Explore page ──────────────────────────────────────────────────────────────
const Explore = () => {
  const [search, setSearch] = useState('');

  // Public circles
  const { data: publicCircles = [], isLoading } = useQuery({
    queryKey:  ['public-circles'],
    queryFn:   fetchPublicCircles,
    staleTime: 60_000,
    retry:     false,
  });

  // Client-side filter by name / description
  const filtered = useMemo(() => {
    if (!search.trim()) return publicCircles;
    const q = search.toLowerCase();
    return publicCircles.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [publicCircles, search]);

  return (
    <DashboardLayout>

      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div
        className='mb-8'
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.3 }}
      >
        <h1 className='text-2xl font-bold text-white mb-1'>Explore</h1>
        <p className='text-stone-500 text-sm'>Discover public circles and community reflections</p>

        {/* Search */}
        <div className='mt-5 flex items-center gap-3 bg-stone-900 border border-stone-800 focus-within:border-emerald-700 rounded-xl px-4 py-3 transition-colors'>
          <span className='text-stone-500 text-sm'>⌕</span>
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search circles by name or description…'
            className='flex-1 bg-transparent text-white text-sm placeholder-stone-600 outline-none'
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className='text-stone-600 hover:text-stone-400 text-xs transition-colors'
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Public circles section ────────────────────────────────── */}
      <section className='mb-10'>
        <h2 className='text-stone-400 text-xs font-medium uppercase tracking-widest mb-4'>
          {search ? `Results for "${search}"` : 'Public circles'}
        </h2>

        {/* Loading */}
        {isLoading && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Results */}
        {!isLoading && filtered.length > 0 && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {filtered.map((circle, i) => (
              <CircleCard key={circle.id} circle={circle} index={i} />
            ))}
          </div>
        )}

        {/* Empty state — no circles from API */}
        {!isLoading && publicCircles.length === 0 && (
          <motion.div
            className='bg-stone-900 border border-stone-800 rounded-2xl py-16 text-center'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className='text-4xl mb-4 opacity-20'>⊕</p>
            <p className='text-stone-400 text-sm mb-1'>No public circles yet</p>
            <p className='text-stone-600 text-xs'>
              Public circles created by the community will appear here
            </p>
          </motion.div>
        )}

        {/* Empty state — search returned nothing */}
        {!isLoading && publicCircles.length > 0 && filtered.length === 0 && (
          <div className='bg-stone-900 border border-stone-800 rounded-2xl py-12 text-center'>
            <p className='text-stone-500 text-sm mb-1'>No circles match "{search}"</p>
            <button
              onClick={() => setSearch('')}
              className='text-xs text-emerald-500 hover:text-emerald-400 mt-2 transition-colors'
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      {/* ── Community reflections section ────────────────────────── */}
      <section>
        <h2 className='text-stone-400 text-xs font-medium uppercase tracking-widest mb-4'>
          Community reflections
        </h2>

        <motion.div
          className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden px-5'
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {PLACEHOLDER_REFLECTIONS.map((r) => (
            <ReflectionRow
              key={r.id}
              text={r.text}
              verseKey={r.verse}
              author={r.author}
              time={r.time}
              avatarColor={r.avatarColor}
            />
          ))}

          <div className='py-3 text-center'>
            <p className='text-stone-700 text-xs'>
              Live feed from Quran Reflect — coming soon
            </p>
          </div>
        </motion.div>
      </section>

    </DashboardLayout>
  );
};

export default Explore;