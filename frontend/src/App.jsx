// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
// Changes from previous version:
//   • Imports Tournament
//   • /tournament → Tournament  (new protected route)
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider }    from '@/context/AuthContext';
import AuthCallback        from '@/pages/AuthCallback';
import ProtectedRoute      from '@/components/ProtectedRoute';
import Home                from '@/pages/Home';
import Dashboard           from '@/pages/Dashboard';
import MyCircles           from '@/pages/MyCircles';
import Explore             from '@/pages/Explore';
import Settings            from '@/pages/Settings';
import Profile             from '@/pages/Profile';
import CircleRoom          from '@/pages/CircleRoom';
import KhatmPlanner        from '@/pages/KhatmPlanner';
import TafsirSession       from '@/pages/TafsirSession';
import DailyVerse          from '@/pages/DailyVerse';
import SpeakQuran          from '@/pages/SpeakQuran';
import SpeakQuranLesson    from '@/pages/SpeakQuranLesson';
import Tournament          from '@/pages/Tournament';          // ← ADDED

const queryClient = new QueryClient();

// ── Auth error fallback ───────────────────────────────────────────────────────
const AuthError = () => (
  <div className='flex h-screen items-center justify-center'>
    <p className='text-red-500 text-lg'>Login failed. Please try again.</p>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes ─────────────────────────────────────── */}
          <Route path='/'              element={<Home />} />
          <Route path='/auth/callback' element={<AuthCallback />} />
          <Route path='/auth/error'    element={<AuthError />} />

          {/* Daily Quran Share — public, no login required */}
          <Route path='/daily'         element={<DailyVerse />} />

          {/* ── Protected routes ──────────────────────────────────── */}

          {/* Dashboard home — greeting, stats, activity, continue reading */}
          <Route path='/dashboard' element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          {/* My Circles — full circle list + create modal */}
          <Route path='/circles' element={
            <ProtectedRoute><MyCircles /></ProtectedRoute>
          } />

          {/* Explore — discover public circles + community reflections */}
          <Route path='/explore' element={
            <ProtectedRoute><Explore /></ProtectedRoute>
          } />

          {/* Settings — preferences, profile, account */}
          <Route path='/settings' element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />

          {/* Profile — user stats, reading history, account info */}
          <Route path='/profile' element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          {/* Speak Qur'an — vocabulary learning hub */}
          <Route path='/speak-quran' element={
            <ProtectedRoute><SpeakQuran /></ProtectedRoute>
          } />

          {/* Speak Qur'an — word learning lesson */}
          <Route path='/speak-quran/lesson' element={
            <ProtectedRoute><SpeakQuranLesson /></ProtectedRoute>
          } />

          {/* Tournament — quiz leagues & coin wagering */}
          <Route path='/tournament' element={
            <ProtectedRoute><Tournament /></ProtectedRoute>
          } />                                                  {/* ← ADDED */}

          {/* Circle detail room — unchanged */}
          <Route path='/circle/:roomId' element={
            <ProtectedRoute><CircleRoom /></ProtectedRoute>
          } />

          {/* Khatm planner — unchanged */}
          <Route path='/circle/:roomId/khatm' element={
            <ProtectedRoute><KhatmPlanner /></ProtectedRoute>
          } />

          {/* Tafsir session — unchanged */}
          <Route path='/circle/:roomId/session' element={
            <ProtectedRoute><TafsirSession /></ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;