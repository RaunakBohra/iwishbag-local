import AuthForm from '@/components/forms/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageTitle, Body } from '@/components/ui/typography';

const Auth = () => {
  const { session, isAnonymous } = useAuth();
  const location = useLocation();
  const message = location.state?.message;

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (session && !isAnonymous) {
      console.log('✅ [Auth Page] User already authenticated, redirecting...');
    }
  }, [session, isAnonymous]);

  if (session && !isAnonymous) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <PageTitle className="text-3xl font-extrabold text-gray-900">
            Welcome to iWishBag
          </PageTitle>
          <Body className="mt-2 text-gray-600">
            Sign in to your account or create a new one
          </Body>
        </div>

        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <AuthForm />
        </div>
      </div>
    </div>
  );
};

export default Auth;