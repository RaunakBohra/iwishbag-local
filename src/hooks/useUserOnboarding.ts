import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardState } from '@/hooks/useDashboardState';

interface UserOnboardingStatus {
  isNewUser: boolean;
  daysSinceSignup: number;
  hasCompletedFirstQuote: boolean;
  hasCompletedFirstOrder: boolean;
  shouldShowOnboarding: boolean;
  onboardingProgress: {
    signedUp: boolean;
    firstQuoteRequested: boolean;
    firstQuoteApproved: boolean;
    firstOrderPlaced: boolean;
    firstOrderCompleted: boolean;
  };
}

export const useUserOnboarding = (): UserOnboardingStatus => {
  const { user } = useAuth();
  const { quotes, orders } = useDashboardState();

  const onboardingStatus = useMemo(() => {
    if (!user) {
      return {
        isNewUser: false,
        daysSinceSignup: 0,
        hasCompletedFirstQuote: false,
        hasCompletedFirstOrder: false,
        shouldShowOnboarding: false,
        onboardingProgress: {
          signedUp: false,
          firstQuoteRequested: false,
          firstQuoteApproved: false,
          firstOrderPlaced: false,
          firstOrderCompleted: false,
        },
      };
    }

    // Calculate days since signup
    const signupDate = new Date(user.created_at);
    const now = new Date();
    const daysSinceSignup = Math.floor(
      (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check if user is new (signed up within last 7 days)
    const isNewUser = daysSinceSignup <= 7;

    // Check completion status
    const hasAnyQuotes = (quotes || []).length > 0;
    const hasApprovedQuote = (quotes || []).some((q) => q.status === 'approved');
    const hasAnyOrders = (orders || []).length > 0;
    const hasCompletedOrder = (orders || []).some((o) => o.status === 'completed');

    // Determine if we should show onboarding
    // Show if user is new AND hasn't completed their first quote
    const shouldShowOnboarding = isNewUser && !hasApprovedQuote;

    const onboardingProgress = {
      signedUp: true,
      firstQuoteRequested: hasAnyQuotes,
      firstQuoteApproved: hasApprovedQuote,
      firstOrderPlaced: hasAnyOrders,
      firstOrderCompleted: hasCompletedOrder,
    };

    return {
      isNewUser,
      daysSinceSignup,
      hasCompletedFirstQuote: hasApprovedQuote,
      hasCompletedFirstOrder: hasCompletedOrder,
      shouldShowOnboarding,
      onboardingProgress,
    };
  }, [user, quotes, orders]);

  return onboardingStatus;
};
