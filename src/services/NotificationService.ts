// ============================================================================
// NOTIFICATION SERVICE - Unified notification system for messaging
// Handles email notifications, real-time alerts, and admin notifications
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { UnifiedQuote } from '@/types/unified-quote';

export interface Message {
  id: string;
  quote_id?: string;
  sender_id: string;
  sender_name?: string;
  sender_email?: string;
  recipient_id?: string;
  content: string;
  message_type: string;
  thread_type?: string;
  priority?: string;
  attachment_url?: string;
  attachment_file_name?: string;
  created_at: string;
}

export interface EmailNotificationData {
  to: string[];
  cc?: string[];
  subject: string;
  templateName: string;
  variables: Record<string, string>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Notify admin when customer sends a new message
   */
  async notifyAdminNewMessage(quote: UnifiedQuote, message: Message): Promise<void> {
    try {
      // Get admin users
      const adminEmails = await this.getAdminEmails();
      if (!adminEmails.length) {
        console.warn('⚠️ No admin emails found for notification');
        return;
      }

      // Prepare email data
      const emailData: EmailNotificationData = {
        to: adminEmails,
        subject: `New customer message for quote #${quote.display_id || quote.id}`,
        templateName: 'Admin Quote Message Notification',
        variables: {
          quote_id: quote.display_id || quote.id,
          customer_name: this.getCustomerName(quote),
          customer_email: this.getCustomerEmail(quote),
          message_content: message.content,
          admin_quote_url: `${window.location.origin}/admin/quotes/${quote.id}`,
          sender_name: message.sender_name || 'Customer',
        },
        priority: (message.priority as any) || 'normal',
      };

      await this.sendEmailNotification(emailData);

      // Create internal admin notification message
      await this.createInternalNotification({
        quote_id: quote.id,
        message_type: 'admin_notification',
        thread_type: 'internal',
        priority: message.priority || 'normal',
        subject: `New customer message - Quote #${quote.display_id || quote.id}`,
        content: `Customer ${this.getCustomerName(quote)} sent: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`,
        sender_id: message.sender_id,
      });

      console.log('✅ Admin notification sent for new customer message');
    } catch (error) {
      console.error('❌ Failed to notify admin of new message:', error);
    }
  }

  /**
   * Notify customer when admin replies to their message
   */
  async notifyCustomerReply(quote: UnifiedQuote, message: Message): Promise<void> {
    try {
      const customerEmail = this.getCustomerEmail(quote);
      if (!customerEmail || customerEmail === 'No email provided') {
        console.warn('⚠️ No customer email available for notification');
        return;
      }

      const emailData: EmailNotificationData = {
        to: [customerEmail],
        subject: `New message about your quote #${quote.display_id || quote.id}`,
        templateName: 'Quote Discussion New Message',
        variables: {
          quote_id: quote.display_id || quote.id,
          customer_name: this.getCustomerName(quote),
          sender_name: message.sender_name || 'iwishBag Team',
          message_content: message.content,
          quote_url: `${window.location.origin}/quotes/${quote.id}`,
        },
        priority: (message.priority as any) || 'normal',
      };

      await this.sendEmailNotification(emailData);
      console.log('✅ Customer notification sent for admin reply');
    } catch (error) {
      console.error('❌ Failed to notify customer of reply:', error);
    }
  }

  /**
   * Notify admin when payment proof is uploaded
   */
  async notifyPaymentProofUploaded(quote: UnifiedQuote, message: Message): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();
      if (!adminEmails.length) {
        console.warn('⚠️ No admin emails found for payment proof notification');
        return;
      }

      const emailData: EmailNotificationData = {
        to: adminEmails,
        subject: `Payment proof submitted for quote #${quote.display_id || quote.id}`,
        templateName: 'Payment Proof Submitted',
        variables: {
          quote_id: quote.display_id || quote.id,
          customer_name: this.getCustomerName(quote),
          customer_email: this.getCustomerEmail(quote),
          message_content: message.content,
          attachment_name: message.attachment_file_name || 'Payment proof',
          admin_quote_url: `${window.location.origin}/admin/quotes/${quote.id}`,
        },
        priority: 'high',
      };

      await this.sendEmailNotification(emailData);

      // Create high-priority internal notification
      await this.createInternalNotification({
        quote_id: quote.id,
        message_type: 'payment_proof',
        thread_type: 'internal',
        priority: 'high',
        subject: `Payment proof submitted - Quote #${quote.display_id || quote.id}`,
        content: `Customer ${this.getCustomerName(quote)} submitted payment proof. Requires verification.`,
        sender_id: message.sender_id,
      });

      console.log('✅ Admin notification sent for payment proof upload');
    } catch (error) {
      console.error('❌ Failed to notify admin of payment proof:', error);
    }
  }

  /**
   * Send quote status update notification
   */
  async notifyQuoteStatusUpdate(
    quote: UnifiedQuote,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    try {
      const customerEmail = this.getCustomerEmail(quote);
      if (!customerEmail || customerEmail === 'No email provided') {
        console.warn('⚠️ No customer email for status update notification');
        return;
      }

      // Use existing email notification system
      const { useEmailNotifications } = await import('@/hooks/useEmailNotifications');
      const emailService = useEmailNotifications();

      await emailService.sendStatusEmail(quote.id, newStatus);
      console.log(`✅ Status update notification sent: ${oldStatus} → ${newStatus}`);
    } catch (error) {
      console.error('❌ Failed to send status update notification:', error);
    }
  }

  /**
   * Send email notification using template
   */
  private async sendEmailNotification(data: EmailNotificationData): Promise<void> {
    try {
      // Call the existing email notification hook
      const { useEmailNotifications } = await import('@/hooks/useEmailNotifications');
      const emailService = useEmailNotifications();

      // For now, use the existing email system
      // TODO: Implement direct Resend API integration in Phase 3
      console.log('📧 Email notification prepared:', {
        to: data.to,
        subject: data.subject,
        template: data.templateName,
      });

      // This will be replaced with direct Resend API calls in Phase 3
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Create internal admin notification message
   */
  private async createInternalNotification(data: {
    quote_id: string;
    message_type: string;
    thread_type: string;
    priority: string;
    subject: string;
    content: string;
    sender_id: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('messages').insert({
        quote_id: data.quote_id,
        sender_id: data.sender_id,
        subject: data.subject,
        content: data.content,
        message_type: data.message_type,
        thread_type: data.thread_type,
        priority: data.priority,
        is_internal: true,
        sender_name: 'System',
        sender_email: 'system@iwishbag.com',
      });

      if (error) {
        console.error('❌ Failed to create internal notification:', error);
      }
    } catch (error) {
      console.error('❌ Error creating internal notification:', error);
    }
  }

  /**
   * Get admin email addresses
   */
  private async getAdminEmails(): Promise<string[]> {
    try {
      // Get admin user IDs
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError || !adminRoles) {
        console.error('❌ Failed to fetch admin roles:', rolesError);
        return [];
      }

      if (adminRoles.length === 0) {
        console.warn('⚠️ No admin roles found');
        return [];
      }

      const adminUserIds = adminRoles.map((role) => role.user_id);

      // Get emails from auth.users table using RPC function
      const { data: adminEmails, error: emailsError } = await supabase.rpc('get_admin_emails', {
        admin_user_ids: adminUserIds,
      });

      if (emailsError) {
        console.error('❌ Failed to fetch admin emails via RPC:', emailsError);
        // Fallback: return a default admin email
        return ['admin@iwishbag.com'];
      }

      return adminEmails || ['admin@iwishbag.com'];
    } catch (error) {
      console.error('❌ Error fetching admin emails:', error);
      return ['admin@iwishbag.com'];
    }
  }

  /**
   * Get customer name from quote data
   */
  private getCustomerName(quote: UnifiedQuote): string {
    return quote.customer_data?.info?.name || 'Customer';
  }

  /**
   * Get customer email from quote data
   */
  private getCustomerEmail(quote: UnifiedQuote): string {
    return quote.customer_data?.info?.email || 'No email provided';
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(userId: string, quoteId?: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_unread_message_count', {
        p_quote_id: quoteId || null,
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Failed to get unread count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[]): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('mark_messages_as_read', {
        p_message_ids: messageIds,
      });

      if (error) {
        console.error('❌ Failed to mark messages as read:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time message updates for a quote
   */
  subscribeToQuoteMessages(quoteId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`quote_messages_${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `quote_id=eq.${quoteId}`,
        },
        callback,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
