import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const usePhoneCollection = () => {
  const { user, isAnonymous } = useAuth();
  const [needsPhoneCollection, setNeedsPhoneCollection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPhoneStatus = async () => {
      if (!user || isAnonymous) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has phone number in auth.users
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('Error fetching user:', authError);
          setIsLoading(false);
          return;
        }

        const hasPhone = authData.user?.phone && authData.user.phone.trim() !== '';

        // Check if user skipped phone collection before
        const hasSkippedBefore = localStorage.getItem(`phone-skipped-${user.id}`);

        // Also check if this is a recent OAuth user without phone
        // Only consider OAuth users (not email provider)
        const provider = authData.user?.app_metadata?.provider;
        const isOAuthUser = provider && provider !== 'email';
        const createdRecently = authData.user?.created_at
          ? new Date(authData.user.created_at) > new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
          : false;

        // Show phone collection if:
        // 1. No phone number AND
        // 2. OAuth user (Google/Facebook) created recently AND
        // 3. Haven't skipped before
        const shouldShowCollection =
          !hasPhone && createdRecently && isOAuthUser && !hasSkippedBefore;

        setNeedsPhoneCollection(shouldShowCollection);
      } catch (error) {
        console.error('Error checking phone status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPhoneStatus();
  }, [user, isAnonymous]);

  const markPhoneCollected = () => {
    setNeedsPhoneCollection(false);
  };

  const skipPhoneCollection = () => {
    setNeedsPhoneCollection(false);
    // Store that user skipped (can show again later in profile)
    if (user?.id) {
      localStorage.setItem(`phone-skipped-${user.id}`, 'true');
    }
  };

  const resetPhoneCollection = () => {
    // Allow showing the modal again (useful for testing or profile page)
    if (user?.id) {
      localStorage.removeItem(`phone-skipped-${user.id}`);
    }
    setNeedsPhoneCollection(true);
  };

  return {
    needsPhoneCollection,
    isLoading,
    markPhoneCollected,
    skipPhoneCollection,
    resetPhoneCollection,
  };
};
