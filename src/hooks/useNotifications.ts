// =============================================
// useNotifications React Query Hook
// =============================================
// Custom hook for managing user notifications with React Query.
// Provides real-time updates, caching, and mutation capabilities.
// Created: 2025-07-24
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  notificationService,
  NotificationRecord,
  NotificationData,
} from '@/services/NotificationService';
import { NotificationType } from '@/types/NotificationTypes';
import { toast } from 'sonner';

// Query keys for consistent cache management
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: string, filters?: any) => [...notificationKeys.lists(), userId, filters] as const,
  counts: () => [...notificationKeys.all, 'count'] as const,
  count: (userId: string) => [...notificationKeys.counts(), userId] as const,
};

// Hook options interface
interface UseNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
  includeExpired?: boolean;
  enabled?: boolean;
  refetchInterval?: number;
}

// Hook return type
interface UseNotificationsReturn {
  // Data
  notifications: NotificationRecord[];
  unreadCount: number;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isFetching: boolean;
  isRefreshing: boolean;

  // Error states
  error: Error | null;

  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (
    type: NotificationType,
    message: string,
    data?: NotificationData,
  ) => Promise<void>;
  refresh: () => Promise<void>;

  // Utilities
  hasUnread: boolean;
  canLoadMore: boolean;
}

/**
 * Custom hook for managing user notifications
 */
export const useNotifications = (options: UseNotificationsOptions = {}): UseNotificationsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    unreadOnly = false,
    limit = 20,
    includeExpired = false,
    enabled = true,
    refetchInterval = 30000, // 30 seconds
  } = options;

  const userId = user?.id;

  // Query for notifications list
  const {
    data: notifications = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
    queryFn: async () => {
      if (!userId) return [];

      return await notificationService.getUserNotifications(userId, {
        unreadOnly,
        limit,
        includeExpired,
      });
    },
    enabled: enabled && !!userId,
    refetchInterval: unreadOnly ? refetchInterval : false, // Only auto-refresh unread notifications
    staleTime: unreadOnly ? 0 : 5 * 60 * 1000, // 5 minutes for read notifications, 0 for unread
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for unread count
  const { data: unreadCount = 0, isLoading: isLoadingCount } = useQuery({
    queryKey: notificationKeys.count(userId || ''),
    queryFn: async () => {
      if (!userId) return 0;
      return await notificationService.getUnreadCount(userId);
    },
    enabled: enabled && !!userId,
    refetchInterval: 15000, // 15 seconds
    staleTime: 0, // Always fresh for count
  });

  // Mutation for marking notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const success = await notificationService.markAsRead(notificationId, userId);
      if (!success) throw new Error('Failed to mark notification as read');
    },
    onMutate: async (notificationId: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      // Update notifications list
      const previousNotifications = queryClient.getQueryData(
        notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
      ) as NotificationRecord[];

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification,
        );

        queryClient.setQueryData(
          notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
          updatedNotifications,
        );
      }

      // Update unread count
      const previousCount = queryClient.getQueryData(
        notificationKeys.count(userId || ''),
      ) as number;
      if (previousCount > 0) {
        queryClient.setQueryData(notificationKeys.count(userId || ''), previousCount - 1);
      }

      return { previousNotifications, previousCount };
    },
    onError: (error, notificationId, context) => {
      // Rollback optimistic updates
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
          context.previousNotifications,
        );
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationKeys.count(userId || ''), context.previousCount);
      }

      toast.error('Failed to mark notification as read');
      console.error('Error marking notification as read:', error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.counts() });
    },
  });

  // Mutation for dismissing notification
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const success = await notificationService.dismiss(notificationId, userId);
      if (!success) throw new Error('Failed to dismiss notification');
    },
    onMutate: async (notificationId: string) => {
      // Optimistic update - remove from list
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      const previousNotifications = queryClient.getQueryData(
        notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
      ) as NotificationRecord[];

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.filter(
          (notification) => notification.id !== notificationId,
        );

        queryClient.setQueryData(
          notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
          updatedNotifications,
        );
      }

      // Update unread count if notification was unread
      const dismissedNotification = previousNotifications?.find((n) => n.id === notificationId);
      if (dismissedNotification && !dismissedNotification.is_read) {
        const previousCount = queryClient.getQueryData(
          notificationKeys.count(userId || ''),
        ) as number;
        if (previousCount > 0) {
          queryClient.setQueryData(notificationKeys.count(userId || ''), previousCount - 1);
        }
      }

      return { previousNotifications };
    },
    onError: (error, notificationId, context) => {
      // Rollback optimistic updates
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
          context.previousNotifications,
        );
      }

      toast.error('Failed to dismiss notification');
      console.error('Error dismissing notification:', error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.counts() });
    },
  });

  // Mutation for marking all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const count = await notificationService.markAllAsRead(userId);
      return count;
    },
    onMutate: async () => {
      // Optimistic update - mark all as read
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      const previousNotifications = queryClient.getQueryData(
        notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
      ) as NotificationRecord[];

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }));

        queryClient.setQueryData(
          notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
          updatedNotifications,
        );
      }

      // Set unread count to 0
      queryClient.setQueryData(notificationKeys.count(userId || ''), 0);

      return { previousNotifications };
    },
    onSuccess: (count) => {
      toast.success(`Marked ${count} notifications as read`);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.list(userId || '', { unreadOnly, limit, includeExpired }),
          context.previousNotifications,
        );
      }

      toast.error('Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.counts() });
    },
  });

  // Mutation for creating notification (useful for testing/admin)
  const createNotificationMutation = useMutation({
    mutationFn: async ({
      type,
      message,
      data,
    }: {
      type: NotificationType;
      message: string;
      data?: NotificationData;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      const notification = await notificationService.createNotification(
        userId,
        type,
        message,
        data,
      );
      return notification;
    },
    onSuccess: () => {
      // Refetch notifications
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.counts() });
      toast.success('Notification created');
    },
    onError: (error) => {
      toast.error('Failed to create notification');
      console.error('Error creating notification:', error);
    },
  });

  // Derived states
  const hasUnread = unreadCount > 0;
  const canLoadMore = notifications.length >= limit;
  const isLoadingMore = false; // Could implement pagination later
  const isRefreshing = isFetching && !isLoading;

  return {
    // Data
    notifications,
    unreadCount,

    // Loading states
    isLoading: isLoading || isLoadingCount,
    isLoadingMore,
    isFetching,
    isRefreshing,

    // Error states
    error: error as Error | null,

    // Actions
    markAsRead: markAsReadMutation.mutateAsync,
    dismiss: dismissMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    createNotification: async (
      type: NotificationType,
      message: string,
      data?: NotificationData,
    ) => {
      await createNotificationMutation.mutateAsync({ type, message, data });
    },
    refresh: async () => {
      await refetch();
    },

    // Utilities
    hasUnread,
    canLoadMore,
  };
};

/**
 * Hook for getting only unread notifications
 */
export const useUnreadNotifications = (
  options: Omit<UseNotificationsOptions, 'unreadOnly'> = {},
) => {
  return useNotifications({ ...options, unreadOnly: true });
};

/**
 * Hook for getting only notification count
 */
export const useNotificationCount = () => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: notificationKeys.count(userId || ''),
    queryFn: async () => {
      if (!userId) return 0;
      return await notificationService.getUnreadCount(userId);
    },
    enabled: !!userId,
    refetchInterval: 15000, // 15 seconds
    staleTime: 0, // Always fresh
  });
};

/**
 * Utility function to invalidate all notification queries
 */
export const useInvalidateNotifications = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };
};
