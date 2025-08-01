import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';

const AdminProtectedRoute = () => {
  const { user, session } = useAuth();
  const { isAdmin, isLoading } = useAdminCheck();

  // Show loading while checking admin status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user || !session) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to user dashboard if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is admin, allow access
  return <Outlet />;
};

export default AdminProtectedRoute;