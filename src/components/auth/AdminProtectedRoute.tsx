import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Navigate, Outlet } from 'react-router-dom';
import React from 'react';

const AdminProtectedRoute = () => {
  const { user, session } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();

  if (isAdminLoading) {
    return <div>Loading admin permissions...</div>;
  }

  if (!user || !session || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
