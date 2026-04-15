import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: '⊞' },
  { to: '/circles',   label: 'My Circles', icon: '◎' },
  { to: '/explore',   label: 'Explore',    icon: '⊕' },
  { to: '/settings',  label: 'Settings',   icon: '⊙' },
];

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='flex h-screen bg-stone-950 text-stone-100 overflow-hidden'>

      {/* ── Mobile overlay ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 bg-black/60 z-20 md:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-64 bg-stone-900 border-r border-stone-800
        flex flex-col
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className='flex items-center gap-2 px-6 py-6 border-b border-stone-800'>
          <span className='text-emerald-400 text-lg'>◆</span>
          <span className='text-white font-bold tracking-widest text-sm uppercase'>Halaqa</span>
        </div>

        {/* User badge */}
        <div className='px-6 py-4 border-b border-stone-800'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-300 text-sm font-bold'>
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className='overflow-hidden'>
              <p className='text-sm font-medium text-stone-200 truncate'>
                {user?.username || 'User'}
              </p>
              <p className='text-xs text-stone-500 truncate'>{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className='flex-1 px-3 py-4 space-y-1'>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-900/60 text-emerald-400 font-medium'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`
              }
            >
              <span className='text-base'>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className='px-3 py-4 border-t border-stone-800'>
          <button
            onClick={logout}
            className='w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-all duration-150'
          >
            <span className='text-base'>→</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>

        {/* Top navbar */}
        <header className='flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950'>

          {/* Mobile menu toggle */}
          <button
            className='md:hidden text-stone-400 hover:text-white transition-colors'
            onClick={() => setSidebarOpen(true)}
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16'/>
            </svg>
          </button>

          {/* Logo (mobile) */}
          <span className='md:hidden text-emerald-400 font-bold tracking-widest text-sm uppercase'>
            ◆ Halaqa
          </span>

          {/* Desktop spacer */}
          <div className='hidden md:block' />

          {/* Right actions */}
          <div className='flex items-center gap-4'>
            <span className='hidden md:block text-stone-500 text-sm'>
              {user?.username}
            </span>
            <button
              onClick={logout}
              className='text-xs text-stone-500 hover:text-red-400 border border-stone-800 hover:border-red-900 px-3 py-1.5 rounded-lg transition-all'
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className='flex-1 overflow-y-auto p-6 md:p-8'>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;