import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import ReflectionForm from '@/components/ReflectionForm';
import AccountabilityDashboard from '@/components/AccountabilityDashboard';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// ── API prefix map ────────────────────────────────────────────────────────────
// /auth/v1/         → personal user data (bookmarks, collections, notes, goals)
// /quran-reflect/v1/ → rooms, posts, comments, tags (QuranReflect content)

const fetchSafe = (url) => api.get(url).then((r) => r.data).catch(() => null);
const getInitial = (name) => (name || '?')[0].toUpperCase();
const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`bg-stone-800 rounded-xl animate-pulse ${className}`} />
);

// ── Tab Button ────────────────────────────────────────────────────────────────
const TabButton = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
      active ? 'bg-emerald-900/60 text-emerald-400' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-emerald-800 text-emerald-300' : 'bg-stone-800 text-stone-500'}`}>
        {count}
      </span>
    )}
  </button>
);

// ── ReflectionCard ────────────────────────────────────────────────────────────
const ReflectionCard = ({ post, roomId, isNew = false }) => {
  const queryClient = useQueryClient();
  const [showComments,    setShowComments]    = useState(false);
  const [comments,        setComments]        = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const likeMutation = useMutation({
    // Toggle like → /quran-reflect/v1/posts/:id/toggle-like
    mutationFn: () => api.post(`/proxy/quran-reflect/v1/posts/${post.id}/toggle-like`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['room-posts', roomId] }),
  });

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        // Comments → /quran-reflect/v1/posts/:id/comments
        const res  = await api.get(`/proxy/quran-reflect/v1/posts/${post.id}/comments`);
        const data = res.data;
        setComments(Array.isArray(data) ? data : (data?.data ?? []));
      } catch { setComments([]); }
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -20 } : { opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className='bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 transition-colors'
    >
      <div className='flex items-center gap-3 mb-3'>
        <div className='w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-300 text-sm font-bold shrink-0'>
          {getInitial(post.author?.username || post.author?.firstName || post.username)}
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-stone-200 text-sm font-medium truncate'>
            {post.author?.firstName
              ? `${post.author.firstName} ${post.author.lastName || ''}`.trim()
              : post.author?.username || post.username || 'Anonymous'}
          </p>
          <p className='text-stone-600 text-xs'>{formatDate(post.createdAt || post.created_at)}</p>
        </div>
        {post.references?.[0] && (
          <span className='shrink-0 text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 px-2.5 py-1 rounded-full'>
            📖 {post.references[0].chapterId}:{post.references[0].from}
          </span>
        )}
      </div>

      <p className='text-stone-300 text-sm leading-relaxed mb-4'>{post.body || '—'}</p>

      <div className='flex items-center gap-4'>
        <button
          onClick={() => likeMutation.mutate()}
          className='flex items-center gap-1.5 text-stone-500 hover:text-emerald-400 transition-colors text-xs'
        >
          <span>{post.isLiked ? '♥' : '♡'}</span>
          <span>{post.likesCount ?? 0}</span>
        </button>
        <button
          onClick={handleToggleComments}
          className='flex items-center gap-1.5 text-stone-500 hover:text-stone-300 transition-colors text-xs'
        >
          <span>💬</span>
          <span>{post.commentsCount ?? 0} comments</span>
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
            className='overflow-hidden'
          >
            <div className='mt-4 pt-4 border-t border-stone-800 space-y-3'>
              {loadingComments && <Skeleton className='h-10 w-full' />}
              {!loadingComments && comments.length === 0 && (
                <p className='text-stone-600 text-xs text-center py-2'>No comments yet.</p>
              )}
              {!loadingComments && comments.map((c, i) => (
                <div key={c.id ?? i} className='flex items-start gap-2'>
                  <div className='w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-stone-300 text-xs font-bold shrink-0'>
                    {getInitial(c.author?.username || c.username)}
                  </div>
                  <div className='bg-stone-800 rounded-xl px-3 py-2 flex-1'>
                    <p className='text-stone-300 text-xs font-medium mb-0.5'>{c.author?.username || c.username || 'Anonymous'}</p>
                    <p className='text-stone-400 text-xs'>{c.body || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── MemberCard ────────────────────────────────────────────────────────────────
const MemberCard = ({ member, index }) => {
  const isAdmin = member.role === 'admin' || member.role === 'owner';
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className='flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-stone-800 transition-colors'
    >
      <div className='w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-300 text-sm font-bold shrink-0'>
        {getInitial(member.username || member.name)}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-stone-200 text-sm truncate'>{member.username || member.name || 'Unknown'}</p>
        <p className='text-stone-600 text-xs'>{member.role || 'member'}</p>
      </div>
      {isAdmin && <span className='text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full'>Admin</span>}
    </motion.div>
  );
};

// ── CollectionCard ────────────────────────────────────────────────────────────
const CollectionCard = ({ collection, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07 }}
    className='bg-stone-900 border border-stone-800 hover:border-emerald-800 rounded-xl p-4 transition-all cursor-pointer'
  >
    <div className='flex items-center justify-between'>
      <div>
        <p className='text-white text-sm font-medium'>{collection.name || 'Untitled Collection'}</p>
        <p className='text-stone-500 text-xs mt-0.5'>{collection.verseCount ?? collection.verse_count ?? 0} verses</p>
      </div>
      <span className='text-emerald-600 text-xs'>→</span>
    </div>
  </motion.div>
);

// ── New Collection Modal ──────────────────────────────────────────────────────
const NewCollectionModal = ({ onClose, onSuccess }) => {
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      // Collections → /auth/v1/collections (personal data ✅)
      const res = await api.post('/proxy/auth/v1/collections', { name: name.trim() });
      onSuccess(res.data?.data ?? res.data ?? { id: 'local-' + Date.now(), name: name.trim(), verseCount: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create collection.');
    }
    setLoading(false);
  };

  return (
    <motion.div
      className='fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70'
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className='bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl'
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.2 }}
      >
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-white font-bold'>New Collection</h2>
          <button onClick={onClose} className='text-stone-500 hover:text-white text-xl'>✕</button>
        </div>
        <input
          type='text' value={name} onChange={(e) => setName(e.target.value)}
          placeholder='Collection name...'
          className='w-full bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white placeholder-stone-500 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors mb-4'
        />
        {error && <p className='text-red-400 text-xs mb-3'>{error}</p>}
        <div className='flex gap-3'>
          <button onClick={onClose} className='flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-400 text-sm hover:text-white transition-all'>Cancel</button>
          <button
            onClick={handleCreate} disabled={loading || !name.trim()}
            className='flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm transition-all'
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── CircleRoom ────────────────────────────────────────────────────────────────
const CircleRoom = () => {
  const { roomId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [activeTab,        setActiveTab]        = useState('feed');
  const [showNewColl,      setShowNewColl]      = useState(false);
  const [localCollections, setLocalCollections] = useState([]);

  // Room profile → /quran-reflect/v1/rooms/:id
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn:  () => fetchSafe(`/proxy/quran-reflect/v1/rooms/${roomId}`),
  });

  // Members → our backend route (which calls /quran-reflect/v1/rooms/:id/members)
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', roomId],
    queryFn:  () => fetchSafe(`/rooms/${roomId}/members`),
  });

  // Room posts → /quran-reflect/v1/rooms/:id/posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['room-posts', roomId],
    queryFn:  () => fetchSafe(`/proxy/quran-reflect/v1/rooms/${roomId}/posts`),
  });

  // Collections → /auth/v1/collections (personal data ✅)
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ['collections', roomId],
    queryFn:  () => fetchSafe(`/proxy/auth/v1/collections`),
    enabled:  activeTab === 'collections',
  });

  const members = Array.isArray(membersData) ? membersData : (membersData?.data ?? []);
  const posts   = Array.isArray(postsData)   ? postsData   : (postsData?.data  ?? []);
  const collections = [
    ...(Array.isArray(collectionsData) ? collectionsData : (collectionsData?.data ?? [])),
    ...localCollections,
  ];

  const roomName        = room?.name        ?? room?.data?.name        ?? `Circle ${roomId}`;
  const roomDescription = room?.description ?? room?.data?.description ?? '';
  const isAdmin         = members.some(
    (m) => m.username === user?.username && (m.role === 'admin' || m.role === 'owner')
  );

  return (
    <DashboardLayout>
      {/* ── Room header ──────────────────────────────────────────────── */}
      <motion.div
        className='bg-stone-900 border border-stone-800 rounded-2xl p-6 mb-6'
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        {roomLoading ? (
          <div className='space-y-2'><Skeleton className='h-6 w-1/3' /><Skeleton className='h-4 w-2/3' /></div>
        ) : (
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-bold text-white mb-1'>{roomName}</h1>
              {roomDescription && <p className='text-stone-400 text-sm'>{roomDescription}</p>}
              <p className='text-stone-600 text-xs mt-1'>{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
            <div className='flex gap-3 shrink-0'>
              <button onClick={() => navigate(`/circle/${roomId}/khatm`)} className='flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5'>📖 Start Khatm</button>
              <button onClick={() => navigate(`/circle/${roomId}/session`)} className='flex items-center gap-2 bg-stone-700 hover:bg-stone-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5'>🕌 Start Session</button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className='flex items-center gap-1 mb-6 bg-stone-900 border border-stone-800 rounded-xl p-1.5 w-fit overflow-x-auto'>
        <TabButton label='Feed'        active={activeTab === 'feed'}        onClick={() => setActiveTab('feed')}        count={posts.length}       />
        <TabButton label='Members'     active={activeTab === 'members'}     onClick={() => setActiveTab('members')}     count={members.length}     />
        <TabButton label='Collections' active={activeTab === 'collections'} onClick={() => setActiveTab('collections')} count={collections.length} />
        <TabButton label='Dashboard'   active={activeTab === 'dashboard'}   onClick={() => setActiveTab('dashboard')}                              />
      </div>

      <AnimatePresence mode='wait'>

        {/* ── TAB 1: Feed ────────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <motion.div key='feed' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className='space-y-4'>
            <ReflectionForm roomId={roomId} />
            {postsLoading && [1,2,3].map((i) => (
              <div key={i} className='bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3'>
                <div className='flex items-center gap-3'><Skeleton className='w-8 h-8 rounded-full' /><Skeleton className='h-4 w-32' /></div>
                <Skeleton className='h-4 w-full' /><Skeleton className='h-4 w-3/4' />
              </div>
            ))}
            {!postsLoading && posts.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='flex flex-col items-center justify-center py-16 text-center bg-stone-900 border border-stone-800 rounded-2xl'>
                <div className='text-4xl mb-3 opacity-20'>💬</div>
                <p className='text-stone-500 text-sm'>No reflections yet.</p>
                <p className='text-stone-600 text-xs mt-1'>Be the first to share a reflection above.</p>
              </motion.div>
            )}
            {!postsLoading && posts.map((post, i) => (
              <ReflectionCard key={post.id ?? i} post={post} roomId={roomId} isNew={i === 0} />
            ))}
          </motion.div>
        )}

        {/* ── TAB 2: Members ─────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <motion.div key='members' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-stone-800'>
              <h2 className='text-white font-semibold text-sm'>Circle Members</h2>
              {isAdmin && <button className='text-xs text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-900/30 px-3 py-1.5 rounded-lg'>+ Invite Member</button>}
            </div>
            {membersLoading ? (
              <div className='p-4 space-y-3'>{[1,2,3].map((i) => (<div key={i} className='flex items-center gap-3 px-2'><Skeleton className='w-9 h-9 rounded-full' /><div className='flex-1 space-y-1.5'><Skeleton className='h-3.5 w-32' /><Skeleton className='h-3 w-20' /></div></div>))}</div>
            ) : members.length === 0 ? (
              <p className='text-stone-600 text-sm text-center py-12'>No members found.</p>
            ) : (
              <div className='p-2'>{members.map((member, i) => <MemberCard key={member.id ?? i} member={member} index={i} />)}</div>
            )}
          </motion.div>
        )}

        {/* ── TAB 3: Collections ─────────────────────────────────────── */}
        {activeTab === 'collections' && (
          <motion.div key='collections' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-white font-semibold text-sm'>Verse Collections</h2>
              <button onClick={() => setShowNewColl(true)} className='text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-all'>+ New Collection</button>
            </div>
            {collectionsLoading && (<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{[1,2,3,4].map((i) => <Skeleton key={i} className='h-16 rounded-xl' />)}</div>)}
            {!collectionsLoading && collections.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='flex flex-col items-center justify-center py-16 text-center bg-stone-900 border border-stone-800 rounded-2xl'>
                <div className='text-4xl mb-3 opacity-20'>📚</div>
                <p className='text-stone-500 text-sm'>No collections yet.</p>
                <p className='text-stone-600 text-xs mt-1'>Create a collection to curate verses for your circle.</p>
              </motion.div>
            )}
            {!collectionsLoading && collections.length > 0 && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {collections.map((col, i) => <CollectionCard key={col.id ?? i} collection={col} index={i} />)}
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB 4: Dashboard ───────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <motion.div key='dashboard' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AccountabilityDashboard roomId={roomId} />
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── New Collection Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showNewColl && (
          <NewCollectionModal
            onClose={() => setShowNewColl(false)}
            onSuccess={(newCol) => { setLocalCollections((prev) => [...prev, newCol]); setShowNewColl(false); }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default CircleRoom;