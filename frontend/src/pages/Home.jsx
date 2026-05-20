import { useAuth } from '@/context/AuthContext';

const features = [
  {
    icon: '📖',
    title: 'Group Khatm',
    desc: 'Divide the Quran intelligently among your circle. Each member gets a proportional share based on their reading activity — completing the full Khatm together.',
  },
  {
    icon: '🕌',
    title: 'Live Sessions',
    desc: 'Read together in real time. Share verse annotations, reflections, and notes that appear live for everyone in your session room.',
  },
  {
    icon: '💬',
    title: 'Reflection Board',
    desc: 'Leave tafsir notes and personal reflections on any verse. Build a living commentary your circle returns to again and again.',
  },
  {
    icon: '🗣️',
    title: "Speak Qur'an",
    desc: "Master Quranic vocabulary word by word. Pronunciation drills, audio from real reciters, and spaced repetition — so every word you read, you truly understand.",
  },
  {
    icon: '🏆',
    title: 'Tournament',
    desc: 'Compete in coin-staked vocabulary leagues — Bronze to Diamond. Earn coins by learning, win more by advancing leagues. Knowledge has never had higher stakes.',
  },
];

const Home = () => {
  const { login } = useAuth();

  return (
    <div className='min-h-screen bg-stone-950 text-stone-100 font-sans overflow-x-hidden'>

      {/* ── Ambient background ─────────────────────────────────────── */}
      <div className='fixed inset-0 pointer-events-none'>
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-225 h-125 bg-emerald-900 opacity-20 rounded-full blur-3xl' />
        <div className='absolute bottom-0 right-0 w-100 h-100 bg-emerald-800 opacity-10 rounded-full blur-3xl' />
        {/* Subtle geometric pattern */}
        <svg className='absolute inset-0 w-full h-full opacity-5' xmlns='http://www.w3.org/2000/svg'>
          <defs>
            <pattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'>
              <path d='M 60 0 L 0 0 0 60' fill='none' stroke='#6ee7b7' strokeWidth='0.5'/>
            </pattern>
          </defs>
          <rect width='100%' height='100%' fill='url(#grid)'/>
        </svg>
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className='relative z-10 flex items-center justify-between px-6 md:px-16 py-6'>
        <span className='text-emerald-400 font-bold tracking-[0.2em] text-sm uppercase'>
          ◆ Halaqa
        </span>
        <button
          onClick={login}
          className='text-sm text-emerald-400 border border-emerald-800 hover:border-emerald-500 hover:bg-emerald-950 transition-all px-4 py-2 rounded-lg'
        >
          Sign in
        </button>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className='relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-28 md:pt-32 md:pb-40'>

        {/* Arabic motif */}
        <div className='mb-6 text-4xl opacity-30 tracking-widest select-none'>
          ﷽
        </div>

        <h1 className='text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-4'>
          Halaqa
        </h1>

        <p className='text-emerald-400 text-lg md:text-xl font-light tracking-[0.15em] uppercase mb-8'>
          The circle that never breaks
        </p>

        <p className='max-w-xl text-stone-400 text-base md:text-lg leading-relaxed mb-12'>
          Halaqa brings your family, friends, or community together around the Quran.
          Plan group Khatms, hold live reading sessions, and share reflections —
          all powered by your Quran Foundation account.
        </p>

        <button
          onClick={login}
          className='group relative inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-900/50 hover:shadow-emerald-700/50 hover:-translate-y-0.5'
        >
          <svg className='w-5 h-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/>
          </svg>
          Sign in with Quran Foundation
          <span className='absolute inset-0 rounded-xl ring-2 ring-emerald-400 opacity-0 group-hover:opacity-30 transition-opacity'/>
        </button>

        <p className='mt-4 text-stone-600 text-xs'>
          Powered by the Quran Foundation API
        </p>
      </section>

      {/* ── Feature cards ──────────────────────────────────────────── */}
      <section className='relative z-10 px-6 md:px-16 pb-28'>
        <p className='text-center text-stone-500 text-xs uppercase tracking-[0.2em] mb-10'>
          Everything your circle needs
        </p>

        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto'>
          {features.map(({ icon, title, desc }) => (
            <div
              key={title}
              className='group bg-stone-900 border border-stone-800 hover:border-emerald-800 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950'
            >
              <div className='text-3xl mb-4'>{icon}</div>
              <h3 className='text-white font-bold text-lg mb-3 group-hover:text-emerald-400 transition-colors'>
                {title}
              </h3>
              <p className='text-stone-400 text-sm leading-relaxed'>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Coming Soon features ───────────────────────────────────── */}
      <section className='relative z-10 px-6 md:px-16 pb-28'>
        <div className='max-w-6xl mx-auto'>

          {/* Divider */}
          <div className='flex items-center gap-4 mb-10'>
            <div className='flex-1 h-px bg-stone-800' />
            <div className='flex items-center gap-2'>
              <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' />
              <p className='text-amber-500 text-xs font-bold uppercase tracking-[0.2em]'>
                Coming Soon — In Development
              </p>
              <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse' />
            </div>
            <div className='flex-1 h-px bg-stone-800' />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>

            {/* Notifications */}
            <div className='group relative bg-stone-900/60 border border-stone-800 hover:border-amber-800/60 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden'>
              <div className='absolute top-3 right-3'>
                <span className='text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide'>Soon</span>
              </div>
              <div className='text-3xl mb-4'>🔔</div>
              <h3 className='text-white font-bold text-lg mb-3 group-hover:text-amber-400 transition-colors'>
                Smart Notifications
              </h3>
              <p className='text-stone-500 text-sm leading-relaxed'>
                Prayer-time-synced reminders across push, email, and WhatsApp. The right nudge,
                at the right moment — so your circle never misses a session.
              </p>
            </div>

            {/* ZAMEEL AI */}
            <div className='group relative bg-stone-900/60 border border-stone-800 hover:border-amber-800/60 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden'>
              <div className='absolute top-3 right-3'>
                <span className='text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide'>Soon</span>
              </div>
              <div className='text-3xl mb-4'>✦</div>
              <h3 className='text-white font-bold text-lg mb-3 group-hover:text-amber-400 transition-colors'>
                ZAMEEL AI — زميل
              </h3>
              <p className='text-stone-500 text-sm leading-relaxed'>
                Your private AI companion. Learns your psychology, identifies your daily distractions,
                and builds a personalised habit plan — completely private to your account.
              </p>
            </div>

            {/* Faslu */}
            <div className='group relative bg-stone-900/60 border border-stone-800 hover:border-amber-800/60 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden'>
              <div className='absolute top-3 right-3'>
                <span className='text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide'>Soon</span>
              </div>
              <div className='text-3xl mb-4'>🕌</div>
              <h3 className='text-white font-bold text-lg mb-3 group-hover:text-amber-400 transition-colors'>
                فصل Faslu — Sacred Classroom
              </h3>
              <p className='text-stone-500 text-sm leading-relaxed'>
                A full online classroom for certified Quranic tutors. Tajweed annotator, Ijazah chain
                tracking, and Islamic teaching etiquette built into every interaction.
              </p>
            </div>

          </div>

          {/* Vision statement */}
          <div className='mt-10 text-center'>
            <p className='text-stone-600 text-xs max-w-lg mx-auto leading-relaxed'>
              Halaqa is more than an app — it is a platform for the global Muslim community
              to learn, revise, and grow together around the Quran. These features represent
              the next chapter of that vision.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className='relative z-10 border-t border-stone-900 py-8 text-center text-stone-600 text-xs'>
        Halaqa — Group Quran Accountability Circles
      </footer>
    </div>
  );
};

export default Home;