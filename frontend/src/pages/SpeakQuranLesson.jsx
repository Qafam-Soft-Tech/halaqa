// ─────────────────────────────────────────────────────────────────────────────
// SpeakQuranLesson.jsx
// Route: /speak-quran/lesson  (wrapped in ProtectedRoute in App.jsx)
// The core word-learning lesson: card → test → complete
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }                               from 'react-router-dom';
import { useQuery, useQueryClient }                  from '@tanstack/react-query';
import { motion, AnimatePresence }                   from 'framer-motion';
import api                                           from '@/lib/api';
import DashboardLayout                               from '@/components/DashboardLayout';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Pick `n` random items from `arr`, excluding `excludeValue` on `key`. */
function randomSample(arr, n, excludeKey, excludeValue) {
  const pool = arr.filter(w => w[excludeKey] !== excludeValue);
  const out  = [];
  const used = new Set();
  while (out.length < n && used.size < pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    if (!used.has(idx)) { used.add(idx); out.push(pool[idx]); }
  }
  return out;
}

/** Shuffle an array in-place (Fisher-Yates). */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build the 4 answer choices for the current word. */
function buildChoices(words, currentWord) {
  const wrongs  = randomSample(words, 3, 'arabic', currentWord.arabic)
                    .map(w => w.translation);
  const choices = shuffle([currentWord.translation, ...wrongs]);
  return choices;
}

// ── tiny Toast ────────────────────────────────────────────────────────────────
const Toast = ({ message, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className='fixed bottom-8 left-1/2 -translate-x-1/2 z-50
                 bg-stone-800 text-stone-300 text-sm px-5 py-2.5 rounded-full
                 border border-stone-700 shadow-xl pointer-events-none'
    >
      {message}
    </motion.div>
  );
};

// ── CoinBadge (always-visible pill) ──────────────────────────────────────────
const CoinBadge = ({ balance }) => (
  <motion.div
    key={balance}
    initial={{ scale: 1 }}
    animate={{ scale: [1, 1.25, 1] }}
    transition={{ duration: 0.35 }}
    className='bg-amber-900/40 text-amber-300 rounded-full px-4 py-1 text-sm
               border border-amber-700/30 font-medium tabular-nums select-none'
  >
    {balance} 🪙
  </motion.div>
);

// ── CoinAnimation (floating delta) ───────────────────────────────────────────
const CoinAnimation = ({ delta, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  const isPos = delta > 0;
  return (
    <motion.span
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: [0, 1, 1, 0], y: -40 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
      className={`absolute top-4 right-6 text-lg font-bold pointer-events-none select-none z-10
                  ${isPos ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {isPos ? `+${delta}` : delta} 🪙
    </motion.span>
  );
};

// ── ProgressBar ───────────────────────────────────────────────────────────────
const ProgressBar = ({ current, total }) => (
  <div className='w-full mb-8'>
    <div className='flex justify-between text-xs text-stone-500 mb-1.5'>
      <span>Word {current + 1} of {total}</span>
      <span>{Math.round((current / total) * 100)}%</span>
    </div>
    <div className='w-full h-1.5 bg-stone-800 rounded-full overflow-hidden'>
      <motion.div
        className='h-full bg-emerald-500 rounded-full origin-left'
        initial={{ scaleX: 0 }}
        animate={{ scaleX: current / total }}
        transition={{ ease: 'easeOut', duration: 0.4 }}
        style={{ transformOrigin: 'left' }}
      />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const SpeakQuranLesson = () => {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  // ── Remote data ────────────────────────────────────────────────────────────
  const {
    data: learnData,
    isLoading: wordsLoading,
    isError: wordsError,
    refetch: refetchWords,
  } = useQuery({
    queryKey: ['learn-words'],
    queryFn:  () => api.get('/learn/words').then(r => r.data.data),
  });

  const {
    data: progressData,
    isLoading: progressLoading,
  } = useQuery({
    queryKey: ['learn-progress'],
    queryFn:  () => api.get('/learn/progress').then(r => r.data.data),
  });

  const words = learnData?.words ?? [];

  // ── Lesson state ────────────────────────────────────────────────────────────
  const [currentIndex,    setCurrentIndex]    = useState(0);
  const [phase,           setPhase]           = useState('card'); // card | test | complete
  const [choices,         setChoices]         = useState([]);
  const [selectedAnswer,  setSelectedAnswer]  = useState(null);   // the option clicked
  const [correctAnswer,   setCorrectAnswer]   = useState(null);   // the right answer
  const [lockedAnswer,    setLockedAnswer]     = useState(false);  // prevent double-click
  const [score,           setScore]           = useState({ correct: 0, wrong: 0 });
  const [coinBalance,     setCoinBalance]      = useState(null);   // null = loading
  const [showCoinAnim,    setShowCoinAnim]    = useState(false);
  const [coinDelta,       setCoinDelta]       = useState(0);
  const [toast,           setToast]           = useState(null);
  const audioRef = useRef(null);

  // Initialise coin balance from progress query
  useEffect(() => {
    if (progressData?.balance != null && coinBalance === null) {
      setCoinBalance(progressData.balance);
    }
  }, [progressData, coinBalance]);

  // Build choices when we enter 'test' phase or word changes
  useEffect(() => {
    if (phase === 'test' && words.length > 0) {
      setChoices(buildChoices(words, words[currentIndex]));
    }
  }, [phase, currentIndex, words]);

  // ── Audio playback ─────────────────────────────────────────────────────────
  const playAudio = useCallback(() => {
    const word = words[currentIndex];
    if (!word?.audioUrl) {
      setToast('No audio available for this word');
      return;
    }
    const url = `https://verses.quran.foundation/${word.audioUrl}`;
    if (audioRef.current) { audioRef.current.pause(); }
    const a = new Audio(url);
    audioRef.current = a;
    a.play().catch(() => setToast('Could not play audio'));
  }, [words, currentIndex]);

  // ── Answer selection ────────────────────────────────────────────────────────
  const handleAnswer = useCallback(async (option) => {
    if (lockedAnswer) return;
    setLockedAnswer(true);

    const word      = words[currentIndex];
    const isCorrect = option === word.translation;

    setSelectedAnswer(option);
    setCorrectAnswer(word.translation);
    setScore(s => isCorrect
      ? { ...s, correct: s.correct + 1 }
      : { ...s, wrong: s.wrong + 1 }
    );

    // Fire-and-forget POST to backend
    try {
      const res = await api.post('/learn/answer', {
        wordKey:     word.wordKey ?? word.arabic,
        arabic:      word.arabic,
        translation: word.translation,
        correct:     isCorrect,
      });
      const { newBalance, coinDelta: delta } = res.data?.data ?? {};
      if (newBalance != null) {
        setCoinBalance(newBalance);
        setCoinDelta(delta ?? (isCorrect ? 10 : -5));
        setShowCoinAnim(true);
      }
    } catch {
      // non-fatal — optimistically adjust locally
      const delta = isCorrect ? 10 : -5;
      setCoinBalance(b => (b ?? 0) + delta);
      setCoinDelta(delta);
      setShowCoinAnim(true);
    }

    // Advance after brief delay
    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        setPhase('complete');
      } else {
        setCurrentIndex(i => i + 1);
        setPhase('card');
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setLockedAnswer(false);
      }
    }, 1200);
  }, [lockedAnswer, words, currentIndex]);

  // ── Reset / Practice Again ─────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    setCurrentIndex(0);
    setPhase('card');
    setSelectedAnswer(null);
    setCorrectAnswer(null);
    setLockedAnswer(false);
    setScore({ correct: 0, wrong: 0 });
    setShowCoinAnim(false);
    queryClient.removeQueries({ queryKey: ['learn-words'] });
    await refetchWords();
  }, [refetchWords, queryClient]);

  // ── Result message ─────────────────────────────────────────────────────────
  const resultMessage = () => {
    const ratio = score.correct / Math.max(words.length, 1);
    if (ratio >= 0.9)  return 'MashaAllah! Excellent! 🌟';
    if (ratio >= 0.7)  return 'Very good! Keep going! 💪';
    return 'Keep practising! The Qur\'an rewards patience. 📖';
  };

  const coinSummary = () => {
    const net = (score.correct * 10) - (score.wrong * 5);
    if (net > 0)  return `You earned ${net} coins this lesson`;
    if (net < 0)  return `You lost ${Math.abs(net)} coins this lesson`;
    return 'No net change in coins this lesson';
  };

  // ── Loading / error guards ─────────────────────────────────────────────────
  if (wordsLoading || progressLoading) {
    return (
      <DashboardLayout>
        <div className='flex items-center justify-center h-full min-h-[60vh]'>
          <div className='flex flex-col items-center gap-4'>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className='w-10 h-10 rounded-full border-2 border-stone-700 border-t-emerald-500'
            />
            <p className='text-stone-400 text-sm'>Loading lesson…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (wordsError || words.length === 0) {
    return (
      <DashboardLayout>
        <div className='flex flex-col items-center justify-center h-full min-h-[60vh] gap-4'>
          <p className='text-stone-400 text-center max-w-sm'>
            {wordsError
              ? 'Could not load words. Please check your connection.'
              : 'No words available for this lesson yet.'}
          </p>
          <button
            onClick={() => navigate('/speak-quran')}
            className='text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2'
          >
            ← Back to Speak Qur'an
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const word = words[currentIndex];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <Toast
            key='toast'
            message={toast}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate('/speak-quran')}
            className='text-stone-500 hover:text-stone-300 transition-colors text-sm flex items-center gap-1.5'
          >
            ← Back
          </button>
          <span className='text-stone-700'>|</span>
          <h1 className='text-stone-300 text-sm font-medium tracking-wide uppercase'>
            Word Lesson
          </h1>
        </div>

        {/* Coin balance pill */}
        {coinBalance !== null && <CoinBadge balance={coinBalance} />}
      </div>

      {/* ── Lesson card area ──────────────────────────────────────────── */}
      <div className='flex justify-center px-2'>
        <div className='w-full max-w-lg'>

          <AnimatePresence mode='wait'>

            {/* ════════════════════════════════════════════════════════════
                PHASE: card — show the Arabic word + audio
            ════════════════════════════════════════════════════════════ */}
            {phase === 'card' && (
              <motion.div
                key={`card-${currentIndex}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.3 }}
                className='relative bg-stone-900 rounded-3xl p-10 text-center
                           border border-stone-800 shadow-2xl'
              >
                {/* Progress */}
                <ProgressBar current={currentIndex} total={words.length} />

                {/* Arabic word */}
                <p
                  dir='rtl'
                  className='font-arabic text-6xl text-white leading-tight mb-3'
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {word.arabic}
                </p>

                {/* Transliteration */}
                <p className='text-amber-300 text-lg italic mb-8 tracking-wide'>
                  {word.transliteration}
                </p>

                {/* Audio button */}
                <button
                  onClick={playAudio}
                  className='mx-auto mb-6 flex flex-col items-center gap-2 group'
                  aria-label='Hear pronunciation'
                >
                  <div className='w-16 h-16 rounded-full bg-emerald-700 hover:bg-emerald-600
                                  flex items-center justify-center text-2xl
                                  transition-all duration-200 shadow-lg
                                  group-hover:shadow-emerald-900/60 group-hover:scale-105'>
                    🔊
                  </div>
                  <span className='text-xs text-stone-500 group-hover:text-stone-400 transition-colors'>
                    Hear it
                  </span>
                </button>

                {/* Reveal meaning */}
                <button
                  onClick={() => setPhase('test')}
                  className='text-emerald-400 hover:text-emerald-300 text-sm font-medium
                             underline underline-offset-4 transition-colors'
                >
                  Reveal meaning →
                </button>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                PHASE: test — multiple choice
            ════════════════════════════════════════════════════════════ */}
            {phase === 'test' && (
              <motion.div
                key={`test-${currentIndex}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.3 }}
                className='relative bg-stone-900 rounded-3xl p-10 text-center
                           border border-stone-800 shadow-2xl'
              >
                {/* Coin animation */}
                <AnimatePresence>
                  {showCoinAnim && (
                    <CoinAnimation
                      key='coin-anim'
                      delta={coinDelta}
                      onDone={() => setShowCoinAnim(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Progress */}
                <ProgressBar current={currentIndex} total={words.length} />

                {/* Arabic word (smaller) */}
                <p
                  dir='rtl'
                  className='font-arabic text-3xl text-white leading-snug mb-1'
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {word.arabic}
                </p>

                {/* Transliteration */}
                <p className='text-amber-300 text-sm italic mb-8 tracking-wide'>
                  {word.transliteration}
                </p>

                {/* Question */}
                <p className='text-white text-lg font-semibold mb-6'>
                  What does this word mean?
                </p>

                {/* Answer options */}
                <div className='space-y-3'>
                  {choices.map((option, i) => {
                    const isSelected = selectedAnswer === option;
                    const isRight    = correctAnswer   === option;
                    let   btnClass   = 'bg-stone-800 hover:bg-stone-700 text-white border-stone-700';

                    if (selectedAnswer !== null) {
                      if (isRight)              btnClass = 'bg-emerald-700 text-white border-emerald-600';
                      else if (isSelected)      btnClass = 'bg-red-800    text-white border-red-700';
                      else                      btnClass = 'bg-stone-800  text-stone-500 border-stone-700';
                    }

                    return (
                      <motion.button
                        key={i}
                        whileTap={selectedAnswer === null ? { scale: 0.97 } : {}}
                        onClick={() => handleAnswer(option)}
                        disabled={selectedAnswer !== null}
                        className={`w-full px-5 py-3.5 rounded-xl text-sm font-medium
                                    border text-left transition-all duration-200
                                    disabled:cursor-default ${btnClass}`}
                      >
                        <span className='text-stone-500 mr-3 font-mono text-xs'>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                PHASE: complete — results summary
            ════════════════════════════════════════════════════════════ */}
            {phase === 'complete' && (
              <motion.div
                key='complete'
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className='bg-stone-900 rounded-3xl p-10 text-center
                           border border-stone-800 shadow-2xl'
              >
                {/* Celebration icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                  className='text-5xl mb-4'
                >
                  🎉
                </motion.div>

                <h2 className='text-white text-2xl font-bold mb-2'>
                  Lesson Complete!
                </h2>

                <p className='text-emerald-400 text-sm font-medium mb-8 italic'>
                  {resultMessage()}
                </p>

                {/* Score card */}
                <div className='bg-stone-800/60 rounded-2xl p-6 mb-6 space-y-3
                                border border-stone-700/50'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-stone-400'>Correct</span>
                    <span className='text-emerald-400 font-semibold'>
                      {score.correct} / {words.length}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-stone-400'>Wrong</span>
                    <span className='text-red-400 font-semibold'>{score.wrong}</span>
                  </div>
                  <div className='border-t border-stone-700/50 pt-3 flex justify-between text-sm'>
                    <span className='text-stone-400'>{coinSummary()}</span>
                  </div>
                  {coinBalance !== null && (
                    <div className='flex justify-between text-sm'>
                      <span className='text-stone-400'>Current balance</span>
                      <span className='text-amber-300 font-semibold'>
                        {coinBalance} 🪙
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='flex flex-col gap-3'>
                  <button
                    onClick={handleReset}
                    className='w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600
                               text-white text-sm font-semibold transition-colors'
                  >
                    Practice Again
                  </button>
                  <button
                    onClick={() => navigate('/tournament')}
                    className='w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700
                               text-stone-200 text-sm font-medium border border-stone-700
                               transition-colors'
                  >
                    Go to Tournament →
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default SpeakQuranLesson;