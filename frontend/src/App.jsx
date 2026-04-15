import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import AuthCallback from '@/pages/AuthCallback';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import CircleRoom from '@/pages/CircleRoom';
import KhatmPlanner from '@/pages/KhatmPlanner';
import TafsirSession from '@/pages/TafsirSession';

const queryClient = new QueryClient();

// ── Placeholder Pages ─────────────────────────────────────────────────────────
const AuthError = () => (
  <div className='flex h-screen items-center justify-center'>
    <p className='text-red-500 text-lg'>Login failed. Please try again.</p>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/auth/callback' element={<AuthCallback />} />
            <Route path='/auth/error' element={<AuthError />} />

            <Route path='/dashboard' element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />

            {/* My Circles sidebar link target — renders same as Dashboard */}
            <Route path='/circles' element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />

            <Route path='/circle/:roomId' element={
              <ProtectedRoute><CircleRoom /></ProtectedRoute>
            } />

            <Route path='/circle/:roomId/khatm' element={
              <ProtectedRoute><KhatmPlanner /></ProtectedRoute>
            } />

            <Route path='/circle/:roomId/session' element={
              <ProtectedRoute><TafsirSession /></ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;