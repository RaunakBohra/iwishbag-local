import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { user, session, isAnonymous } = useAuth();

  console.log('🔒 PROTECTED ROUTE CHECK:', {
    user: user ? { id: user.id, email: user.email } : null,
    session: !!session,
    isAnonymous,
    shouldRedirect: !user || !session || isAnonymous,
    currentPath: window.location.pathname,
  });

  // Redirect if no user/session OR if user is anonymous
  if (!user || !session || isAnonymous) {
    console.log('🚫 PROTECTED ROUTE: Redirecting to /auth because:', {
      noUser: !user,
      noSession: !session,
      isAnonymous,
    });
    return <Navigate to="/auth" replace />;
  }

  console.log('✅ PROTECTED ROUTE: Access granted');
  return <Outlet />;
};

export default ProtectedRoute;
