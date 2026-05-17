import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const AuthCallback = () => {
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const { loginSuccess } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // loginSuccess saves token + fetches /auth/me + sets user in context
      // BEFORE we navigate — so ProtectedRoute never sees user = null on arrival.
      loginSuccess(token).then(() => {
        navigate('/dashboard', { replace: true });
      });
    } else {
      navigate('/?error=auth_failed', { replace: true });
    }
  }, []);

  return (
    <div className='flex flex-col h-screen items-center justify-center gap-4'>
      <div className='animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full' />
      <p className='text-gray-500 text-sm'>Signing you in...</p>
    </div>
  );
};

export default AuthCallback;