/**
 * OAuthButtons Component
 * Handles social authentication providers (Google, Facebook)
 * Extracted from AuthForm for better maintainability
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface OAuthButtonsProps {
  disabled?: boolean;
  className?: string;
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  disabled = false,
  className = '',
}) => {
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const handleSignInWithGoogle = async () => {
    console.log('🔐 [OAuthButtons] Starting Google OAuth sign-in...');
    setGoogleLoading(true);
    
    // Clear any existing anonymous session first
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.session?.user?.is_anonymous) {
      console.log('🔐 [OAuthButtons] Clearing anonymous session before OAuth...');
      await supabase.auth.signOut();
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'openid profile email https://www.googleapis.com/auth/user.addresses.read',
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          // Remove prompt: 'consent' to allow automatic sign-in for returning users
          // Google will only show consent screen when necessary (first time, new permissions, etc.)
        },
      },
    });

    if (error) {
      console.error('🔐 [OAuthButtons] Google OAuth error:', error);
      toast({
        title: 'Error signing in with Google',
        description: error.message,
        variant: 'destructive',
      });
      setGoogleLoading(false);
    } else {
      console.log('🔐 [OAuthButtons] Google OAuth initiated successfully:', data);
      // Don't reset loading state here - let the redirect handle it
      // The component will unmount during redirect anyway
    }
  };

  const handleSignInWithFacebook = async () => {
    console.log('🔐 [OAuthButtons] Starting Facebook OAuth sign-in...');
    setFacebookLoading(true);
    
    // Clear any existing anonymous session first
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.session?.user?.is_anonymous) {
      console.log('🔐 [OAuthButtons] Clearing anonymous session before OAuth...');
      await supabase.auth.signOut();
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'email',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('🔐 [OAuthButtons] Facebook OAuth error:', error);
      toast({
        title: 'Error signing in with Facebook',
        description: error.message,
        variant: 'destructive',
      });
      setFacebookLoading(false);
    } else {
      console.log('🔐 [OAuthButtons] Facebook OAuth initiated successfully:', data);
      // Don't reset loading state here - let the redirect handle it
      // The component will unmount during redirect anyway
    }
  };

  const isDisabled = disabled || googleLoading || facebookLoading;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSignInWithGoogle}
          disabled={isDisabled}
          className="h-11 border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {googleLoading ? 'Connecting...' : 'Google'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleSignInWithFacebook}
          disabled={isDisabled}
          className="h-11 border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {facebookLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <svg className="h-5 w-5 mr-2 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
          {facebookLoading ? 'Connecting...' : 'Facebook'}
        </Button>
      </div>
    </div>
  );
};