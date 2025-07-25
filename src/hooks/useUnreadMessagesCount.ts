// ============================================================================
// UNREAD MESSAGES COUNT HOOK - Global unread message count for Dashboard
// Uses the database function get_unread_message_count to get total count
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UseUnreadMessagesCountOptions {
  pollInterval?: number;
  staleTime?: number;
}

export const useUnreadMessagesCount = (options: UseUnreadMessagesCountOptions = {}) => {
  const { pollInterval = 30000, staleTime = 30000 } = options;
  const { user } = useAuth();

  const {
    data: unreadCount = 0,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) {
        console.log('🔐 [useUnreadMessagesCount] No user ID available');
        return 0;
      }

      try {
        console.log(
          '📬 [useUnreadMessagesCount] Fetching unread messages count for user:',
          user.id,
        );

        // Call the database function to get unread message count
        const { data, error } = await supabase.rpc('get_unread_message_count', {
          p_quote_id: null, // null to get count for all quotes
          p_user_id: user.id,
        });

        if (error) {
          console.error('🚨 [useUnreadMessagesCount] Database error:', error);
          throw new Error(`Failed to fetch unread messages count: ${error.message}`);
        }

        const count = Number(data) || 0;
        console.log('📊 [useUnreadMessagesCount] Retrieved unread count:', count);

        return count;
      } catch (error) {
        console.error('🚨 [useUnreadMessagesCount] Query error:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    refetchInterval: pollInterval, // Poll every 30 seconds by default
    staleTime, // Consider data stale after 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    unreadCount,
    isLoading,
    error,
    refetch,
  };
};

export default useUnreadMessagesCount;
