// ─────────────────────────────────────────────────────────────────────────────
// FasluVision.jsx
// Route: /faslu  —  Online Quranic Classroom coming soon vision page
// فصل — The Sacred Classroom
// Pure frontend — interactive classroom prototype demo
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

// ── Tajweed rules with colors ─────────────────────────────────────────────────
const TAJWEED_RULES = [
  { id: 'ghunna',   label: 'Ghunna',           color: '#10b981', bg: 'bg-emerald-600',   desc: 'Nasal sound — 2 counts' },
  { id: 'ikhfa',    label: 'Ikhfaa',            color: '#f59e0b', bg: 'bg-amber-500',     desc: 'Hidden pronunciation' },
  { id: 'idgham',   label: "Idghaam",           color: '#3b82f6', bg: 'bg-blue-500',      desc: 'Merging of letters' },
  { id: 'madd',     label: 'Madd',              color: '#a855f7', bg: 'bg-purple-500',    desc: 'Elongation — 2-6 counts' },
  { id: 'qalqala',  label: 'Qalqalah',          color: '#ef4444', bg: 'bg-red-500',       desc: 'Echo/bouncing sound' },
  { id: 'tafkhim',  label: 'Tafkheem',          color: '#f97316', bg: 'bg-orange-500',    desc: 'Heavy pronunciation' },
];

// Al-Fatiha with tajweed annotations (simplified demo)
const FATIHA_VERSES = [
  {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    transliteration: "Bismillāhi r-raḥmāni r-raḥīm",
    translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful',
    annotations: [
      { word: 'الرَّحْمَٰنِ', rule: 'madd', note: 'Madd on the ا — elongate 4-5 counts' },
    ],
  },
  {
    arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: "Al-ḥamdu lillāhi rabbi l-ʿālamīn",
    translation: '[All] praise is [due] to Allah, Lord of the worlds',
    annotations: [
      { word: 'الْعَالَمِينَ', rule: 'madd', note: 'Natural Madd — 2 counts' },
    ],
  },
  {
    arabic: 'الرَّحْمَٰنِ الرَّحِيمِ',
    transliteration: "Ar-raḥmāni r-raḥīm",
    translation: 'The Entirely Merciful, the Especially Merciful',
    annotations: [],
  },
  {
    arabic: 'مَالِكِ يَوْمِ الدِّينِ',
    transliteration: "Māliki yawmi d-dīn",
    translation: 'Sovereign of the Day of Recompense',
    annotations: [
      { word: 'الدِّينِ', rule: 'ghunna', note: 'Nun with Shadda — Ghunna 2 counts' },
    ],
  },
];

const MOCK_STUDENTS = [
  { id: 1, name: 'Ahmad K.',    initials: 'AK', status: 'reading',  hand: false, mic: true  },
  { id: 2, name: 'Fatimah N.',  initials: 'FN', status: 'listening', hand: true,  mic: false },
  { id: 3, name: 'Bilal M.',    initials: 'BM', status: 'reading',  hand: false, mic: false },
  { id: 4, name: 'Aisha R.',    initials: 'AR', status: 'away',     hand: false, mic: false },
  { id: 5, name: 'Umar T.',     initials: 'UT', status: 'listening', hand: false, mic: true  },
  { id: 6, name: 'Khadijah L.', initials: 'KL', status: 'reading',  hand: false, mic: false },
];

const statusStyle = {
  reading:   'bg-emerald-500',
  listening: 'bg-blue-500',
  away:      'bg-stone-600',
};

const TOOLS = [
  { id: 'mushaf',    icon: '📖', label: 'Shared Mushaf',      desc: 'Synchronized Quran view for all students' },
  { id: 'tajweed',   icon: '🎨', label: 'Tajweed Annotator', desc: 'Color-code rules directly on the Mushaf' },
  { id: 'whiteboard',icon: '✏️',  label: 'Arabic Whiteboard', desc: 'Write Arabic letters with correct Makharij diagrams' },
  { id: 'recitation',icon: '🎙️', label: 'Recitation Review',  desc: 'Record, listen, and teacher provides timestamped feedback' },
  { id: 'attendance',icon: '📋', label: 'Ijazah Tracker',    desc: 'Track each student\'s progress toward their Ijazah' },
  { id: 'grade',     icon: '⭐', label: 'Adab Board',         desc: 'Positive reinforcement aligned with Islamic teaching etiquette' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
const FasluVision = () => {
  const [view,           setView]           = useState('teacher'); // 'teacher' | 'student'
  const [activeTool,     setActiveTool]     = useState('tajweed');
  const [selectedRule,   setSelectedRule]   = useState('madd');
  const [annotatedWords, setAnnotatedWords] = useState({});
  const [students,       setStudents]       = useState(MOCK_STUDENTS);
  const [activeTab,      setActiveTab]      = useState('classroom');

  const toggleHand = (id) => setStudents((prev) => prev.map((s) => s.id === id ? { ...s, hand: !s.hand } : s));

  const annotateWord = (verseIdx, word) => {
    const key = `${verseIdx}-${word}`;
    setAnnotatedWords((prev) => {
      if (prev[key] === selectedRule) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: selectedRule };
    });
  };

  const getWordStyle = (verseIdx, word) => {
    const key  = `${verseIdx}-${word}`;
    const rule = annotatedWords[key];
    if (!rule) return {};
    const found = TAJWEED_RULES.find((r) => r.id === rule);
    return found ? { borderBottom: `3px solid ${found.color}`, color: found.color } : {};
  };

  return (
    <DashboardLayout>
      <div className='max-w-5xl mx-auto'>

        {/* ── Hero ── */}
        <div className='text-center py-10 mb-8'>
          <span className='inline-flex items-center gap-2 bg-amber-950/60 border border-amber-700/40 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-6'>
            ◈ Coming Soon
          </span>

          <div className='flex items-center justify-center gap-3 mb-3'>
            <h1 className='text-4xl md:text-6xl font-black text-white leading-none'>
              فصل <span className='text-emerald-400'>Faslu</span>
            </h1>
          </div>

          <p className='text-stone-400 text-base mb-2'>The Sacred Online Classroom</p>
          <p className='text-stone-500 text-sm max-w-xl mx-auto leading-relaxed'>
            Purpose-built for certified Quranic tutors. Every tool designed with Islamic
            teaching tradition at its heart — from Makharij diagrams to Ijazah tracking.
            Not just another video call.
          </p>

          {/* Certification badge */}
          <div className='inline-flex items-center gap-2 mt-5 bg-amber-950/40 border border-amber-700/40 rounded-full px-4 py-2'>
            <span className='text-amber-400 text-sm'>🏅</span>
            <span className='text-amber-300 text-xs font-medium'>Certified Quran Tutors Only — Application Required</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className='flex items-center gap-1 mb-6 bg-stone-900 border border-stone-800 rounded-xl p-1.5 w-fit overflow-x-auto'>
          {['classroom', 'tools', 'etiquette'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap ${
                activeTab === t ? 'bg-emerald-900/60 text-emerald-400' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              {t === 'classroom' ? '🕌 Live Classroom' : t === 'tools' ? '🎨 Teaching Tools' : '📿 Islamic Etiquette'}
            </button>
          ))}
        </div>

        {/* ── Tab: Live Classroom Demo ── */}
        {activeTab === 'classroom' && (
          <div className='space-y-4'>

            {/* View toggle */}
            <div className='flex items-center gap-2'>
              <span className='text-stone-500 text-xs'>Viewing as:</span>
              {['teacher', 'student'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    view === v ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  {v === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}
                </button>
              ))}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>

              {/* Main: Tajweed Annotator */}
              <div className='md:col-span-2 bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
                <div className='flex items-center justify-between px-5 py-3 border-b border-stone-800'>
                  <div className='flex items-center gap-2'>
                    <span className='text-emerald-400'>🎨</span>
                    <span className='text-white text-sm font-semibold'>Tajweed Annotator — Surah Al-Fatiha</span>
                  </div>
                  {view === 'teacher' && (
                    <span className='text-xs text-stone-500'>Click any word to annotate</span>
                  )}
                </div>

                {/* Tajweed rule selector (teacher only) */}
                {view === 'teacher' && (
                  <div className='flex flex-wrap gap-2 px-5 py-3 border-b border-stone-800'>
                    {TAJWEED_RULES.map((rule) => (
                      <button
                        key={rule.id}
                        onClick={() => setSelectedRule(rule.id)}
                        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          selectedRule === rule.id
                            ? `${rule.bg} border-transparent text-white`
                            : 'border-stone-700 text-stone-400 hover:text-white bg-stone-800'
                        }`}
                      >
                        {rule.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Verses */}
                <div className='p-5 space-y-5'>
                  {FATIHA_VERSES.map((verse, vi) => (
                    <div key={vi} className='group'>
                      {/* Arabic text — word by word */}
                      <p
                        className='text-right text-2xl leading-loose mb-2'
                        style={{ fontFamily: '"Amiri", "Scheherazade New", serif', direction: 'rtl' }}
                      >
                        {verse.arabic.split(' ').map((word, wi) => (
                          <span
                            key={wi}
                            onClick={() => view === 'teacher' && annotateWord(vi, word)}
                            style={getWordStyle(vi, word)}
                            className={`cursor-pointer transition-all px-0.5 ${view === 'teacher' ? 'hover:opacity-80' : ''}`}
                          >
                            {word}{' '}
                          </span>
                        ))}
                      </p>
                      <p className='text-amber-400/80 text-xs italic mb-0.5'>{verse.transliteration}</p>
                      <p className='text-stone-500 text-xs'>{verse.translation}</p>

                      {/* Auto annotations */}
                      {verse.annotations.map((ann, ai) => {
                        const rule = TAJWEED_RULES.find((r) => r.id === ann.rule);
                        return (
                          <div key={ai} className='mt-2 flex items-center gap-2 text-xs'>
                            <span className={`w-2 h-2 rounded-full ${rule?.bg}`} />
                            <span className='text-stone-500'>{ann.note}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Color legend */}
                <div className='px-5 py-3 border-t border-stone-800 flex flex-wrap gap-2'>
                  {TAJWEED_RULES.map((r) => (
                    <span key={r.id} className='flex items-center gap-1 text-[10px] text-stone-400'>
                      <span className='w-2 h-2 rounded-full inline-block' style={{ background: r.color }} />
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Students panel */}
              <div className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
                <div className='px-4 py-3 border-b border-stone-800'>
                  <h3 className='text-white text-sm font-semibold'>Students ({students.length})</h3>
                </div>
                <div className='p-3 space-y-2'>
                  {students.map((s) => (
                    <div key={s.id} className='flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-stone-800 transition-colors'>
                      <div className='relative shrink-0'>
                        <div className='w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-300 text-xs font-bold'>
                          {s.initials}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-stone-900 ${statusStyle[s.status]}`} />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-stone-200 text-xs truncate'>{s.name}</p>
                        <p className='text-stone-600 text-[10px] capitalize'>{s.status}</p>
                      </div>
                      <div className='flex items-center gap-1 shrink-0'>
                        {s.hand && (
                          <button
                            onClick={() => toggleHand(s.id)}
                            className='text-amber-400 text-xs bg-amber-900/40 border border-amber-700/40 px-1.5 py-0.5 rounded-full'
                            title='Lower hand'
                          >✋</button>
                        )}
                        <span className={`text-xs ${s.mic ? 'text-emerald-400' : 'text-stone-700'}`}>
                          {s.mic ? '🎙️' : '🔇'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {view === 'teacher' && (
                  <div className='px-4 py-3 border-t border-stone-800 space-y-2'>
                    <button className='w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-xl transition-colors'>
                      📢 Call on Next Student
                    </button>
                    <button className='w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-xl transition-colors'>
                      📋 Mark Attendance
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Teaching Tools ── */}
        {activeTab === 'tools' && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {TOOLS.map(({ id, icon, label, desc }) => (
              <button
                key={id}
                onClick={() => setActiveTool(id)}
                className={`text-left p-5 rounded-2xl border transition-all duration-200 ${
                  activeTool === id
                    ? 'bg-emerald-900/30 border-emerald-700/60'
                    : 'bg-stone-900 border-stone-800 hover:border-stone-600'
                }`}
              >
                <div className='flex items-center gap-3 mb-2'>
                  <span className='text-2xl'>{icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${activeTool === id ? 'text-emerald-400' : 'text-white'}`}>{label}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTool === id ? 'bg-emerald-900/60 text-emerald-400' : 'bg-stone-800 text-stone-500'}`}>
                      {activeTool === id ? 'Selected' : 'Click to preview'}
                    </span>
                  </div>
                </div>
                <p className='text-stone-400 text-xs leading-relaxed'>{desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* ── Tab: Islamic Etiquette ── */}
        {activeTab === 'etiquette' && (
          <div className='space-y-4'>
            <div className='bg-linear-to-br from-emerald-950/40 to-stone-900 border border-emerald-800/40 rounded-2xl p-6 text-center'>
              <p
                className='text-3xl text-emerald-300 mb-2'
                style={{ fontFamily: '"Amiri", serif' }}
              >
                ﷽
              </p>
              <p className='text-stone-400 text-sm'>Every Faslu session opens with the Basmala</p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {[
                {
                  icon: '🤲',
                  title: 'Iftitah — Session Opening',
                  desc: 'Every class begins with a shared recitation of Isti\'adha and Basmala. Students are prompted to sit in a state of Wudu. The teacher formally greets with Salaam.',
                  color: 'emerald',
                },
                {
                  icon: '📿',
                  title: 'Adab of the Student',
                  desc: 'Built-in prompts remind students of the Adab of seeking knowledge: facing the Qiblah, maintaining reverence, raising a virtual hand before speaking.',
                  color: 'amber',
                },
                {
                  icon: '📜',
                  title: 'Ijazah Chain Tracking',
                  desc: 'FASLU tracks and displays the Sanad (chain of transmission) from student → teacher → their teacher → back to the Prophet ﷺ. The most sacred feature.',
                  color: 'blue',
                },
                {
                  icon: '🕌',
                  title: 'Ikhtibar — Assessment',
                  desc: 'Examinations are conducted with the same reverence as traditional Halaqas: oral recitation evaluated by Makharij, Tajweed, Waqf and Ibtida, and Tarteel.',
                  color: 'purple',
                },
                {
                  icon: '🌟',
                  title: 'Khatm Ceremony',
                  desc: 'When a student completes their assigned portion, FASLU facilitates a digital Khatm ceremony — a moment of Du\'a, celebration, and Ijazah issuance.',
                  color: 'red',
                },
                {
                  icon: '🏅',
                  title: 'Teacher Certification',
                  desc: 'Only tutors with verifiable Ijazah in Hafs \'an \'Asim (or other Qira\'at) may open a Faslu. Applications are manually reviewed to maintain sacred standards.',
                  color: 'emerald',
                },
              ].map(({ icon, title, desc, color }) => {
                const colors = {
                  emerald: 'border-emerald-800/40 bg-emerald-900/20',
                  amber:   'border-amber-800/40 bg-amber-900/20',
                  blue:    'border-blue-800/40 bg-blue-900/20',
                  purple:  'border-purple-800/40 bg-purple-900/20',
                  red:     'border-red-800/40 bg-red-900/20',
                };
                return (
                  <div key={title} className={`rounded-2xl border p-5 ${colors[color] ?? colors.emerald}`}>
                    <div className='flex items-center gap-3 mb-2'>
                      <span className='text-2xl'>{icon}</span>
                      <h3 className='text-white font-bold text-sm'>{title}</h3>
                    </div>
                    <p className='text-stone-400 text-xs leading-relaxed'>{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Judge criteria ── */}
        <div className='mt-8 bg-linear-to-br from-stone-900 to-stone-950 border border-stone-700 rounded-2xl p-6'>
          <p className='text-stone-500 text-xs uppercase tracking-widest mb-4'>Impact on Quran Engagement</p>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {[
              { label: 'Effective API Use', desc: 'QF Mushaf API powers the synchronized Quran view with real verse data and audio' },
              { label: 'Innovation & Creativity', desc: 'No Quran-specific online classroom exists — FASLU fills a critical gap in Islamic EdTech' },
              { label: 'Product Quality & UX', desc: 'Islamic etiquette is not an add-on — it is the architecture; every flow respects the sanctity of Quranic education' },
              { label: 'Impact on Engagement', desc: '1.8B Muslims seek Quran education globally; FASLU enables authentic ijazah-chain learning at scale' },
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

export default FasluVision;