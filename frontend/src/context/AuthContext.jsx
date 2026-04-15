import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Bootstrap: check for existing session on mount ──────────────────────
  useEffect(() => {
    const token = localStorage.getItem('halaqa_token');

    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('halaqa_token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const login = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = () => {
    localStorage.removeItem('halaqa_token');
    setUser(null);
    window.location.href = '/';
  };

  // ── Loading spinner ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full' />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};