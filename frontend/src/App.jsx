// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
// Root router. Changes from the previous version:
//   • Imports MyCircles (extracted from old Dashboard) and new Explore, Settings
//   • /circles → MyCircles  (was: Dashboard)
//   • /explore → Explore    (was: blank — route did not exist)
//   • /settings → Settings  (was: blank — route did not exist)
//   • /dashboard → Dashboard (now: stats home page, not the circles list)
//   • /daily → DailyVerse   (new — public page, no auth required)
//   • /speak-quran → SpeakQuran  (new — Speak Qur'an hub)  ← ADDED
// Everything else — auth flow, CircleRoom, KhatmPlanner, TafsirSession — is
// completely unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider }    from '@/context/AuthContext';
import AuthCallback        from '@/pages/AuthCallback';
import ProtectedRoute      from '@/components/ProtectedRoute';
import Home                from '@/pages/Home';
import Dashboard           from '@/pages/Dashboard';   // stats home page
import MyCircles           from '@/pages/MyCircles';   // circle list
import Explore             from '@/pages/Explore';
import Settings            from '@/pages/Settings';
import Profile             from '@/pages/Profile';
import CircleRoom          from '@/pages/CircleRoom';
import KhatmPlanner        from '@/pages/KhatmPlanner';
import TafsirSession       from '@/pages/TafsirSession';
import DailyVerse          from '@/pages/DailyVerse';
import SpeakQuran          from '@/pages/SpeakQuran';  // ← ADDED
import SpeakQuranLesson    from '@/pages/SpeakQuranLesson';
import NotificationsVision from '@/pages/NotificationsVision'; // ← ADDED
import ZameelVision        from '@/pages/ZameelVision';        // ← ADDED
import FasluVision         from '@/pages/FasluVision';         // ← 
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

          {/* Tournament */}          {/* ← ADD THIS */}
          <Route path='/tournament' element={
            <ProtectedRoute><Tournament /></ProtectedRoute>
          } />

          {/* Vision pages — Coming Soon features */}
          <Route path='/notifications' element={
            <ProtectedRoute><NotificationsVision /></ProtectedRoute>
          } />
          <Route path='/zameel' element={
            <ProtectedRoute><ZameelVision /></ProtectedRoute>
          } />
          <Route path='/faslu' element={
            <ProtectedRoute><FasluVision /></ProtectedRoute>
          } />

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