// ─────────────────────────────────────────────────────────────────────────────
// Settings.jsx
// User preferences and account management.
//
// Sections:
//   1. Profile     — display name, email, QF account connection status
//   2. Reading     — translation, tafsir, and reciter IDs (persisted via
//                    usePreferences → localStorage, consumed by useSessionData)
//   3. Notifications — toggles stored in same preferences object
//   4. Account     — sign-out (re-uses the existing logout from AuthContext)
//
// No backend changes required — preferences are stored in localStorage and
// read by useSessionData via getStoredPreferences().
// ─────────────────────────────────────────────────────────────────────────────

import { motion }            from 'framer-motion';
import DashboardLayout       from '@/components/DashboardLayout';
import { useAuth }           from '@/context/AuthContext';
import { usePreferences }    from '@/hooks/usePreferences';

// ── Available QF content options ──────────────────────────────────────────────
// IDs sourced from the Quran Foundation content API documentation.
// Add more as the prelive environment makes them available.
const TRANSLATIONS = [
  { id: 131, label: 'Sahih International'   },
  { id: 20,  label: 'Pickthall'             },
  { id: 85,  label: 'Dr Mustafa Khattab'    },
];

const TAFSIRS = [
  { id: 169, label: 'Tafsir Ibn Kathir'     },
  { id: 168, label: 'Al-Jalalayn'           },
  { id: 164, label: 'Tafsir al-Muyassar'   },
];

const RECITERS = [
  { id: 7,   label: 'Mishary Rashid Alafasy' },
  { id: 1,   label: 'AbdulBaset AbdulSamad'  },
  { id: 9,   label: 'Hani ar-Rifai'          },
];

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, children, delay = 0 }) => (
  <motion.div
    className='mb-7'
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0  }}
    transition={{ delay, duration: 0.3 }}
  >
    <p className='text-stone-500 text-xs font-semibold uppercase tracking-widest mb-3'>
      {title}
    </p>
    <div className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
      {children}
    </div>
  </motion.div>
);

// ── Row: label + right slot ───────────────────────────────────────────────────
const Row = ({ label, sublabel, right }) => (
  <div className='flex items-center justify-between px-5 py-4 border-b border-stone-800/70 last:border-0'>
    <div>
      <p className='text-white text-sm'>{label}</p>
      {sublabel && <p className='text-stone-500 text-xs mt-0.5'>{sublabel}</p>}
    </div>
    <div className='shrink-0 ml-4'>{right}</div>
  </div>
);

// ── Select drop-down (styled to match the dark theme) ────────────────────────
const ThemedSelect = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    className='bg-stone-800 border border-stone-700 focus:border-emerald-500 text-white text-xs rounded-lg px-3 py-1.5 outline-none transition-colors cursor-pointer'
  >
    {options.map((o) => (
      <option key={o.id} value={o.id}>{o.label}</option>
    ))}
  </select>
);

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <button
    role='switch'
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${
      checked ? 'bg-emerald-600' : 'bg-stone-700'
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4.5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

// ── Settings page ─────────────────────────────────────────────────────────────
const Settings = () => {
  const { user, logout }   = useAuth();
  const [prefs, setPrefs]  = usePreferences();

  const initials = user?.username
    ? user.username.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <DashboardLayout>

      {/* ── Page title ────────────────────────────────────────────── */}
      <motion.div
        className='mb-8'
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.3 }}
      >
        <h1 className='text-2xl font-bold text-white'>Settings</h1>
        <p className='text-stone-500 text-sm mt-1'>
          Manage your profile, reading preferences, and account
        </p>
      </motion.div>

      {/* ── 1. Profile ────────────────────────────────────────────── */}
      <Section title='Profile' delay={0.05}>

        {/* Avatar + name */}
        <div className='flex items-center gap-4 px-5 py-4 border-b border-stone-800/70'>
          <div className='w-12 h-12 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-300 text-base font-bold shrink-0'>
            {initials}
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-white font-semibold text-sm truncate'>
              {user?.username || 'User'}
            </p>
            <p className='text-stone-500 text-xs truncate mt-0.5'>
              {user?.email || '—'}
            </p>
          </div>
        </div>

        {/* QF account link status */}
        <Row
          label='Quran Foundation account'
          sublabel={user?.email ? `Linked · ${user.email}` : 'Not linked'}
          right={
            <span className='text-xs px-2.5 py-1 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-800/40 font-medium'>
              ✓ Connected
            </span>
          }
        />
      </Section>

      {/* ── 2. Reading preferences ────────────────────────────────── */}
      <Section title='Reading preferences' delay={0.1}>
        <Row
          label='Translation'
          sublabel='Shown below each verse in Tafsir sessions'
          right={
            <ThemedSelect
              value={prefs.translationId}
              onChange={(id) => setPrefs({ translationId: id })}
              options={TRANSLATIONS}
            />
          }
        />
        <Row
          label='Tafsir'
          sublabel='Commentary displayed on "Show Tafsir"'
          right={
            <ThemedSelect
              value={prefs.tafsirId}
              onChange={(id) => setPrefs({ tafsirId: id })}
              options={TAFSIRS}
            />
          }
        />
        <Row
          label='Reciter'
          sublabel='Audio recitation played in sessions'
          right={
            <ThemedSelect
              value={prefs.reciterId}
              onChange={(id) => setPrefs({ reciterId: id })}
              options={RECITERS}
            />
          }
        />

        {/* Confirmation pill shown after any preference change */}
        <div className='px-5 pb-4 pt-1'>
          <p className='text-stone-600 text-xs'>
            Changes apply immediately to all new Tafsir sessions.
          </p>
        </div>
      </Section>

      {/* ── 3. Notifications ──────────────────────────────────────── */}
      <Section title='Notifications' delay={0.15}>
        <Row
          label='Session reminders'
          sublabel='Notified when your circle starts a session'
          right={
            <Toggle
              checked={prefs.sessionReminders}
              onChange={(val) => setPrefs({ sessionReminders: val })}
            />
          }
        />
        <Row
          label='Reflection activity'
          sublabel='When members post in your circles'
          right={
            <Toggle
              checked={prefs.reflectionActivity}
              onChange={(val) => setPrefs({ reflectionActivity: val })}
            />
          }
        />
      </Section>

      {/* ── 4. Account ────────────────────────────────────────────── */}
      <Section title='Account' delay={0.2}>
        <div className='px-5 py-4'>
          <button
            onClick={logout}
            className='w-full flex items-center justify-between text-red-400 hover:text-red-300 text-sm py-1 transition-colors group'
          >
            <span>Sign out</span>
            <span className='text-base group-hover:translate-x-0.5 transition-transform'>→</span>
          </button>
        </div>
      </Section>

    </DashboardLayout>
  );
};

export default Settings;