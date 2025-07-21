// ============================================================================
// UNIFIED QUOTE MESSAGES HOOK - Consolidates all quote message logic
// Replaces duplicate logic in QuoteMessaging and QuoteMessageThread
// ============================================================================

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { quoteMessageService, SendMessageRequest } from '@/services/QuoteMessageService';

export interface UseQuoteMessagesOptions {
  pollInterval?: number;
  staleTime?: number;
  compact?: boolean;
  autoMarkRead?: boolean;
}

export interface UseQuoteMessagesResult {
  // Data
  messageThread: any;
  unreadCount: number;

  // Loading states
  isLoading: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;

  // Error states
  error: Error | null;

  // Actions
  sendMessage: (request: Omit<SendMessageRequest, 'quoteId'>) => Promise<void>;
  markMessagesAsRead: (messageIds: string[]) => Promise<void>;
  refreshMessages: () => Promise<void>;

  // Utilities
  formatTimestamp: (timestamp: string) => string;
  getUnreadMessageIds: () => string[];
}

export const useQuoteMessages = (
  quoteId: string,
  options: UseQuoteMessagesOptions = {},
): UseQuoteMessagesResult => {
  const { pollInterval = 30000, staleTime = 10000, compact = false, autoMarkRead = true } = options;

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(Date.now());

  // Unified query key for consistent caching
  const queryKey = ['quote-messages', quoteId];

  // Query for message thread
  const {
    data: messageThread,
    isLoading: isLoadingMessages,
    error,
    refetch: refreshMessages,
  } = useQuery({
    queryKey,
    queryFn: () => quoteMessageService.getMessageThread(quoteId),
    refetchInterval: pollInterval,
    staleTime,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Calculate unread count
  const unreadCount =
    messageThread?.messages?.filter((msg: any) => msg.recipient_id === user?.id && !msg.is_read)
      .length || 0;

  // Get unread message IDs
  const getUnreadMessageIds = useCallback((): string[] => {
    if (!messageThread?.messages || !user) return [];

    return messageThread.messages
      .filter((msg: any) => msg.recipient_id === user.id && !msg.is_read)
      .map((msg: any) => msg.id);
  }, [messageThread?.messages, user]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (request: SendMessageRequest) => {
      return quoteMessageService.sendMessage(request);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey });

        if (compact) {
          toast({
            title: 'Message sent',
            duration: 2000,
          });
        } else {
          toast({
            title: 'Message sent successfully',
            duration: 3000,
          });
        }
      } else {
        toast({
          title: 'Failed to send message',
          description: result.error,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageIds: string[]) => quoteMessageService.markMessagesAsRead(messageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setLastReadTimestamp(Date.now());
    },
    onError: (error: Error) => {
      console.error('Failed to mark messages as read:', error);
    },
  });

  // Auto-mark messages as read
  const markMessagesAsRead = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return;
      await markAsReadMutation.mutateAsync(messageIds);
    },
    [markAsReadMutation],
  );

  // Send message action
  const sendMessage = useCallback(
    async (request: Omit<SendMessageRequest, 'quoteId'>) => {
      const fullRequest: SendMessageRequest = {
        ...request,
        quoteId,
      };

      await sendMessageMutation.mutateAsync(fullRequest);
    },
    [quoteId, sendMessageMutation],
  );

  // Format message timestamp
  const formatTimestamp = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  }, []);

  // Auto-mark unread messages as read when they load
  React.useEffect(() => {
    if (autoMarkRead && messageThread?.messages && user) {
      const unreadIds = getUnreadMessageIds();
      if (unreadIds.length > 0) {
        // Debounce the mark as read to avoid excessive API calls
        const timeoutId = setTimeout(() => {
          markMessagesAsRead(unreadIds);
        }, 1000);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [autoMarkRead, messageThread?.messages, user, markMessagesAsRead, getUnreadMessageIds]);

  return {
    // Data
    messageThread,
    unreadCount,

    // Loading states
    isLoading: isLoadingMessages,
    isLoadingMessages,
    isSendingMessage: sendMessageMutation.isPending,

    // Error states
    error,

    // Actions
    sendMessage,
    markMessagesAsRead,
    refreshMessages,

    // Utilities
    formatTimestamp,
    getUnreadMessageIds,
  };
};

export default useQuoteMessages;
