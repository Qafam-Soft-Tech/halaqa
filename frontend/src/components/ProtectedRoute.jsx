import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full' />
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/' replace />;
  }

  return children;
};

export default ProtectedRoute;