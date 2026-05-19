// ─────────────────────────────────────────────────────────────────────────────
// Tournament.jsx
// Route: /tournament  —  wrapped in DashboardLayout
// Phase: 'hub' | 'round' | 'results'
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate }    from 'react-router-dom';
import { useQuery }       from '@tanstack/react-query';
import DashboardLayout    from '@/components/DashboardLayout';
import api                from '@/lib/api';

// ── helpers ───────────────────────────────────────────────────────────────────
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

function buildOptions(words, currentIndex) {
  const correct = words[currentIndex];
  const pool    = words.filter((_, i) => i !== currentIndex);
  const wrong   = shuffle(pool).slice(0, 3).map(w => w.translation);
  const options = shuffle([correct.translation, ...wrong]);
  return { options, correctAnswer: correct.translation };
}

// ── Timer circle SVG ──────────────────────────────────────────────────────────
function TimerCircle({ timeLeft, total = 30 }) {
  const r   = 20;
  const circ = 2 * Math.PI * r;
  const pct  = timeLeft / total;
  const low  = timeLeft < 10;
  return (
    <div className='relative w-14 h-14 flex items-center justify-center'>
      <svg className='absolute inset-0 -rotate-90' width='56' height='56' viewBox='0 0 56 56'>
        <circle cx='28' cy='28' r={r} fill='none' stroke='#292524' strokeWidth='4' />
        <circle
          cx='28' cy='28' r={r}
          fill='none'
          stroke={low ? '#ef4444' : '#10b981'}
          strokeWidth='4'
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap='round'
          style={{ transition: 'stroke-dashoffset 0.4s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={`text-sm font-bold tabular-nums ${low ? 'text-red-400' : 'text-white'}`}>
        {timeLeft}
      </span>
    </div>
  );
}

// ── Coin Pill ─────────────────────────────────────────────────────────────────
function CoinPill({ balance }) {
  return (
    <span className='inline-flex items-center gap-1.5 bg-amber-950/70 border border-amber-700/50 text-amber-400 text-sm font-bold px-3 py-1.5 rounded-full'>
      {balance ?? '—'} 🪙
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUB PHASE
// ─────────────────────────────────────────────────────────────────────────────
function HubPhase({ data, onEnter }) {
  const [entering, setEntering] = useState(null);

  const handleEnter = async (leagueId) => {
    setEntering(leagueId);
    try {
      await onEnter(leagueId);
    } finally {
      setEntering(null);
    }
  };

  const current    = data?.currentLeague;
  const next       = data?.nextLeague;
  const allLeagues = data?.allLeagues ?? [];
  const balance    = data?.balance ?? 0;

  // progress toward next league
  const progressPct = next
    ? Math.min(100, ((balance - (current?.minCoins ?? 0)) / ((next.minCoins ?? 1) - (current?.minCoins ?? 0))) * 100)
    : 100;

  return (
    <div className='max-w-4xl mx-auto'>

      {/* ── Header ── */}
      <div className='text-center py-8 relative'>
        <div className='absolute top-8 right-0'>
          <CoinPill balance={balance} />
        </div>
        <h1 className='text-4xl font-bold text-white mb-2'>🏆 Halaqa Tournament</h1>
        <p className='text-stone-400 text-base'>
          Test your knowledge. Climb the leagues. Win coins.
        </p>
      </div>

      {/* ── Current League Banner ── */}
      {current && (
        <div className='mt-6 rounded-2xl bg-linear-to-br from-stone-900 to-stone-800 border border-stone-700/50 p-8 text-center shadow-xl'>
          <div className='text-7xl mb-3'>{current.icon}</div>
          <h2 className='text-3xl font-bold text-white mb-1'>{current.label}</h2>
          <p className='text-stone-400 text-sm mb-4'>Your current league</p>

          {next && (
            <div className='max-w-xs mx-auto'>
              <div className='flex justify-between text-xs text-stone-500 mb-1'>
                <span>{balance} 🪙</span>
                <span>{next.minCoins} 🪙</span>
              </div>
              <div className='h-2 rounded-full bg-stone-700 overflow-hidden'>
                <div
                  className='h-full rounded-full bg-linear-to-r from-emerald-600 to-emerald-400 transition-all duration-700'
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className='text-xs text-stone-400 mt-2'>
                {Math.max(0, (next.minCoins ?? 0) - balance)} more coins to reach{' '}
                <span className='text-amber-400 font-semibold'>{next.label}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── League Grid ── */}
      <div className='mt-8'>
        <h3 className='text-stone-300 font-semibold text-sm uppercase tracking-widest mb-4'>
          Choose a League
        </h3>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3'>
          {allLeagues.map((league) => {
            const canEnter = balance >= (league.minCoins ?? 0) && balance >= (league.entryCost ?? 0);
            const isCurrent = current?.id === league.id;
            const isEntering = entering === league.id;

            return (
              <div
                key={league.id}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl bg-stone-900 border
                  ${isCurrent ? 'ring-2 ring-emerald-500 border-emerald-800' : 'border-stone-800'}
                  transition-all duration-200
                `}
              >
                <span className='text-3xl'>{league.icon}</span>
                <span className='text-white font-semibold text-xs text-center leading-tight'>
                  {league.label}
                </span>
                <span className='text-stone-500 text-[10px]'>
                  {league.minCoins} coins min
                </span>
                <span className='text-amber-500/80 text-[10px]'>
                  Entry: {league.entryCost ?? 0} 🪙
                </span>
                <button
                  disabled={!canEnter || isEntering}
                  onClick={() => handleEnter(league.id)}
                  title={!canEnter ? 'Not enough coins' : ''}
                  className={`
                    mt-1 w-full py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                    ${canEnter && !isEntering
                      ? 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer'
                      : 'bg-stone-700 text-stone-500 opacity-40 cursor-not-allowed'}
                  `}
                >
                  {isEntering ? (
                    <span className='flex items-center justify-center gap-1'>
                      <svg className='animate-spin w-3 h-3' viewBox='0 0 24 24' fill='none'>
                        <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' strokeDasharray='31.4' strokeDashoffset='10' strokeLinecap='round' />
                      </svg>
                      …
                    </span>
                  ) : 'Enter →'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── How to Earn Coins ── */}
      <div className='mt-10 mb-4'>
        <h3 className='text-stone-300 font-semibold text-sm uppercase tracking-widest mb-4'>
          How to earn coins
        </h3>
        <ul className='space-y-2'>
          {[
            { icon: '✅', text: 'Pass a word test',      reward: '+10 🪙' },
            { icon: '❌', text: 'Fail a word test',      reward: '-5 🪙' },
            { icon: '🏆', text: 'Win a tournament',      reward: '+coins (2× stake)' },
            { icon: '📚', text: 'Complete a lesson',     reward: '+50 🪙' },
            { icon: '🔥', text: 'Maintain streak',       reward: '+20 🪙' },
          ].map(({ icon, text, reward }) => (
            <li key={text} className='flex items-center justify-between bg-stone-900/60 border border-stone-800 rounded-xl px-4 py-3'>
              <span className='flex items-center gap-3 text-stone-300 text-sm'>
                <span>{icon}</span>
                {text}
              </span>
              <span className='text-amber-400 text-sm font-semibold tabular-nums'>{reward}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUND PHASE
// ─────────────────────────────────────────────────────────────────────────────
function RoundPhase({ roundData, onComplete }) {
  const [currentQ,     setCurrentQ]     = useState(0);
  const [answers,      setAnswers]       = useState([]);
  const [timeLeft,     setTimeLeft]      = useState(30);
  const [selected,     setSelected]      = useState(null); // chosen option text | null
  const [feedback,     setFeedback]      = useState(null); // 'correct' | 'wrong' | null
  const [submitting,   setSubmitting]    = useState(false);
  const timerRef = useRef(null);

  const words   = roundData?.words ?? [];
  const total   = words.length || 10;
  const word    = words[currentQ];
  const { options, correctAnswer } = word
    ? buildOptions(words, currentQ)
    : { options: [], correctAnswer: '' };

  // ── timer ──
  const advanceQuestion = useCallback((forcedAnswer) => {
    clearInterval(timerRef.current);
    const answer = forcedAnswer ?? selected ?? '__timeout__';
    const isCorrect = answer === correctAnswer;
    const newAnswers = [...answers, { wordId: word?.id, answer, correct: isCorrect }];
    setAnswers(newAnswers);
    setFeedback(isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      setSelected(null);
      setFeedback(null);
      if (currentQ + 1 >= total) {
        // submit
        const score = newAnswers.filter(a => a.correct).length;
        onComplete({ roundId: roundData.roundId, answers: newAnswers, score });
      } else {
        setCurrentQ(q => q + 1);
        setTimeLeft(30);
      }
    }, 800);
  }, [answers, correctAnswer, currentQ, selected, total, word, roundData, onComplete]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advanceQuestion('__timeout__');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ]); // reset on every new question

  const handleSelect = (opt) => {
    if (selected !== null || submitting) return;
    setSelected(opt);
    advanceQuestion(opt);
  };

  const playAudio = () => {
    if (!word?.audioUrl) return;
    const url = `https://verses.quran.foundation/${word.audioUrl}`;
    try { new Audio(url).play(); } catch (_) {}
  };

  // option button styles
  const optStyle = (opt) => {
    if (!selected) return 'bg-stone-800 hover:bg-stone-700 text-white border-stone-700';
    if (opt === correctAnswer)  return 'bg-emerald-800 text-white border-emerald-600';
    if (opt === selected && opt !== correctAnswer) return 'bg-red-900/70 text-white border-red-700';
    return 'bg-stone-800 text-stone-500 border-stone-700 opacity-50';
  };

  return (
    <div className='max-w-lg mx-auto py-6'>
      <div className='bg-linear-to-b from-stone-900 to-stone-950 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden'>

        {/* top bar */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-stone-800'>
          <span className='text-stone-400 text-sm font-medium'>
            Round <span className='text-white font-bold'>{currentQ + 1}</span>/{total}
          </span>
          <div className='flex items-center gap-2'>
            {/* progress dots */}
            <div className='flex gap-1'>
              {Array.from({ length: total }).map((_, i) => {
                const ans = answers[i];
                const color = ans
                  ? (ans.correct ? 'bg-emerald-500' : 'bg-red-500')
                  : i === currentQ ? 'bg-amber-400' : 'bg-stone-700';
                return <span key={i} className={`w-2 h-2 rounded-full ${color} transition-colors`} />;
              })}
            </div>
            <TimerCircle timeLeft={timeLeft} />
          </div>
        </div>

        {/* word card */}
        <div className='px-8 pt-10 pb-6 text-center'>
          {/* audio button */}
          <button
            onClick={playAudio}
            className='mx-auto mb-6 w-12 h-12 rounded-full bg-stone-800 border border-stone-700 hover:bg-emerald-900/50 hover:border-emerald-700 flex items-center justify-center text-xl transition-all duration-150'
            title='Play pronunciation'
          >
            🔊
          </button>

          {/* arabic */}
          <p
            className='text-5xl text-white mb-3 leading-relaxed'
            style={{ fontFamily: '"Amiri", "Scheherazade New", serif', direction: 'rtl' }}
          >
            {word?.arabic ?? '…'}
          </p>

          {/* transliteration */}
          <p className='text-amber-400 italic text-base mb-8'>
            {word?.transliteration ?? ''}
          </p>

          {/* answer options */}
          <div className='space-y-3'>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={!!selected}
                className={`
                  w-full px-4 py-3 rounded-xl border text-sm font-medium text-left
                  transition-all duration-200
                  ${optStyle(opt)}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* feedback strip */}
        {feedback && (
          <div className={`text-center py-3 text-sm font-bold tracking-wide ${
            feedback === 'correct' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
          }`}>
            {feedback === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS PHASE
// ─────────────────────────────────────────────────────────────────────────────
function ResultsPhase({ result, onPlayAgain, onLearn }) {
  const passed = result?.passed;
  return (
    <div className='max-w-sm mx-auto py-16 text-center'>
      <div className='bg-linear-to-br from-stone-900 to-stone-800 border border-stone-700 rounded-2xl p-10 shadow-2xl'>
        <div className='text-6xl mb-4'>{passed ? '🏆' : '📚'}</div>
        <h2 className='text-2xl font-bold text-white mb-1'>
          {passed ? 'MashaAllah! You Won!' : 'Keep Learning!'}
        </h2>
        <p className='text-stone-400 text-sm mb-6'>
          {result?.correctCount ?? 0} / 10 correct
        </p>

        <div className='bg-stone-950/60 rounded-xl p-4 mb-6 space-y-2'>
          {passed ? (
            <p className='text-emerald-400 font-bold text-lg'>
              +{result?.coinsEarned ?? 0} 🪙 earned!
            </p>
          ) : (
            <p className='text-stone-400 text-sm'>Better luck next time</p>
          )}
          <p className='text-amber-400 text-sm font-semibold'>
            New balance: {result?.newBalance ?? 0} 🪙
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          <button
            onClick={onPlayAgain}
            className='w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors'
          >
            Play Again
          </button>
          <button
            onClick={onLearn}
            className='w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl transition-colors border border-stone-700'
          >
            Keep Learning
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const Tournament = () => {
  const navigate = useNavigate();
  const [phase,       setPhase]       = useState('hub');   // 'hub' | 'round' | 'results'
  const [roundData,   setRoundData]   = useState(null);
  const [result,      setResult]      = useState(null);
  const [lastLeague,  setLastLeague]  = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tournament-status'],
    queryFn: () => api.get('/tournament/status').then(r => r.data.data),
    enabled: phase === 'hub',
  });

  // ── enter tournament ──
  const enterTournament = async (leagueId) => {
    setLastLeague(leagueId);
    const res = await api.post('/tournament/enter', { leagueId });
    setRoundData(res.data.data);
    setPhase('round');
  };

  // ── submit round ──
  const handleRoundComplete = async ({ roundId, answers, score }) => {
    try {
      const res = await api.post('/tournament/submit', { roundId, answers, score });
      setResult(res.data.data);
    } catch (err) {
      // fallback: show score without server result
      setResult({ passed: score >= 7, correctCount: score, coinsEarned: 0, newBalance: data?.balance ?? 0 });
    }
    setPhase('results');
  };

  // ── play again ──
  const handlePlayAgain = () => {
    setRoundData(null);
    setResult(null);
    if (lastLeague) {
      enterTournament(lastLeague);
    } else {
      setPhase('hub');
      refetch();
    }
  };

  return (
    <DashboardLayout>
      <div className='min-h-full'>
        {phase === 'hub' && (
          isLoading ? (
            <div className='flex items-center justify-center h-64 text-stone-500'>
              Loading tournament…
            </div>
          ) : isError ? (
            <div className='flex items-center justify-center h-64 text-red-400'>
              Failed to load tournament data.
            </div>
          ) : (
            <HubPhase data={data} onEnter={enterTournament} />
          )
        )}

        {phase === 'round' && roundData && (
          <RoundPhase
            roundData={roundData}
            onComplete={handleRoundComplete}
          />
        )}

        {phase === 'results' && result && (
          <ResultsPhase
            result={result}
            onPlayAgain={handlePlayAgain}
            onLearn={() => navigate('/speak-quran')}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tournament;