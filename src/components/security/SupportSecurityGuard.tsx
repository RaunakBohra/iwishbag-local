// Security Guard Component for Support System
// Prevents users from accessing admin-level support features

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SupportSecurityGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireUser?: boolean;
  fallbackPath?: string;
}

/**
 * Security guard that prevents unauthorized access to support features
 * Ensures proper role-based access control for support system
 */
export const SupportSecurityGuard: React.FC<SupportSecurityGuardProps> = ({
  children,
  requireAdmin = false,
  requireUser = false,
  fallbackPath = '/help',
}) => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in to access support features.
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check admin requirements
  if (requireAdmin && userRole !== 'admin' && userRole !== 'moderator') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto border-red-200">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this area.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate(fallbackPath)}
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check user requirements (regular users only, no admin)
  if (requireUser && (userRole === 'admin' || userRole === 'moderator')) {
    // Redirect admins to admin support interface
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto border-blue-200">
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Admin Access Detected
            </h2>
            <p className="text-gray-600 mb-6">
              You should use the admin support interface instead.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/admin/support-tickets')}
                className="w-full"
              >
                Go to Admin Support
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(fallbackPath)}
                className="w-full"
              >
                Go to Help Center
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All security checks passed, render children
  return <>{children}</>;
};

/**
 * HOC for wrapping components with user support security
 */
export const withUserSupportSecurity = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => (
    <SupportSecurityGuard requireUser>
      <Component {...props} />
    </SupportSecurityGuard>
  );
};

/**
 * HOC for wrapping components with admin support security
 */
export const withAdminSupportSecurity = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => (
    <SupportSecurityGuard requireAdmin>
      <Component {...props} />
    </SupportSecurityGuard>
  );
};