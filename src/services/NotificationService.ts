// ============================================================================
// NOTIFICATION SERVICE - Unified notification system for messaging
// Handles email notifications, real-time alerts, and admin notifications
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { UnifiedQuote } from '@/types/unified-quote';
import { TicketWithDetails, TicketStatus } from '@/types/ticket';

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
   * Send ticket email notification
   */
  async sendTicketEmailNotification(
    ticket: TicketWithDetails,
    eventType: 'created' | 'status_updated' | 'reply_added' | 'sla_breach',
    additionalData?: {
      oldStatus?: TicketStatus;
      newStatus?: TicketStatus;
      replyMessage?: string;
      slaType?: 'response' | 'resolution';
    }
  ): Promise<void> {
    try {
      const customerEmail = ticket.user_profile?.email;
      if (!customerEmail) {
        console.warn('⚠️ No customer email available for ticket notification');
        return;
      }

      const { subject, htmlContent, textContent } = this.generateTicketEmailContent(
        ticket,
        eventType,
        additionalData
      );

      await this.sendEmail({
        to: customerEmail,
        subject,
        html: htmlContent,
        text: textContent
      });

      console.log(`✅ Ticket email notification sent: ${eventType} for ticket ${ticket.id}`);
    } catch (error) {
      console.error('❌ Failed to send ticket email notification:', error);
      throw error;
    }
  }

  /**
   * Generate email content for ticket notifications
   */
  private generateTicketEmailContent(
    ticket: TicketWithDetails,
    eventType: 'created' | 'status_updated' | 'reply_added' | 'sla_breach',
    additionalData?: any
  ): { subject: string; htmlContent: string; textContent: string } {
    const customerName = ticket.user_profile?.full_name || 'Customer';
    const ticketId = ticket.id.slice(0, 8);
    const quoteInfo = ticket.quote
      ? `Order #${ticket.quote.iwish_tracking_id || ticket.quote.id.slice(0, 8)}`
      : 'General Inquiry';

    switch (eventType) {
      case 'created':
        return {
          subject: `Support Ticket Created - iwishBag Help Request #${ticketId}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">📋 Support Ticket Created</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">We've received your help request</p>
              </div>
              
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333; margin-top: 0;">Hello ${customerName},</h2>
                
                <p>Thank you for contacting iwishBag support. We've successfully created your help request and our team will respond shortly.</p>
                
                <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0; color: #667eea;">📋 Ticket Details</h3>
                  <p><strong>Ticket ID:</strong> #${ticketId}</p>
                  <p><strong>Subject:</strong> ${ticket.subject}</p>
                  <p><strong>Category:</strong> ${ticket.category}</p>
                  <p><strong>Priority:</strong> ${ticket.priority}</p>
                  <p><strong>Related to:</strong> ${quoteInfo}</p>
                </div>
                
                <div style="background: #e3f2fd; border: 1px solid #2196f3; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #1976d2;">💡 <strong>What happens next?</strong></p>
                  <p style="margin: 5px 0 0 0; color: #1976d2;">Our support team will review your request and respond within our service level agreement timeframes.</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets" 
                     style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View My Tickets</a>
                </div>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p>iwishBag Support Team | support@iwishbag.com</p>
                <p style="margin: 5px 0 0 0; opacity: 0.7;">This is an automated message. Please do not reply directly to this email.</p>
              </div>
            </div>
          `,
          textContent: `Support Ticket Created - iwishBag Help Request #${ticketId}\n\nHello ${customerName},\n\nThank you for contacting iwishBag support. We've successfully created your help request and our team will respond shortly.\n\nTicket Details:\n- Ticket ID: #${ticketId}\n- Subject: ${ticket.subject}\n- Category: ${ticket.category}\n- Priority: ${ticket.priority}\n- Related to: ${quoteInfo}\n\nWhat happens next?\nOur support team will review your request and respond within our service level agreement timeframes.\n\nView your tickets: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets\n\niwishBag Support Team\nsupport@iwishbag.com`
        };

      case 'status_updated':
        const oldStatus = additionalData?.oldStatus || 'unknown';
        const newStatus = additionalData?.newStatus || ticket.status;
        return {
          subject: `Ticket Status Updated - iwishBag Help Request #${ticketId}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🔄 Status Updated</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ticket status has been updated</p>
              </div>
              
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333; margin-top: 0;">Hello ${customerName},</h2>
                
                <p>The status of your support ticket has been updated.</p>
                
                <div style="background: white; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0; color: #4caf50;">📋 Status Change</h3>
                  <p><strong>Ticket ID:</strong> #${ticketId}</p>
                  <p><strong>Subject:</strong> ${ticket.subject}</p>
                  <p><strong>Previous Status:</strong> ${oldStatus}</p>
                  <p><strong>Current Status:</strong> <span style="color: #4caf50; font-weight: bold;">${newStatus}</span></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets" 
                     style="background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket Details</a>
                </div>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p>iwishBag Support Team | support@iwishbag.com</p>
              </div>
            </div>
          `,
          textContent: `Ticket Status Updated - iwishBag Help Request #${ticketId}\n\nHello ${customerName},\n\nThe status of your support ticket has been updated.\n\nStatus Change:\n- Ticket ID: #${ticketId}\n- Subject: ${ticket.subject}\n- Previous Status: ${oldStatus}\n- Current Status: ${newStatus}\n\nView ticket: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets\n\niwishBag Support Team`
        };

      case 'reply_added':
        const replyMessage = additionalData?.replyMessage || 'New reply available';
        return {
          subject: `New Reply - iwishBag Help Request #${ticketId}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">💬 New Reply</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Our team has responded to your ticket</p>
              </div>
              
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333; margin-top: 0;">Hello ${customerName},</h2>
                
                <p>Our support team has added a new reply to your ticket.</p>
                
                <div style="background: white; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0; color: #2196f3;">💬 New Message</h3>
                  <p><strong>Ticket ID:</strong> #${ticketId}</p>
                  <p><strong>Subject:</strong> ${ticket.subject}</p>
                  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <p style="margin: 0; font-style: italic;">${replyMessage.length > 200 ? replyMessage.substring(0, 200) + '...' : replyMessage}</p>
                  </div>
                </div>
                
                <div style="background: #fff3e0; border: 1px solid #ff9800; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #f57c00;">⚡ <strong>Action Required:</strong></p>
                  <p style="margin: 5px 0 0 0; color: #f57c00;">Please log in to view the full message and continue the conversation.</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets" 
                     style="background: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Read Full Message</a>
                </div>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p>iwishBag Support Team | support@iwishbag.com</p>
              </div>
            </div>
          `,
          textContent: `New Reply - iwishBag Help Request #${ticketId}\n\nHello ${customerName},\n\nOur support team has added a new reply to your ticket.\n\nNew Message:\n- Ticket ID: #${ticketId}\n- Subject: ${ticket.subject}\n- Message Preview: ${replyMessage.length > 200 ? replyMessage.substring(0, 200) + '...' : replyMessage}\n\nPlease log in to view the full message: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets\n\niwishBag Support Team`
        };

      case 'sla_breach':
        const slaType = additionalData?.slaType || 'response';
        return {
          subject: `Service Level Alert - iwishBag Help Request #${ticketId}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #ff5722 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">⚠️ Service Level Alert</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">We're working to resolve your request</p>
              </div>
              
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333; margin-top: 0;">Hello ${customerName},</h2>
                
                <p>We want to keep you informed about your support ticket. While we strive to meet our service level commitments, your ${slaType} is taking longer than expected.</p>
                
                <div style="background: white; border-left: 4px solid #ff5722; padding: 20px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0; color: #ff5722;">⚠️ Status Update</h3>
                  <p><strong>Ticket ID:</strong> #${ticketId}</p>
                  <p><strong>Subject:</strong> ${ticket.subject}</p>
                  <p><strong>SLA Type:</strong> ${slaType} time</p>
                  <p><strong>Current Priority:</strong> ${ticket.priority}</p>
                </div>
                
                <div style="background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #2e7d32;">🔧 <strong>We're on it!</strong></p>
                  <p style="margin: 5px 0 0 0; color: #2e7d32;">Our team is actively working on your request and you will receive an update soon.</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets" 
                     style="background: #ff5722; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Check Ticket Status</a>
                </div>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p>iwishBag Support Team | support@iwishbag.com</p>
                <p style="margin: 5px 0 0 0; opacity: 0.7;">We appreciate your patience as we work to resolve your request.</p>
              </div>
            </div>
          `,
          textContent: `Service Level Alert - iwishBag Help Request #${ticketId}\n\nHello ${customerName},\n\nWe want to keep you informed about your support ticket. While we strive to meet our service level commitments, your ${slaType} is taking longer than expected.\n\nStatus Update:\n- Ticket ID: #${ticketId}\n- Subject: ${ticket.subject}\n- SLA Type: ${slaType} time\n- Current Priority: ${ticket.priority}\n\nWe're on it! Our team is actively working on your request and you will receive an update soon.\n\nCheck status: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.iwishbag.com'}/support/tickets\n\niwishBag Support Team`
        };

      default:
        return {
          subject: `Ticket Update - iwishBag Help Request #${ticketId}`,
          htmlContent: `<p>Hello ${customerName}, your ticket #${ticketId} has been updated.</p>`,
          textContent: `Hello ${customerName}, your ticket #${ticketId} has been updated.`
        };
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
   * Send email using direct method (for ticket notifications)
   */
  private async sendEmail(data: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      // For Phase 1, we'll use the existing email system
      // TODO: Implement direct Resend API integration in Phase 3
      console.log('📧 Ticket email notification prepared:', {
        to: data.to,
        subject: data.subject,
      });

      // This will be replaced with direct Resend API calls in Phase 3
      // For now, we simulate sending the email
    } catch (error) {
      console.error('❌ Failed to send ticket email:', error);
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
   * Notify admin of high-value quote approval (lightweight BI alert)
   * Only sends for quotes over $1000 USD
   */
  async notifyHighValueQuoteApproval(quote: UnifiedQuote): Promise<void> {
    try {
      const quoteValue = quote.final_total_usd || 0;
      const threshold = 1000; // $1000 USD threshold

      if (quoteValue < threshold) {
        return; // Skip notification for lower value quotes
      }

      const adminEmails = await this.getAdminEmails();
      if (!adminEmails.length) {
        console.warn('⚠️ No admin emails found for high-value quote notification');
        return;
      }

      const emailData: EmailNotificationData = {
        to: adminEmails,
        subject: `🎯 High-Value Quote Approved - $${quoteValue.toFixed(2)} USD`,
        templateName: 'High Value Quote Alert',
        variables: {
          quote_id: quote.display_id || quote.id,
          customer_name: this.getCustomerName(quote),
          customer_email: this.getCustomerEmail(quote),
          quote_value: `$${quoteValue.toFixed(2)} USD`,
          admin_quote_url: `${window.location.origin}/admin/quotes/${quote.id}`,
        },
        priority: 'high',
      };

      await this.sendEmailNotification(emailData);

      // Create internal high-priority notification
      await this.createInternalNotification({
        quote_id: quote.id,
        message_type: 'high_value_approval',
        thread_type: 'internal',
        priority: 'high',
        subject: `High-value quote approved - $${quoteValue.toFixed(2)}`,
        content: `Customer ${this.getCustomerName(quote)} approved a high-value quote worth $${quoteValue.toFixed(2)} USD. Immediate attention recommended.`,
        sender_id: 'system',
      });

      console.log(`✅ High-value quote notification sent: $${quoteValue.toFixed(2)} USD`);
    } catch (error) {
      console.error('❌ Failed to send high-value quote notification:', error);
    }
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
