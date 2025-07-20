import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { user, session, isAnonymous } = useAuth();

  // Redirect if no user/session OR if user is anonymous
  if (!user || !session || isAnonymous) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
