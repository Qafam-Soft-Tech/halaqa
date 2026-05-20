// ─────────────────────────────────────────────────────────────────────────────
// ZameelVision.jsx
// Route: /zameel  —  ZAMEEL AI Coming Soon vision page
// Pure frontend — interactive learning style assessment demo
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

// ── Assessment questions ──────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'style',
    question: 'When you miss a reading session, what usually happened?',
    options: [
      { value: 'distracted', label: 'I got distracted by my phone or social media' },
      { value: 'tired',      label: 'I was too tired — poor sleep schedule' },
      { value: 'forgot',     label: 'I simply forgot — no system to remind me' },
      { value: 'busy',       label: 'Real obligations took over — work/family' },
    ],
  },
  {
    id: 'peak',
    question: 'When do you feel most spiritually focused?',
    options: [
      { value: 'fajr',    label: 'After Fajr — the early morning stillness' },
      { value: 'midday',  label: 'After Dhuhr — a midday reset' },
      { value: 'evening', label: 'After Maghrib — the golden hour' },
      { value: 'night',   label: 'After Isha — when the world is quiet' },
    ],
  },
  {
    id: 'goal',
    question: 'What is your primary Quran goal right now?',
    options: [
      { value: 'memorise', label: 'Memorise — I am working on Hifz' },
      { value: 'revise',   label: 'Revise — I need to reinforce what I have memorised' },
      { value: 'tafsir',   label: 'Understand — I want to grasp the meanings deeply' },
      { value: 'tilawah',  label: 'Recite — build a consistent daily reading habit' },
    ],
  },
];

// ── Profile generation based on answers ──────────────────────────────────────
const generateProfile = (answers) => {
  const profiles = {
    distracted_fajr_memorise:  { archetype: 'The Dawn Memoriser',      icon: '🌅', color: 'emerald' },
    distracted_fajr_revise:    { archetype: 'The Reviser at Dawn',      icon: '🌤️', color: 'emerald' },
    tired_evening_tilawah:     { archetype: 'The Evening Reciter',      icon: '🌙', color: 'blue' },
    forgot_midday_tafsir:      { archetype: 'The Scholar-in-Progress',  icon: '📚', color: 'amber' },
    busy_night_tilawah:        { archetype: 'The Night Worshipper',     icon: '🌃', color: 'purple' },
  };
  const key = `${answers.style}_${answers.peak}_${answers.goal}`;
  return profiles[key] ?? {
    archetype: 'The Seeker',
    icon: '⭐',
    color: 'emerald',
  };
};

const DISTRACTION_HOURS = [
  { label: '6am',  score: 10 },
  { label: '8am',  score: 55 },
  { label: '10am', score: 40 },
  { label: '12pm', score: 65 },
  { label: '2pm',  score: 80 },
  { label: '4pm',  score: 70 },
  { label: '6pm',  score: 30 },
  { label: '8pm',  score: 50 },
  { label: '10pm', score: 75 },
  { label: '12am', score: 35 },
];

const WEEK_HEATMAP = [
  { day: 'Mon', slots: [2, 3, 1, 4, 5, 3, 2, 4, 5, 3] },
  { day: 'Tue', slots: [1, 2, 1, 3, 4, 5, 3, 4, 5, 4] },
  { day: 'Wed', slots: [1, 1, 2, 2, 3, 4, 2, 3, 4, 3] },
  { day: 'Thu', slots: [3, 4, 2, 5, 5, 4, 3, 5, 5, 4] },
  { day: 'Fri', slots: [1, 1, 1, 1, 2, 1, 1, 2, 3, 2] },
  { day: 'Sat', slots: [2, 3, 4, 4, 5, 4, 3, 4, 5, 4] },
  { day: 'Sun', slots: [1, 2, 2, 3, 3, 2, 2, 3, 4, 3] },
];

const heatColor = (v) => {
  const map = { 1: 'bg-emerald-900/80', 2: 'bg-emerald-700/60', 3: 'bg-amber-700/60', 4: 'bg-red-700/60', 5: 'bg-red-600' };
  return map[v] ?? 'bg-stone-800';
};

const colorMap = {
  emerald: { bg: 'bg-emerald-900/40', border: 'border-emerald-700/50', text: 'text-emerald-400', badge: 'bg-emerald-800 text-emerald-200' },
  blue:    { bg: 'bg-blue-900/40',    border: 'border-blue-700/50',    text: 'text-blue-400',    badge: 'bg-blue-800 text-blue-200' },
  amber:   { bg: 'bg-amber-900/40',   border: 'border-amber-700/50',   text: 'text-amber-400',   badge: 'bg-amber-800 text-amber-200' },
  purple:  { bg: 'bg-purple-900/40',  border: 'border-purple-700/50',  text: 'text-purple-400',  badge: 'bg-purple-800 text-purple-200' },
};

// ── Assessment Flow ───────────────────────────────────────────────────────────
const Assessment = ({ onComplete }) => {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);

  const q = QUESTIONS[step];

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);
    if (step + 1 >= QUESTIONS.length) {
      onComplete(newAnswers);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
      {/* Progress */}
      <div className='px-6 pt-5 pb-3'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-stone-500 text-xs'>Question {step + 1} of {QUESTIONS.length}</span>
          <span className='text-emerald-400 text-xs font-medium'>ZAMEEL AI Assessment</span>
        </div>
        <div className='h-1 bg-stone-800 rounded-full overflow-hidden'>
          <div
            className='h-full bg-emerald-500 rounded-full transition-all duration-500'
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className='px-6 pb-6'>
        <p className='text-white font-bold text-base mb-5 leading-snug'>{q.question}</p>
        <div className='space-y-2 mb-6'>
          {q.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 ${
                selected === opt.value
                  ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300 font-medium'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleNext}
          disabled={!selected}
          className='w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm'
        >
          {step + 1 >= QUESTIONS.length ? 'See My Profile →' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

// ── Profile Result ────────────────────────────────────────────────────────────
const ProfileResult = ({ answers, onReset }) => {
  const profile = generateProfile(answers);
  const c = colorMap[profile.color] ?? colorMap.emerald;

  const goalLabels = { memorise: 'Hifz', revise: 'Revision', tafsir: 'Tafsir', tilawah: 'Tilawah' };
  const peakLabels = { fajr: 'After Fajr', midday: 'After Dhuhr', evening: 'After Maghrib', night: 'After Isha' };
  const insights = [
    `Your peak focus window is ${peakLabels[answers.peak] ?? 'the evening'} — ZAMEEL will schedule your hardest tasks then.`,
    `Your primary goal is ${goalLabels[answers.goal] ?? 'Tilawah'} — every suggestion will serve that objective.`,
    `Your main distraction pattern has been identified — ZAMEEL will send a gentle pre-emptive nudge 20 min before that window.`,
  ];

  return (
    <div className='space-y-4'>
      {/* Profile card */}
      <div className={`${c.bg} border ${c.border} rounded-2xl p-6 text-center`}>
        <div className='text-5xl mb-3'>{profile.icon}</div>
        <p className='text-stone-400 text-xs uppercase tracking-widest mb-1'>Your ZAMEEL Archetype</p>
        <h3 className={`text-2xl font-black ${c.text} mb-3`}>{profile.archetype}</h3>
        <div className='flex flex-wrap gap-2 justify-center'>
          <span className={`text-xs px-3 py-1 rounded-full ${c.badge}`}>{goalLabels[answers.goal]}</span>
          <span className={`text-xs px-3 py-1 rounded-full ${c.badge}`}>{peakLabels[answers.peak]}</span>
        </div>
      </div>

      {/* AI insights */}
      <div className='bg-stone-900 border border-stone-800 rounded-2xl p-5'>
        <p className='text-stone-400 text-xs uppercase tracking-widest mb-3'>ZAMEEL Insights — Private to You</p>
        <div className='space-y-3'>
          {insights.map((ins, i) => (
            <div key={i} className='flex items-start gap-3'>
              <span className={`${c.text} text-sm shrink-0 mt-0.5`}>◆</span>
              <p className='text-stone-300 text-sm leading-relaxed'>{ins}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className='w-full py-2.5 border border-stone-700 text-stone-400 hover:text-white rounded-xl text-sm transition-colors'
      >
        Retake Assessment
      </button>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ZameelVision = () => {
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [answers, setAnswers]               = useState(null);
  const [activeTab, setActiveTab]           = useState('assessment');

  const handleComplete = (a) => { setAnswers(a); setAssessmentDone(true); };
  const handleReset    = () => { setAssessmentDone(false); setAnswers(null); };

  const tabs = ['assessment', 'heatmap', 'progress'];

  return (
    <DashboardLayout>
      <div className='max-w-4xl mx-auto'>

        {/* ── Hero ── */}
        <div className='text-center py-10 mb-8'>
          <span className='inline-flex items-center gap-2 bg-amber-950/60 border border-amber-700/40 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-6'>
            ◈ Coming Soon
          </span>

          <div className='flex items-center justify-center gap-3 mb-3'>
            <span className='text-5xl'>✦</span>
            <h1 className='text-4xl md:text-6xl font-black text-white leading-none'>
              ZAMEEL<span className='text-emerald-400'> AI</span>
            </h1>
          </div>

          <p className='text-stone-400 text-base mb-2'>زميل — Your Personal Quran Companion</p>
          <p className='text-stone-500 text-sm max-w-lg mx-auto leading-relaxed'>
            ZAMEEL doesn't just track your habits — it understands your psychology,
            identifies your specific distractions, and builds a private growth plan
            tailored to your unique relationship with the Quran.
          </p>

          {/* Privacy badge */}
          <div className='inline-flex items-center gap-2 mt-5 bg-stone-900 border border-stone-700 rounded-full px-4 py-2'>
            <span className='text-emerald-400 text-sm'>🔒</span>
            <span className='text-stone-400 text-xs'>100% private — your data never leaves your account</span>
          </div>
        </div>

        {/* ── Feature stats ── */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-8'>
          {[
            { val: '7',     unit: 'dimensions', label: 'of learning style', color: 'text-emerald-400' },
            { val: '∞',     unit: 'insights',   label: 'continuously learned', color: 'text-amber-400' },
            { val: '100%',  unit: 'private',    label: 'never shared or sold', color: 'text-blue-400' },
            { val: 'HIPAA', unit: 'inspired',   label: 'data design principles', color: 'text-purple-400' },
          ].map(({ val, unit, label, color }) => (
            <div key={unit} className='bg-stone-900 border border-stone-800 rounded-2xl p-4 text-center'>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className='text-stone-300 text-xs font-semibold'>{unit}</p>
              <p className='text-stone-600 text-[10px]'>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Tab navigation ── */}
        <div className='flex items-center gap-1 mb-6 bg-stone-900 border border-stone-800 rounded-xl p-1.5 w-fit'>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === t ? 'bg-emerald-900/60 text-emerald-400' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              {t === 'assessment' ? '🧠 Assessment' : t === 'heatmap' ? '📊 Distraction Map' : '📈 Progress'}
            </button>
          ))}
        </div>

        {/* ── Tab: Assessment ── */}
        {activeTab === 'assessment' && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              {!assessmentDone
                ? <Assessment onComplete={handleComplete} />
                : <ProfileResult answers={answers} onReset={handleReset} />
              }
            </div>
            {/* What ZAMEEL does */}
            <div className='space-y-4'>
              <div className='bg-stone-900 border border-stone-800 rounded-2xl p-5'>
                <h3 className='text-white font-bold text-sm mb-4'>What ZAMEEL Analyses</h3>
                <div className='space-y-3'>
                  {[
                    { icon: '🧠', label: 'Learning Style', desc: 'Visual, auditory, kinesthetic, sequential — your Quran learning archetype' },
                    { icon: '📵', label: 'Distraction Windows', desc: 'Times of day when you\'re most vulnerable to drift away from the Quran' },
                    { icon: '🔄', label: 'Habit Loops', desc: 'Existing cues and routines that ZAMEEL can attach Quran habits to' },
                    { icon: '📈', label: 'Growth Trajectory', desc: 'Week-over-week improvement in consistency, depth, and engagement' },
                  ].map(({ icon, label, desc }) => (
                    <div key={label} className='flex items-start gap-3'>
                      <span className='text-xl shrink-0'>{icon}</span>
                      <div>
                        <p className='text-stone-200 text-sm font-medium'>{label}</p>
                        <p className='text-stone-500 text-xs leading-relaxed'>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='bg-stone-900 border border-stone-800 rounded-2xl p-5'>
                <h3 className='text-white font-bold text-sm mb-3'>What ZAMEEL Never Does</h3>
                <div className='space-y-2'>
                  {[
                    'Share your data with anyone — including Halaqa',
                    'Sell or monetise your personal habit data',
                    'Use your data to train AI models without consent',
                    'Shame you for missed days or lapses',
                  ].map((item) => (
                    <div key={item} className='flex items-center gap-2'>
                      <span className='text-red-400 text-xs'>✕</span>
                      <p className='text-stone-400 text-xs'>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Distraction Heatmap ── */}
        {activeTab === 'heatmap' && (
          <div className='bg-stone-900 border border-stone-800 rounded-2xl p-6'>
            <div className='flex items-center justify-between mb-2'>
              <h2 className='text-white font-bold text-sm'>Your Weekly Distraction Pattern</h2>
              <div className='flex items-center gap-3 text-xs text-stone-500'>
                <span className='flex items-center gap-1'><span className='w-3 h-3 rounded bg-emerald-900/80 inline-block' /> Low</span>
                <span className='flex items-center gap-1'><span className='w-3 h-3 rounded bg-amber-700/60 inline-block' /> Med</span>
                <span className='flex items-center gap-1'><span className='w-3 h-3 rounded bg-red-600 inline-block' /> High</span>
              </div>
            </div>
            <p className='text-stone-500 text-xs mb-6'>ZAMEEL identifies exactly when you drift — and plans around it.</p>

            {/* Hour labels */}
            <div className='flex gap-1 ml-10 mb-1'>
              {DISTRACTION_HOURS.map(({ label }) => (
                <div key={label} className='flex-1 text-center text-[9px] text-stone-600'>{label}</div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className='space-y-1'>
              {WEEK_HEATMAP.map(({ day, slots }) => (
                <div key={day} className='flex items-center gap-1'>
                  <span className='text-stone-500 text-[10px] w-8 shrink-0 text-right pr-2'>{day}</span>
                  {slots.map((v, i) => (
                    <div key={i} className={`flex-1 h-7 rounded ${heatColor(v)} transition-all`} title={`Distraction level: ${v}/5`} />
                  ))}
                </div>
              ))}
            </div>

            <div className='mt-6 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-xl'>
              <p className='text-emerald-400 text-xs font-semibold mb-1'>ZAMEEL Insight</p>
              <p className='text-stone-300 text-sm'>
                Your highest distraction window is <strong>Tuesday–Thursday 2–4pm</strong>. ZAMEEL will send a
                Surah Al-Asr recitation reminder at 1:45pm — anchoring your spiritual focus before the drift begins.
              </p>
            </div>
          </div>
        )}

        {/* ── Tab: Progress ── */}
        {activeTab === 'progress' && (
          <div className='space-y-6'>
            <div className='bg-stone-900 border border-stone-800 rounded-2xl p-6'>
              <h2 className='text-white font-bold text-sm mb-6'>30-Day Habit Improvement Report</h2>

              {/* Bar chart */}
              <div className='space-y-3'>
                {[
                  { label: 'Daily Consistency',   before: 32, after: 71, color: 'bg-emerald-500' },
                  { label: 'Average Session Length', before: 45, after: 78, color: 'bg-blue-500' },
                  { label: 'Post-Fajr Reading',   before: 20, after: 65, color: 'bg-amber-500' },
                  { label: 'Circle Participation', before: 50, after: 82, color: 'bg-purple-500' },
                  { label: 'Distraction Avoidance', before: 28, after: 67, color: 'bg-teal-500' },
                ].map(({ label, before, after, color }) => (
                  <div key={label}>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-stone-300 text-xs'>{label}</span>
                      <div className='flex items-center gap-2'>
                        <span className='text-stone-600 text-[10px]'>{before}%</span>
                        <span className='text-emerald-400 text-xs font-bold'>{after}%</span>
                        <span className='text-emerald-400 text-[10px]'>+{after - before}%</span>
                      </div>
                    </div>
                    <div className='relative h-2 bg-stone-800 rounded-full overflow-hidden'>
                      <div className='absolute h-full bg-stone-700 rounded-full' style={{ width: `${before}%` }} />
                      <div className={`absolute h-full ${color} rounded-full opacity-80`} style={{ width: `${after}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual progress report cards */}
            <div className='grid grid-cols-3 gap-3'>
              {[
                { icon: '🔥', val: '21', label: 'Day Streak', sub: 'Personal best!', color: 'text-amber-400' },
                { icon: '📖', val: '14.2', label: 'Avg min/day', sub: '↑ from 6.5', color: 'text-emerald-400' },
                { icon: '✦', val: '94%', label: 'ZAMEEL score', sub: 'Top 8% of users', color: 'text-purple-400' },
              ].map(({ icon, val, label, sub, color }) => (
                <div key={label} className='bg-stone-900 border border-stone-800 rounded-2xl p-4 text-center'>
                  <div className='text-2xl mb-1'>{icon}</div>
                  <p className={`text-xl font-black ${color}`}>{val}</p>
                  <p className='text-stone-300 text-xs font-medium'>{label}</p>
                  <p className='text-stone-600 text-[10px]'>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Judge criteria ── */}
        <div className='mt-8 bg-linear-to-br from-stone-900 to-stone-950 border border-stone-700 rounded-2xl p-6'>
          <p className='text-stone-500 text-xs uppercase tracking-widest mb-4'>Impact on Quran Engagement</p>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {[
              { label: 'Innovation & Creativity', desc: 'First AI companion built specifically for Quran habit psychology — no equivalent exists' },
              { label: 'Technical Execution', desc: 'ML profiling + habit science + QF API data fused into one private user model' },
              { label: 'Product Quality & UX', desc: 'Trauma-informed design — ZAMEEL never shames, always encourages with evidence' },
              { label: 'Impact on Engagement', desc: 'Addresses the root cause of non-engagement: the user\'s own distraction patterns' },
            ].map(({ label, desc }) => (
              <div key={label} className='flex items-start gap-3'>
                <span className='text-emerald-400 text-sm mt-0.5 shrink-0'>◆</span>
                <div>
                  <p className='text-white text-sm font-semibold'>{label}</p>
                  <p className='text-stone-500 text-xs'>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ZameelVision;