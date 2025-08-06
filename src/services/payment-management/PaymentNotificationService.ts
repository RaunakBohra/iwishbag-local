/**
 * Payment Notification Service
 * Handles payment-related notifications, communications, and alerts
 * Extracted from UnifiedPaymentModal for clean communication management
 * 
 * RESPONSIBILITIES:
 * - Customer payment confirmations and receipts
 * - Admin payment alerts and notifications
 * - Payment failure and retry notifications
 * - Real-time payment status updates
 * - SMS, email, and in-app notifications
 * - Multi-language notification support
 * - Notification templates and personalization
 * - Communication preferences and opt-outs
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentNotification {
  id: string;
  type: NotificationType;
  recipient_type: RecipientType;
  recipient_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  title: string;
  message: string;
  template_id?: string;
  template_variables?: Record<string, any>;
  delivery_channels: DeliveryChannel[];
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduled_for?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export enum NotificationType {
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  PAYMENT_PENDING = 'payment_pending',
  REFUND_APPROVED = 'refund_approved',
  REFUND_REJECTED = 'refund_rejected',
  PROOF_UPLOADED = 'proof_uploaded',
  PROOF_VERIFIED = 'proof_verified',
  PAYMENT_LINK_CREATED = 'payment_link_created',
  PAYMENT_OVERDUE = 'payment_overdue',
  ADMIN_ALERT = 'admin_alert',
  SYSTEM_ALERT = 'system_alert'
}

export enum RecipientType {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

export enum DeliveryChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  content: string;
  channel: DeliveryChannel;
  language: string;
  variables: string[]; // Available template variables
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  customer_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  language: string;
  timezone: string;
  frequency_limits: {
    max_per_hour: number;
    max_per_day: number;
  };
  opt_out_types: NotificationType[];
  updated_at: string;
}

export interface SendNotificationRequest {
  type: NotificationType;
  recipient_type: RecipientType;
  recipient_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  channels?: DeliveryChannel[];
  priority?: NotificationPriority;
  template_variables?: Record<string, any>;
  scheduled_for?: string;
  custom_message?: {
    title: string;
    content: string;
  };
  metadata?: Record<string, any>;
}

export interface NotificationAnalytics {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  failure_rate: number;
  average_delivery_time: number;
  channel_performance: Record<DeliveryChannel, {
    sent: number;
    delivered: number;
    failed: number;
    delivery_rate: number;
  }>;
  type_breakdown: Record<NotificationType, number>;
  failure_reasons: Record<string, number>;
}

export class PaymentNotificationService {
  private static instance: PaymentNotificationService;
  private templateCache = new Map<string, { templates: NotificationTemplate[]; timestamp: number }>();
  private preferencesCache = new Map<string, { preferences: NotificationPreferences; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  // Default notification preferences
  private readonly defaultPreferences: NotificationPreferences = {
    customer_id: '',
    email_enabled: true,
    sms_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
    language: 'en',
    timezone: 'UTC',
    frequency_limits: {
      max_per_hour: 10,
      max_per_day: 50
    },
    opt_out_types: [],
    updated_at: new Date().toISOString()
  };

  constructor() {
    logger.info('PaymentNotificationService initialized');
  }

  static getInstance(): PaymentNotificationService {
    if (!PaymentNotificationService.instance) {
      PaymentNotificationService.instance = new PaymentNotificationService();
    }
    return PaymentNotificationService.instance;
  }

  /**
   * Send payment notification
   */
  async sendNotification(request: SendNotificationRequest): Promise<PaymentNotification> {
    try {
      logger.info('Sending payment notification:', { 
        type: request.type,
        recipient: request.recipient_id,
        channels: request.channels
      });

      // Get recipient preferences
      const preferences = request.recipient_type === RecipientType.CUSTOMER
        ? await this.getNotificationPreferences(request.recipient_id)
        : this.defaultPreferences;

      // Check if notification type is opted out
      if (preferences.opt_out_types.includes(request.type)) {
        throw new Error(`Customer opted out of ${request.type} notifications`);
      }

      // Check frequency limits
      const withinLimits = await this.checkFrequencyLimits(request.recipient_id, preferences);
      if (!withinLimits) {
        throw new Error('Notification frequency limit exceeded');
      }

      // Determine delivery channels
      const channels = this.determineDeliveryChannels(request, preferences);
      if (channels.length === 0) {
        throw new Error('No available delivery channels');
      }

      // Get appropriate template
      const template = await this.getNotificationTemplate(request.type, channels[0], preferences.language);
      
      // Prepare notification content
      const content = this.prepareNotificationContent(template, request);

      // Create notification record
      const notificationData = {
        type: request.type,
        recipient_type: request.recipient_type,
        recipient_id: request.recipient_id,
        recipient_email: request.recipient_email,
        recipient_phone: request.recipient_phone,
        title: content.title,
        message: content.message,
        template_id: template?.id,
        template_variables: request.template_variables,
        delivery_channels: channels,
        priority: request.priority || NotificationPriority.MEDIUM,
        status: NotificationStatus.PENDING,
        scheduled_for: request.scheduled_for,
        metadata: request.metadata,
        created_at: new Date().toISOString()
      };

      const { data: savedNotification, error } = await supabase
        .from('payment_notifications')
        .insert(notificationData)
        .select('*')
        .single();

      if (error) throw error;

      // Send through each channel
      if (!request.scheduled_for || new Date(request.scheduled_for) <= new Date()) {
        await this.deliverNotification(savedNotification, content);
      }

      logger.info('Payment notification created successfully:', savedNotification.id);
      return savedNotification;

    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation to customer
   */
  async sendPaymentConfirmation(
    customerId: string,
    customerEmail: string,
    paymentDetails: {
      amount: number;
      currency: string;
      payment_method: string;
      transaction_id: string;
      quote_id: string;
    }
  ): Promise<PaymentNotification> {
    return this.sendNotification({
      type: NotificationType.PAYMENT_CONFIRMATION,
      recipient_type: RecipientType.CUSTOMER,
      recipient_id: customerId,
      recipient_email: customerEmail,
      priority: NotificationPriority.HIGH,
      template_variables: paymentDetails,
      metadata: { quote_id: paymentDetails.quote_id }
    });
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(
    customerId: string,
    customerEmail: string,
    failureDetails: {
      amount: number;
      currency: string;
      payment_method: string;
      failure_reason: string;
      quote_id: string;
      retry_url?: string;
    }
  ): Promise<PaymentNotification> {
    return this.sendNotification({
      type: NotificationType.PAYMENT_FAILED,
      recipient_type: RecipientType.CUSTOMER,
      recipient_id: customerId,
      recipient_email: customerEmail,
      priority: NotificationPriority.HIGH,
      template_variables: failureDetails,
      metadata: { quote_id: failureDetails.quote_id }
    });
  }

  /**
   * Send admin alert for high-value payment
   */
  async sendAdminAlert(
    alertType: 'high_value_payment' | 'suspicious_activity' | 'payment_failure',
    alertDetails: {
      customer_id?: string;
      amount?: number;
      currency?: string;
      quote_id?: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<PaymentNotification[]> {
    try {
      // Get admin recipients
      const adminRecipients = await this.getAdminRecipients();

      const notifications: PaymentNotification[] = [];

      for (const admin of adminRecipients) {
        const notification = await this.sendNotification({
          type: NotificationType.ADMIN_ALERT,
          recipient_type: RecipientType.ADMIN,
          recipient_id: admin.id,
          recipient_email: admin.email,
          priority: this.mapSeverityToPriority(alertDetails.severity),
          template_variables: alertDetails,
          metadata: { 
            alert_type: alertType,
            quote_id: alertDetails.quote_id 
          }
        });

        notifications.push(notification);
      }

      return notifications;

    } catch (error) {
      logger.error('Failed to send admin alerts:', error);
      throw error;
    }
  }

  /**
   * Send refund notification
   */
  async sendRefundNotification(
    customerId: string,
    customerEmail: string,
    refundDetails: {
      amount: number;
      currency: string;
      refund_id: string;
      quote_id: string;
      status: 'approved' | 'rejected' | 'completed';
      reason?: string;
      processing_time?: string;
    }
  ): Promise<PaymentNotification> {
    const notificationType = refundDetails.status === 'approved' 
      ? NotificationType.REFUND_APPROVED
      : refundDetails.status === 'rejected'
      ? NotificationType.REFUND_REJECTED
      : NotificationType.PAYMENT_REFUNDED;

    return this.sendNotification({
      type: notificationType,
      recipient_type: RecipientType.CUSTOMER,
      recipient_id: customerId,
      recipient_email: customerEmail,
      priority: NotificationPriority.MEDIUM,
      template_variables: refundDetails,
      metadata: { 
        quote_id: refundDetails.quote_id,
        refund_id: refundDetails.refund_id 
      }
    });
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    recipientId: string,
    filters?: {
      type?: NotificationType;
      status?: NotificationStatus;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaymentNotification[]> {
    try {
      let query = supabase
        .from('payment_notifications')
        .select('*')
        .eq('recipient_id', recipientId);

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
      }

      // Order by most recent first
      query = query.order('created_at', { ascending: false });

      const { data: notifications, error } = await query;

      if (error) throw error;

      return notifications || [];

    } catch (error) {
      logger.error('Failed to get notification history:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    customerId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const updateData = {
        ...preferences,
        customer_id: customerId,
        updated_at: new Date().toISOString()
      };

      const { data: updatedPreferences, error } = await supabase
        .from('notification_preferences')
        .upsert(updateData)
        .select('*')
        .single();

      if (error) throw error;

      // Clear cache
      this.preferencesCache.delete(customerId);

      logger.info('Notification preferences updated:', customerId);
      return updatedPreferences;

    } catch (error) {
      logger.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(dateFrom: string, dateTo: string): Promise<NotificationAnalytics> {
    try {
      const { data: notifications, error } = await supabase
        .from('payment_notifications')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      const analytics = this.calculateNotificationAnalytics(notifications || []);
      logger.info('Notification analytics calculated for date range');

      return analytics;

    } catch (error) {
      logger.error('Failed to get notification analytics:', error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const { data: scheduledNotifications, error } = await supabase
        .from('payment_notifications')
        .select('*')
        .eq('status', NotificationStatus.PENDING)
        .not('scheduled_for', 'is', null)
        .lte('scheduled_for', new Date().toISOString());

      if (error) throw error;

      for (const notification of scheduledNotifications || []) {
        try {
          await this.deliverNotification(notification, {
            title: notification.title,
            message: notification.message
          });
        } catch (deliveryError) {
          logger.error('Failed to deliver scheduled notification:', deliveryError);
        }
      }

    } catch (error) {
      logger.error('Failed to process scheduled notifications:', error);
    }
  }

  /**
   * Private helper methods
   */
  private async getNotificationPreferences(customerId: string): Promise<NotificationPreferences> {
    try {
      // Check cache first
      const cached = this.preferencesCache.get(customerId);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.preferences;
      }

      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      const finalPreferences = preferences || { ...this.defaultPreferences, customer_id: customerId };

      // Cache the preferences
      this.preferencesCache.set(customerId, {
        preferences: finalPreferences,
        timestamp: Date.now()
      });

      return finalPreferences;

    } catch (error) {
      logger.error('Failed to get notification preferences:', error);
      return { ...this.defaultPreferences, customer_id: customerId };
    }
  }

  private async getNotificationTemplate(
    type: NotificationType,
    channel: DeliveryChannel,
    language: string = 'en'
  ): Promise<NotificationTemplate | null> {
    try {
      // Check cache first
      const cacheKey = `${type}-${channel}-${language}`;
      const cached = this.templateCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.templates[0] || null;
      }

      const { data: templates, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('channel', channel)
        .eq('language', language)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;

      const template = templates?.[0] || null;

      // Cache the result
      this.templateCache.set(cacheKey, {
        templates: template ? [template] : [],
        timestamp: Date.now()
      });

      return template;

    } catch (error) {
      logger.error('Failed to get notification template:', error);
      return null;
    }
  }

  private prepareNotificationContent(
    template: NotificationTemplate | null,
    request: SendNotificationRequest
  ): { title: string; message: string } {
    if (request.custom_message) {
      return {
        title: request.custom_message.title,
        message: request.custom_message.content
      };
    }

    if (!template) {
      return {
        title: `Payment ${request.type.replace('_', ' ')}`,
        message: `Payment notification: ${request.type}`
      };
    }

    // Replace template variables
    let title = template.subject;
    let message = template.content;

    if (request.template_variables) {
      Object.entries(request.template_variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), String(value));
        message = message.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }

    return { title, message };
  }

  private determineDeliveryChannels(
    request: SendNotificationRequest,
    preferences: NotificationPreferences
  ): DeliveryChannel[] {
    const channels: DeliveryChannel[] = [];

    // Use requested channels if specified
    if (request.channels && request.channels.length > 0) {
      return request.channels.filter(channel => {
        switch (channel) {
          case DeliveryChannel.EMAIL:
            return preferences.email_enabled && request.recipient_email;
          case DeliveryChannel.SMS:
            return preferences.sms_enabled && request.recipient_phone;
          case DeliveryChannel.IN_APP:
          case DeliveryChannel.PUSH:
            return preferences[`${channel.toLowerCase()}_enabled` as keyof NotificationPreferences] as boolean;
          default:
            return true;
        }
      });
    }

    // Auto-determine based on preferences and available data
    if (preferences.email_enabled && request.recipient_email) {
      channels.push(DeliveryChannel.EMAIL);
    }

    if (preferences.sms_enabled && request.recipient_phone) {
      channels.push(DeliveryChannel.SMS);
    }

    if (preferences.in_app_enabled) {
      channels.push(DeliveryChannel.IN_APP);
    }

    if (preferences.push_enabled) {
      channels.push(DeliveryChannel.PUSH);
    }

    return channels;
  }

  private async checkFrequencyLimits(
    recipientId: string,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Check hourly limit
      const { count: hourlyCount, error: hourlyError } = await supabase
        .from('payment_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', recipientId)
        .gte('created_at', hourAgo);

      if (hourlyError) throw hourlyError;

      if ((hourlyCount || 0) >= preferences.frequency_limits.max_per_hour) {
        return false;
      }

      // Check daily limit
      const { count: dailyCount, error: dailyError } = await supabase
        .from('payment_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', recipientId)
        .gte('created_at', dayAgo);

      if (dailyError) throw dailyError;

      if ((dailyCount || 0) >= preferences.frequency_limits.max_per_day) {
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Failed to check frequency limits:', error);
      return true; // Allow on error to prevent blocking notifications
    }
  }

  private async deliverNotification(
    notification: PaymentNotification,
    content: { title: string; message: string }
  ): Promise<void> {
    try {
      const deliveryPromises = notification.delivery_channels.map(channel =>
        this.deliverToChannel(notification, content, channel)
      );

      const results = await Promise.allSettled(deliveryPromises);
      
      // Check if any delivery succeeded
      const hasSuccess = results.some(result => result.status === 'fulfilled');
      const failures = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);

      // Update notification status
      const status = hasSuccess ? NotificationStatus.SENT : NotificationStatus.FAILED;
      const updateData: any = {
        status,
        sent_at: hasSuccess ? new Date().toISOString() : undefined,
        failed_at: !hasSuccess ? new Date().toISOString() : undefined,
        failure_reason: !hasSuccess ? failures.join(', ') : undefined,
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('payment_notifications')
        .update(updateData)
        .eq('id', notification.id);

      if (hasSuccess) {
        logger.info('Notification delivered successfully:', notification.id);
      } else {
        logger.error('Notification delivery failed:', { id: notification.id, failures });
      }

    } catch (error) {
      logger.error('Failed to deliver notification:', error);
    }
  }

  private async deliverToChannel(
    notification: PaymentNotification,
    content: { title: string; message: string },
    channel: DeliveryChannel
  ): Promise<void> {
    switch (channel) {
      case DeliveryChannel.EMAIL:
        return this.sendEmail(notification, content);
      case DeliveryChannel.SMS:
        return this.sendSMS(notification, content);
      case DeliveryChannel.IN_APP:
        return this.sendInAppNotification(notification, content);
      case DeliveryChannel.PUSH:
        return this.sendPushNotification(notification, content);
      case DeliveryChannel.WEBHOOK:
        return this.sendWebhookNotification(notification, content);
      default:
        throw new Error(`Unsupported delivery channel: ${channel}`);
    }
  }

  private async sendEmail(
    notification: PaymentNotification,
    content: { title: string; message: string }
  ): Promise<void> {
    // Mock email sending
    logger.info('Sending email notification:', { 
      to: notification.recipient_email,
      subject: content.title
    });
    
    // TODO: Integrate with actual email service
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async sendSMS(
    notification: PaymentNotification,
    content: { title: string; message: string }
  ): Promise<void> {
    // Mock SMS sending
    logger.info('Sending SMS notification:', { 
      to: notification.recipient_phone,
      message: content.message
    });
    
    // TODO: Integrate with actual SMS service
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async sendInAppNotification(
    notification: PaymentNotification,
    content: { title: string; message: string }
  ): Promise<void> {
    // Store in-app notification
    await supabase
      .from('in_app_notifications')
      .insert({
        user_id: notification.recipient_id,
        title: content.title,
        message: content.message,
        type: notification.type,
        is_read: false,
        created_at: new Date().toISOString()
      });

    logger.info('In-app notification stored:', notification.recipient_id);
  }

  private async sendPushNotification(
    notification: PaymentNotification,
    content: { title: string; message: string }
  ): Promise<void> {
    // Mock push notification
    logger.info('Sending push notification:', { 
      to: notification.recipient_id,
      title: content.title
    });
    
    // TODO: Integrate with push notification service
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private async sendWebhookNotification(
    notification: PaymentNotification,
    content: { title: string; message: string }
  ): Promise<void> {
    // Mock webhook sending
    logger.info('Sending webhook notification:', { 
      notification_id: notification.id,
      type: notification.type
    });
    
    // TODO: Integrate with webhook service
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  private async getAdminRecipients(): Promise<Array<{ id: string; email: string }>> {
    try {
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (error) throw error;

      return admins || [];

    } catch (error) {
      logger.error('Failed to get admin recipients:', error);
      return [];
    }
  }

  private mapSeverityToPriority(severity: string): NotificationPriority {
    switch (severity) {
      case 'critical': return NotificationPriority.URGENT;
      case 'high': return NotificationPriority.HIGH;
      case 'medium': return NotificationPriority.MEDIUM;
      case 'low': return NotificationPriority.LOW;
      default: return NotificationPriority.MEDIUM;
    }
  }

  private calculateNotificationAnalytics(notifications: any[]): NotificationAnalytics {
    const totalSent = notifications.filter(n => n.status === NotificationStatus.SENT).length;
    const totalDelivered = notifications.filter(n => n.status === NotificationStatus.DELIVERED).length;
    const totalFailed = notifications.filter(n => n.status === NotificationStatus.FAILED).length;
    
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const failureRate = notifications.length > 0 ? (totalFailed / notifications.length) * 100 : 0;

    // Calculate average delivery time
    const deliveredNotifications = notifications.filter(n => n.sent_at && n.delivered_at);
    const averageDeliveryTime = deliveredNotifications.length > 0
      ? deliveredNotifications.reduce((sum, n) => {
          const sent = new Date(n.sent_at).getTime();
          const delivered = new Date(n.delivered_at).getTime();
          return sum + (delivered - sent);
        }, 0) / deliveredNotifications.length / 1000 // Convert to seconds
      : 0;

    // Channel performance
    const channelPerformance: Record<DeliveryChannel, any> = {} as any;
    Object.values(DeliveryChannel).forEach(channel => {
      const channelNotifications = notifications.filter(n => 
        n.delivery_channels && n.delivery_channels.includes(channel)
      );
      
      const channelSent = channelNotifications.filter(n => n.status === NotificationStatus.SENT).length;
      const channelDelivered = channelNotifications.filter(n => n.status === NotificationStatus.DELIVERED).length;
      const channelFailed = channelNotifications.filter(n => n.status === NotificationStatus.FAILED).length;
      
      channelPerformance[channel] = {
        sent: channelSent,
        delivered: channelDelivered,
        failed: channelFailed,
        delivery_rate: channelSent > 0 ? (channelDelivered / channelSent) * 100 : 0
      };
    });

    // Type breakdown
    const typeBreakdown: Record<NotificationType, number> = {} as any;
    Object.values(NotificationType).forEach(type => {
      typeBreakdown[type] = notifications.filter(n => n.type === type).length;
    });

    // Failure reasons
    const failureReasons: Record<string, number> = {};
    notifications
      .filter(n => n.status === NotificationStatus.FAILED && n.failure_reason)
      .forEach(n => {
        failureReasons[n.failure_reason] = (failureReasons[n.failure_reason] || 0) + 1;
      });

    return {
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_failed: totalFailed,
      delivery_rate: deliveryRate,
      failure_rate: failureRate,
      average_delivery_time: averageDeliveryTime,
      channel_performance: channelPerformance,
      type_breakdown: typeBreakdown,
      failure_reasons: failureReasons
    };
  }

  /**
   * Public utility methods
   */
  clearAllCache(): void {
    this.templateCache.clear();
    this.preferencesCache.clear();
    logger.info('Payment notification cache cleared');
  }

  dispose(): void {
    this.templateCache.clear();
    this.preferencesCache.clear();
    logger.info('PaymentNotificationService disposed');
  }
}

export default PaymentNotificationService;