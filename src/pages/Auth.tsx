import AuthForm from '@/components/forms/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageTitle, Body } from '@/components/ui/typography';
import { useMFAAuth } from '@/hooks/useMFAAuth';
import { useMFAGuard } from '@/hooks/useMFAGuard';
import { MFASetup } from '@/components/auth/MFASetup';
import { MFAVerification } from '@/components/auth/MFAVerification';

const Auth = () => {
  const { session, isAnonymous } = useAuth();
  const location = useLocation();
  const message = location.state?.message;
  const {
    authState,
    loading,
    handleLogin,
    handleMFAVerification,
    handleMFASetupComplete,
    handleMFACancel,
    resetAuth,
  } = useMFAAuth();
  
  const {
    loading: mfaLoading,
    requiresMFA,
    hasValidMFASession,
    mfaEnabled,
  } = useMFAGuard();

  useEffect(() => {
    // Clear the message from location state after display
    if (message) {
      window.history.replaceState({}, document.title);
    }
  }, [message]);

  // Handle authenticated users with MFA requirements
  if (session && !isAnonymous) {
    if (mfaLoading) {
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p>Checking security requirements...</p>
          </div>
        </div>
      );
    }
    
    // If user doesn't require MFA or has valid MFA session, redirect
    if (!requiresMFA || hasValidMFASession) {
      return <Navigate to="/" replace />;
    }
    
    // If user requires MFA but doesn't have it enabled, show setup
    if (requiresMFA && !mfaEnabled) {
      return (
        <div className="h-screen flex items-center justify-center">
          <MFASetup 
            onComplete={() => window.location.reload()}
            onSkip={() => {
              // Admin users can't skip MFA
              alert('MFA is required for admin accounts');
            }}
          />
        </div>
      );
    }
    
    // If user requires MFA and has it enabled but no valid session, show verification
    if (requiresMFA && mfaEnabled && !hasValidMFASession) {
      return (
        <div className="h-screen flex items-center justify-center">
          <MFAVerification
            onSuccess={(token) => {
              sessionStorage.setItem('mfa_session', token);
              window.location.reload();
            }}
            onCancel={() => {
              // Sign out user if they cancel MFA
              supabase.auth.signOut();
            }}
            userEmail={session.user.email}
          />
        </div>
      );
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Back Button */}
      <div className="absolute top-6 right-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-orange-500 lg:text-gray-600 hover:text-orange-600 lg:hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-medium">Back to Home</span>
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
        <div className="flex-1 flex items-center justify-center bg-gray-50 lg:bg-gray-50 bg-gradient-to-t from-teal-500 from-40% via-cyan-500/70 via-60% to-transparent lg:bg-none px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Mobile Decorative elements */}
          <div className="absolute inset-0 lg:hidden pointer-events-none">
            <div className="absolute top-1/6 right-1/4 w-24 h-24 bg-white bg-opacity-10 rounded-full blur-xl"></div>
            <div className="absolute bottom-1/4 left-1/5 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-lg"></div>
            <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white bg-opacity-10 rounded-full blur-md"></div>
            <div className="absolute bottom-1/6 right-1/6 w-20 h-20 bg-white bg-opacity-10 rounded-full blur-lg"></div>
          </div>
          <div className="w-full max-w-md">
            {/* Logo - Above Form */}
            <div className="text-center mb-8">
              <img
                src="https://res.cloudinary.com/dto2xew5c/image/upload/v1750167745/wb-logo-final_1_f7bqrp.png"
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
                <PageTitle className="mb-2">Login or Signup</PageTitle>
                <Body className="text-gray-600">Get started & grab best offers on top brands!</Body>
              </div>

              {/* Auth Form */}
              {authState.step === 'login' && <AuthForm onLogin={handleLogin} />}
              {authState.step === 'mfa' && (
                <MFAVerification
                  onSuccess={handleMFAVerification}
                  onCancel={handleMFACancel}
                  userEmail={authState.userEmail}
                />
              )}
              {authState.step === 'setup' && (
                <MFASetup
                  onComplete={handleMFASetupComplete}
                  onSkip={handleMFACancel}
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs sm:text-sm text-white/80 lg:text-gray-600 leading-relaxed whitespace-nowrap">
                By continuing, you agree to our{' '}
                <a
                  href="/terms-conditions"
                  className="text-white hover:text-white/90 lg:text-gray-600 lg:hover:text-gray-900 font-medium underline"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacy-policy"
                  className="text-white hover:text-white/90 lg:text-gray-600 lg:hover:text-gray-900 font-medium underline"
                >
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
