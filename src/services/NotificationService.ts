// =============================================
// Notification Service
// =============================================
// Comprehensive service for managing the iwishBag proactive notification system.
// Handles creation, retrieval, updates, and cleanup of user notifications.
// Created: 2025-07-24
// =============================================

import { supabase } from '@/integrations/supabase/client';
import {
  NotificationType,
  NotificationPriority,
  getNotificationConfig,
  calculateExpiryDate,
  NOTIFICATION_PRIORITY,
} from '@/types/NotificationTypes';

// Notification data interface for database storage
export interface NotificationData {
  // Core context data
  quote_id?: string;
  order_id?: string;
  ticket_id?: string;
  message_id?: string;

  // Action URLs and references
  action_url?: string;
  action_label?: string;
  reference_id?: string;

  // Rich content data
  title?: string;
  subtitle?: string;
  image_url?: string;

  // Tracking and analytics
  source?: string;
  campaign_id?: string;

  // Custom fields for extensibility
  [key: string]: any;
}

// Notification database record interface
export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  data: NotificationData;
  priority: NotificationPriority;
  is_read: boolean;
  is_dismissed: boolean;
  requires_action: boolean;
  allow_dismiss: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  read_at: string | null;
  dismissed_at: string | null;
}

// Service configuration
interface NotificationServiceConfig {
  maxNotificationsPerUser: number;
  defaultBatchSize: number;
  cleanupIntervalHours: number;
  enableAnalytics: boolean;
}

const DEFAULT_CONFIG: NotificationServiceConfig = {
  maxNotificationsPerUser: 100,
  defaultBatchSize: 20,
  cleanupIntervalHours: 24,
  enableAnalytics: true,
};

class NotificationService {
  private config: NotificationServiceConfig;
  private initialized: boolean = false;

  constructor(config: Partial<NotificationServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the notification service
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Perform any initialization tasks
      // Could include setting up real-time subscriptions, cleanup tasks, etc.
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  /**
   * Create a new notification for a user
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    data: NotificationData = {},
    options: {
      priority?: NotificationPriority;
      expiryHours?: number;
      skipDuplicates?: boolean;
    } = {},
  ): Promise<NotificationRecord | null> {
    try {
      await this.initialize();

      const config = getNotificationConfig(type);
      const priority = options.priority || config.priority;
      const expiresAt = calculateExpiryDate(type, options.expiryHours);

      // Check for duplicates if requested
      if (options.skipDuplicates) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', type)
          .eq('is_dismissed', false)
          .gte('expires_at', new Date().toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`Skipping duplicate notification: ${type} for user ${userId}`);
          return null;
        }
      }

      // Create notification record
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          message,
          data,
          priority,
          is_read: false,
          is_dismissed: false,
          requires_action: config.requiresAction || false,
          allow_dismiss: config.allowDismiss !== false,
          expires_at: config.defaultExpiryHours ? expiresAt.toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create notification:', error);
        throw error;
      }

      // Analytics tracking
      if (this.config.enableAnalytics) {
        await this.trackNotificationEvent('created', notification);
      }

      // Cleanup old notifications if user exceeds limit
      await this.cleanupUserNotifications(userId);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      includeExpired?: boolean;
    } = {},
  ): Promise<NotificationRecord[]> {
    try {
      await this.initialize();

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Filter by read status
      if (options.unreadOnly) {
        query = query.eq('is_read', false).eq('is_dismissed', false);
      }

      // Filter out expired notifications unless explicitly requested
      if (!options.includeExpired) {
        query = query.or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());
      }

      // Pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || this.config.defaultBatchSize) - 1,
        );
      }

      const { data: notifications, error } = await query;

      if (error) {
        console.error('Failed to fetch notifications:', error);
        throw error;
      }

      return notifications || [];
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    try {
      await this.initialize();

      let query = supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      // Add user filter for security
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select().single();

      if (error) {
        console.error('Failed to mark notification as read:', error);
        return false;
      }

      // Analytics tracking
      if (this.config.enableAnalytics && data) {
        await this.trackNotificationEvent('read', data);
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark notification as dismissed
   */
  async dismiss(notificationId: string, userId?: string): Promise<boolean> {
    try {
      await this.initialize();

      let query = supabase
        .from('notifications')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      // Add user filter for security
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select().single();

      if (error) {
        console.error('Failed to dismiss notification:', error);
        return false;
      }

      // Analytics tracking
      if (this.config.enableAnalytics && data) {
        await this.trackNotificationEvent('dismissed', data);
      }

      return true;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      await this.initialize();

      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('id');

      if (error) {
        console.error('Failed to mark all notifications as read:', error);
        return 0;
      }

      const count = data?.length || 0;

      // Analytics tracking
      if (this.config.enableAnalytics && count > 0) {
        await this.trackNotificationEvent('bulk_read', { user_id: userId, count });
      }

      return count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      await this.initialize();

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_dismissed', false)
        .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());

      if (error) {
        console.error('Failed to get unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Clean up expired and excess notifications for a user
   */
  private async cleanupUserNotifications(userId: string): Promise<void> {
    try {
      // Remove expired notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('expires_at', new Date().toISOString());

      // Remove excess notifications (keep only the most recent ones)
      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (allNotifications && allNotifications.length > this.config.maxNotificationsPerUser) {
        const toDelete = allNotifications.slice(this.config.maxNotificationsPerUser);
        const idsToDelete = toDelete.map((n) => n.id);

        await supabase.from('notifications').delete().in('id', idsToDelete);
      }
    } catch (error) {
      console.error('Error cleaning up user notifications:', error);
    }
  }

  /**
   * Track notification events for analytics
   */
  private async trackNotificationEvent(event: string, notification: any): Promise<void> {
    try {
      // This could integrate with your analytics service
      // For now, we'll just log to console in development
      if (import.meta.env.DEV) {
        console.log(`Notification ${event}:`, {
          type: notification.type,
          userId: notification.user_id,
          notificationId: notification.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Future: Send to analytics service like Mixpanel, Amplitude, etc.
    } catch (error) {
      console.error('Error tracking notification event:', error);
    }
  }

  /**
   * Bulk create notifications (useful for system-wide announcements)
   */
  async createBulkNotifications(
    userIds: string[],
    type: NotificationType,
    message: string,
    data: NotificationData = {},
    options: {
      priority?: NotificationPriority;
      expiryHours?: number;
      batchSize?: number;
    } = {},
  ): Promise<number> {
    try {
      await this.initialize();

      const config = getNotificationConfig(type);
      const priority = options.priority || config.priority;
      const expiresAt = calculateExpiryDate(type, options.expiryHours);
      const batchSize = options.batchSize || 50;

      let totalCreated = 0;

      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        const notifications = batch.map((userId) => ({
          user_id: userId,
          type,
          message,
          data,
          priority,
          is_read: false,
          is_dismissed: false,
          requires_action: config.requiresAction || false,
          allow_dismiss: config.allowDismiss !== false,
          expires_at: config.defaultExpiryHours ? expiresAt.toISOString() : null,
        }));

        const { data, error } = await supabase
          .from('notifications')
          .insert(notifications)
          .select('id');

        if (error) {
          console.error(`Failed to create notification batch ${i / batchSize + 1}:`, error);
          continue;
        }

        totalCreated += data?.length || 0;
      }

      // Analytics tracking
      if (this.config.enableAnalytics) {
        await this.trackNotificationEvent('bulk_created', {
          type,
          count: totalCreated,
          total_users: userIds.length,
        });
      }

      return totalCreated;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export types and interfaces
export type { NotificationRecord, NotificationData, NotificationServiceConfig };
