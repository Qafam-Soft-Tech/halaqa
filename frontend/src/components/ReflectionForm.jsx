import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, onDone }) => {
  setTimeout(onDone, 3000);
  return (
    <div className='fixed bottom-6 right-6 z-50 bg-emerald-700 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2'>
      <span>✓</span>
      {message}
    </div>
  );
};

// ── Parse verseKey "2:255" → [{ chapterId: 2, from: 255, to: 255 }] ──────────
const parseReferences = (verseKey) => {
  if (!verseKey || !verseKey.trim()) return [];
  const parts = verseKey.trim().split(':');
  if (parts.length !== 2) return [];
  const chapterId  = parseInt(parts[0]);
  const verseNum   = parseInt(parts[1]);
  if (isNaN(chapterId) || isNaN(verseNum)) return [];
  return [{ chapterId, from: verseNum, to: verseNum }];
};

// ── ReflectionForm ────────────────────────────────────────────────────────────
const ReflectionForm = ({ roomId, defaultVerseKey = '' }) => {
  const queryClient = useQueryClient();
  const { user }    = useAuth();

  const [body,      setBody]      = useState('');
  const [verseKey,  setVerseKey]  = useState(defaultVerseKey);
  const [isPublic,  setIsPublic]  = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error,     setError]     = useState('');

  const mutation = useMutation({
    // Posts → /quran-reflect/v1/posts
    mutationFn: (payload) => api.post('/proxy/quran-reflect/v1/posts', payload),
    onSuccess: () => {
      setBody('');
      setVerseKey(defaultVerseKey);
      setIsPublic(false);
      setError('');
      setShowToast(true);
      queryClient.invalidateQueries({ queryKey: ['room-posts', roomId] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to post reflection. Please try again.';
      setError(msg);
    },
  });

  const handleSubmit = () => {
    if (!body.trim())           return setError('Please write something before posting.');
    if (body.trim().length < 6) return setError('Reflection must be at least 6 characters.');
    setError('');
    mutation.mutate({
      post: {
        body:           body.trim(),
        roomPostStatus: isPublic ? 1 : 0,   // 0=OnlyMembers, 1=Publicly
        draft:          false,
        references:     parseReferences(verseKey),
        mentions:       [],
        roomId:         parseInt(roomId) || 0,
        postAsAuthorId: user?.quranUserId || '',
        publishedAt:    new Date().toISOString(),
      },
    });
  };

  return (
    <>
      <div className='bg-stone-900 border border-stone-800 rounded-2xl p-6'>
        <h3 className='text-white font-semibold text-sm mb-4 flex items-center gap-2'>
          <span>💬</span> Share a Reflection
        </h3>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='Share your reflection... (min 6 characters)'
          rows={4}
          className='w-full bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white placeholder-stone-500 rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none mb-3'
        />

        <div className='mb-4'>
          <label className='block text-stone-500 text-xs mb-1.5'>Verse Reference (optional)</label>
          <input
            type='text' value={verseKey}
            onChange={(e) => setVerseKey(e.target.value)}
            placeholder='e.g. 2:255'
            className='w-full bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white placeholder-stone-500 rounded-lg px-4 py-2 text-sm outline-none transition-colors'
          />
        </div>

        <label className='flex items-center gap-3 mb-5 cursor-pointer group'>
          <div className='relative'>
            <input type='checkbox' checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className='sr-only' />
            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isPublic ? 'bg-emerald-600 border-emerald-600' : 'border-stone-600 group-hover:border-emerald-700'}`}>
              {isPublic && <span className='text-white text-xs'>✓</span>}
            </div>
          </div>
          <div>
            <p className='text-stone-300 text-sm'>Also share publicly on Quran Reflect</p>
            <p className='text-stone-600 text-xs'>Others outside this circle can see it</p>
          </div>
        </label>

        {error && <p className='text-red-400 text-sm mb-3'>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={mutation.isPending || !body.trim()}
          className='w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-3 rounded-xl transition-all hover:-translate-y-0.5'
        >
          {mutation.isPending ? (
            <><div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />Posting...</>
          ) : <>✦ Post Reflection</>}
        </button>
      </div>

      {showToast && (
        <Toast message='Reflection posted. JazakAllah Khayran!' onDone={() => setShowToast(false)} />
      )}
    </>
  );
};

export default ReflectionForm;