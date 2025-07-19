import AuthForm from '@/components/forms/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const Auth = () => {
  const { session } = useAuth();
  const location = useLocation();
  const message = location.state?.message;

  useEffect(() => {
    // Clear the message from location state after display
    if (message) {
      window.history.replaceState({}, document.title);
    }
  }, [message]);

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Back Button */}
      <div className="absolute top-6 right-6 z-10">
        <Link 
          to="/" 
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="flex flex-1">
        {/* Left Side - Brand Gradient Background */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-teal-500 via-cyan-500 to-orange-400 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-white bg-opacity-10 rounded-full blur-lg"></div>
            <div className="absolute top-2/3 left-1/3 w-16 h-16 bg-white bg-opacity-10 rounded-full blur-md"></div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {/* Logo - Above Form */}
            <div className="text-center mb-8">
              <img 
                src="https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png" 
                alt="iwishBag"
                className="h-16 mx-auto"
              />
            </div>

            {/* Success Message */}
            {message && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}

            {/* Auth Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Login or Signup</h2>
                <p className="text-gray-600">Get started & grab best offers on top brands!</p>
              </div>

              {/* Auth Form */}
              <AuthForm />
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-purple-600 hover:text-purple-800">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-purple-600 hover:text-purple-800">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
