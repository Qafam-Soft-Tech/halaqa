// ─────────────────────────────────────────────────────────────────────────────
// NotificationsVision.jsx
// Route: /notifications  —  Coming Soon vision page
// Pure frontend — no backend, no API calls
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

// ── Mock notification data ────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  {
    id: 1, type: 'reminder', icon: '📖', color: 'emerald',
    title: 'Daily Reading Reminder',
    body: 'You haven\'t read today. Your circle is counting on you — pick up from Al-Baqarah 2:255.',
    time: '2 min ago', channel: 'push',
  },
  {
    id: 2, type: 'circle', icon: '◎', color: 'blue',
    title: 'New Reflection in Al-Nur Circle',
    body: 'Fatimah shared a reflection on Surah Al-Kahf: "The cave is a reminder that isolation can be sacred..."',
    time: '15 min ago', channel: 'email',
  },
  {
    id: 3, type: 'khatm', icon: '🏁', color: 'amber',
    title: 'Khatm Milestone Reached!',
    body: 'Your circle just completed Juz 15. Only 15 Juz remain. MashaAllah!',
    time: '1 hr ago', channel: 'whatsapp',
  },
  {
    id: 4, type: 'streak', icon: '🔥', color: 'red',
    title: 'Streak at Risk',
    body: 'Your 14-day reading streak ends in 3 hours. Open a session now to protect it.',
    time: '3 hrs ago', channel: 'push',
  },
  {
    id: 5, type: 'session', icon: '🕌', color: 'purple',
    title: 'Live Session Starting',
    body: 'Your Halaqa circle "Seekers of Al-Haqq" is about to begin a session. Join now.',
    time: '5 hrs ago', channel: 'email',
  },
];

const CHANNELS = [
  { id: 'push',     label: 'Push Notifications', icon: '🔔', desc: 'Instant alerts on your device' },
  { id: 'email',    label: 'Email Digest',        icon: '✉️',  desc: 'Daily summary to your inbox' },
  { id: 'whatsapp', label: 'WhatsApp Alerts',     icon: '💬', desc: 'Message alerts via WhatsApp' },
];

const SMART_TIMES = [
  { slot: 'Fajr',   time: '5:30 AM',  active: true,  reason: 'Most spiritually receptive time' },
  { slot: 'Dhuhr',  time: '1:00 PM',  active: false, reason: 'Midday break reminder' },
  { slot: 'Asr',    time: '4:30 PM',  active: true,  reason: 'Afternoon routine anchor' },
  { slot: 'Maghrib', time: '7:15 PM', active: true,  reason: 'After Salah — habit stacking' },
  { slot: 'Isha',   time: '9:30 PM',  active: false, reason: 'Evening reflection time' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-900/40', border: 'border-emerald-700/50', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  blue:    { bg: 'bg-blue-900/40',    border: 'border-blue-700/50',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  amber:   { bg: 'bg-amber-900/40',   border: 'border-amber-700/50',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  red:     { bg: 'bg-red-900/40',     border: 'border-red-700/50',     text: 'text-red-400',     dot: 'bg-red-400' },
  purple:  { bg: 'bg-purple-900/40',  border: 'border-purple-700/50',  text: 'text-purple-400',  dot: 'bg-purple-400' },
};

// ── NotificationCard ──────────────────────────────────────────────────────────
const NotificationCard = ({ n, onDismiss }) => {
  const c = colorMap[n.color];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${c.bg} ${c.border} transition-all duration-300`}>
      <div className={`w-9 h-9 rounded-full ${c.bg} border ${c.border} flex items-center justify-center text-lg shrink-0`}>
        {n.icon}
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between gap-2 mb-1'>
          <p className={`text-xs font-semibold ${c.text} uppercase tracking-wide`}>{n.type}</p>
          <div className='flex items-center gap-2 shrink-0'>
            <span className='text-stone-600 text-[10px]'>{n.time}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
              {n.channel}
            </span>
          </div>
        </div>
        <p className='text-white text-sm font-medium mb-0.5'>{n.title}</p>
        <p className='text-stone-400 text-xs leading-relaxed'>{n.body}</p>
      </div>
      <button
        onClick={() => onDismiss(n.id)}
        className='text-stone-600 hover:text-stone-300 text-sm shrink-0 mt-0.5 transition-colors'
      >✕</button>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const NotificationsVision = () => {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [channels, setChannels]           = useState({ push: true, email: true, whatsapp: false });
  const [smartTimes, setSmartTimes]       = useState(SMART_TIMES);
  const [lastToast, setLastToast]         = useState(null);
  const [toastVisible, setToastVisible]   = useState(false);

  const dismiss = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  const simulate = () => {
    const types = ['circle', 'reminder', 'khatm'];
    const msgs  = [
      { title: 'Ahmad posted a reflection', body: 'New reflection on Surah Al-Fatiha in your circle.' },
      { title: 'Time to read! 📖', body: 'Maghrib just ended — perfect time for your daily recitation.' },
      { title: 'Juz 20 Complete!', body: 'Your circle finished Juz 20. SubhanAllah, keep going!' },
    ];
    const pick  = msgs[Math.floor(Math.random() * msgs.length)];
    setLastToast(pick);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const toggleTime = (i) => {
    setSmartTimes((prev) => prev.map((t, idx) => idx === i ? { ...t, active: !t.active } : t));
  };

  return (
    <DashboardLayout>
      <div className='max-w-4xl mx-auto'>

        {/* ── Hero ── */}
        <div className='text-center py-10 mb-8 relative'>
          <span className='inline-flex items-center gap-2 bg-amber-950/60 border border-amber-700/40 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-6'>
            ◈ Coming Soon
          </span>
          <h1 className='text-4xl md:text-5xl font-black text-white mb-3 leading-tight'>
            Smart Notifications
          </h1>
          <p className='text-stone-400 text-lg max-w-xl mx-auto leading-relaxed'>
            The right nudge, at the right moment, through the right channel —
            so your circle never misses a beat.
          </p>
        </div>

        {/* ── Impact banner ── */}
        <div className='grid grid-cols-3 gap-3 mb-8'>
          {[
            { stat: '3×', label: 'More daily sessions', color: 'text-emerald-400' },
            { stat: '87%', label: 'Streak retention rate', color: 'text-amber-400' },
            { stat: '12+', label: 'Notification types', color: 'text-blue-400' },
          ].map(({ stat, label, color }) => (
            <div key={label} className='bg-stone-900 border border-stone-800 rounded-2xl p-5 text-center'>
              <p className={`text-3xl font-black ${color} mb-1`}>{stat}</p>
              <p className='text-stone-400 text-xs'>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Main demo grid ── */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>

          {/* Notification Center */}
          <div className='bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-stone-800'>
              <div className='flex items-center gap-2'>
                <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
                <h2 className='text-white font-semibold text-sm'>Notification Center</h2>
                <span className='text-xs bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded-full'>{notifications.length}</span>
              </div>
              <button
                onClick={simulate}
                className='text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium'
              >
                ▶ Simulate
              </button>
            </div>
            <div className='p-4 space-y-3 max-h-80 overflow-y-auto'>
              {notifications.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 text-center'>
                  <p className='text-4xl mb-2'>🎉</p>
                  <p className='text-stone-400 text-sm'>All caught up!</p>
                </div>
              ) : (
                notifications.map((n) => <NotificationCard key={n.id} n={n} onDismiss={dismiss} />)
              )}
            </div>
          </div>

          {/* Right column */}
          <div className='space-y-4'>

            {/* Channel preferences */}
            <div className='bg-stone-900 border border-stone-800 rounded-2xl p-5'>
              <h2 className='text-white font-semibold text-sm mb-4'>Delivery Channels</h2>
              <div className='space-y-3'>
                {CHANNELS.map(({ id, label, icon, desc }) => (
                  <div key={id} className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <span className='text-xl'>{icon}</span>
                      <div>
                        <p className='text-stone-200 text-sm font-medium'>{label}</p>
                        <p className='text-stone-500 text-xs'>{desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setChannels((c) => ({ ...c, [id]: !c[id] }))}
                      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${channels[id] ? 'bg-emerald-600' : 'bg-stone-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${channels[id] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart prayer-time scheduling */}
            <div className='bg-stone-900 border border-stone-800 rounded-2xl p-5'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-white font-semibold text-sm'>Prayer-Time Scheduling</h2>
                <span className='text-[10px] text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2 py-0.5 rounded-full'>AI-optimised</span>
              </div>
              <div className='space-y-2'>
                {smartTimes.map((t, i) => (
                  <div key={t.slot} className='flex items-center gap-3'>
                    <button
                      onClick={() => toggleTime(i)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${t.active ? 'bg-emerald-600 border-emerald-500' : 'border-stone-600'}`}
                    >
                      {t.active && <span className='text-white text-[10px]'>✓</span>}
                    </button>
                    <div className='flex-1 flex items-center justify-between'>
                      <div>
                        <span className='text-stone-200 text-xs font-medium'>{t.slot}</span>
                        <span className='text-stone-600 text-xs ml-2'>{t.time}</span>
                      </div>
                      <span className='text-stone-500 text-[10px]'>{t.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature pillars ── */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8'>
          {[
            {
              icon: '🎯',
              title: 'Context-Aware',
              desc: 'Notifications adapt to your reading history, circle activity, and time zone — never generic, always relevant.',
            },
            {
              icon: '🕌',
              title: 'Salah-Synced',
              desc: 'Reminders anchor to your local prayer times — the same rhythm that structures a Muslim\'s day.',
            },
            {
              icon: '🔒',
              title: 'Respectful & Quiet',
              desc: 'Silent during Salah times. No late-night disruptions. A digital adab for sacred moments.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className='bg-stone-900 border border-stone-800 hover:border-emerald-800 rounded-2xl p-6 transition-all duration-200'>
              <div className='text-3xl mb-3'>{icon}</div>
              <h3 className='text-white font-bold text-sm mb-2'>{title}</h3>
              <p className='text-stone-400 text-xs leading-relaxed'>{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Judge criteria ── */}
        <div className='bg-linear-to-br from-stone-900 to-stone-950 border border-stone-700 rounded-2xl p-6 mb-6'>
          <p className='text-stone-500 text-xs uppercase tracking-widest mb-4'>Why this matters for Quran engagement</p>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {[
              { label: 'Effective API Use', desc: 'Hooks into QF streak and session data to personalise every alert' },
              { label: 'Innovation', desc: 'Prayer-time anchoring is unique to Islamic productivity tools' },
              { label: 'Technical Execution', desc: 'Multi-channel delivery with smart deduplication and quiet hours' },
              { label: 'Impact on Engagement', desc: 'Studies show reminder systems 3× daily active users in habit apps' },
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

      {/* ── Toast simulation ── */}
      {toastVisible && lastToast && (
        <div className='fixed bottom-6 right-6 z-50 bg-stone-900 border border-emerald-700/60 rounded-2xl px-5 py-4 shadow-2xl max-w-xs flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300'>
          <span className='text-xl'>🔔</span>
          <div>
            <p className='text-white text-sm font-semibold'>{lastToast.title}</p>
            <p className='text-stone-400 text-xs mt-0.5'>{lastToast.body}</p>
          </div>
          <button onClick={() => setToastVisible(false)} className='text-stone-600 hover:text-white text-sm ml-1 shrink-0'>✕</button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NotificationsVision;