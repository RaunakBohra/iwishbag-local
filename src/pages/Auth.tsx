import AuthForm from '@/components/forms/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900">iwishBag</h1>
            </div>
            <div className="text-sm text-gray-600">
              New to iwishBag?{' '}
              <span className="text-purple-600 font-medium">Get started →</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-screen bg-white flex">
        {/* Left Side - Content */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-20">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Shop globally,
              <br />
              ship locally
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Access products from Amazon, eBay, Flipkart, and Alibaba with transparent pricing and reliable shipping to India and Nepal.
            </p>
            
            {/* Simple feature list */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700">Transparent pricing with no hidden fees</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700">Secure payment processing</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700">Real-time order tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            {/* Success Message */}
            {message && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}

            {/* Auth Form */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Sign in to your account</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Welcome back! Please enter your details.
                </p>
              </div>

              <AuthForm />

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
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
    </div>
  );
};

export default Auth;
