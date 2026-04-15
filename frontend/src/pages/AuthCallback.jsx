import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('halaqa_token', token);
      navigate('/dashboard', { replace: true });
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