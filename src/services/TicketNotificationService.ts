/**
 * Ticket Notification Service
 * Handles email notifications for ticket lifecycle events
 */

import { supabase } from '@/integrations/supabase/client';
import { businessHoursService } from '@/config/businessHours';

export interface TicketNotificationData {
  id: string;
  subject: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  user_id: string;
  assigned_to?: string | null;
  quote_id?: string | null;
  created_at: string;
  updated_at: string;
  
  // Related data
  user_profile?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  assigned_to_profile?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  quote?: {
    id: string;
    iwish_tracking_id?: string;
  };
}

export interface ReplyNotificationData {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  
  // Related data
  user_profile?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export class TicketNotificationService {
  private static instance: TicketNotificationService;

  static getInstance(): TicketNotificationService {
    if (!TicketNotificationService.instance) {
      TicketNotificationService.instance = new TicketNotificationService();
    }
    return TicketNotificationService.instance;
  }

  /**
   * Get admin email addresses for notifications
   */
  private async getAdminEmails(): Promise<string[]> {
    try {
      const { data: adminRoles, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles(email, full_name)
        `)
        .eq('role', 'admin');

      if (error) {
        console.error('❌ Failed to fetch admin emails:', error);
        return ['admin@iwishbag.com']; // Fallback
      }

      const emails = adminRoles
        ?.map(role => (role.profiles as any)?.email)
        ?.filter(email => email && email.includes('@')) || [];

      return emails.length > 0 ? emails : ['admin@iwishbag.com'];
    } catch (error) {
      console.error('❌ Error fetching admin emails:', error);
      return ['admin@iwishbag.com'];
    }
  }

  /**
   * Get user-friendly status labels
   */
  private getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'open': 'Open',
      'in_progress': 'In Progress', 
      'resolved': 'Resolved',
      'closed': 'Closed',
    };
    return statusLabels[status] || status;
  }

  /**
   * Get user-friendly category labels
   */
  private getCategoryLabel(category: string): string {
    const categoryLabels: Record<string, string> = {
      'order_issue': 'Order Issue',
      'payment_issue': 'Payment Issue',
      'shipping_issue': 'Shipping Issue',
      'account_issue': 'Account Issue',
      'product_inquiry': 'Product Inquiry',
      'general_inquiry': 'General Inquiry',
      'technical_issue': 'Technical Issue',
    };
    return categoryLabels[category] || category;
  }

  /**
   * Send notification when a new ticket is created
   */
  async notifyTicketCreated(ticket: TicketNotificationData): Promise<void> {
    try {
      console.log(`📧 Sending ticket created notifications for ticket ${ticket.id}`);

      // Import the email hook dynamically to avoid circular dependencies
      const { useEmailNotifications } = await import('@/hooks/useEmailNotifications');
      const emailService = useEmailNotifications();

      const customerEmail = ticket.user_profile?.email;
      const customerName = ticket.user_profile?.full_name || ticket.user_profile?.email || 'Customer';

      // 1. Send confirmation email to customer
      if (customerEmail) {
        await emailService.sendTicketCreatedEmail({
          customerEmail,
          customerName,
          ticketId: ticket.id,
          subject: ticket.subject,
          category: this.getCategoryLabel(ticket.category),
        });

        console.log(`✅ Customer notification sent to ${customerEmail}`);
      }

      // 2. Send notification to admins
      const adminEmails = await this.getAdminEmails();
      const relatedOrderId = ticket.quote?.iwish_tracking_id || ticket.quote_id;

      for (const adminEmail of adminEmails) {
        await emailService.sendAdminNewTicketEmail({
          adminEmail,
          ticketId: ticket.id,
          subject: ticket.subject,
          customerName,
          category: this.getCategoryLabel(ticket.category),
          priority: ticket.priority,
          relatedOrderId: relatedOrderId || undefined,
        });
      }

      console.log(`✅ Admin notifications sent to ${adminEmails.length} admins`);

      // 3. Add auto-response message about business hours
      const autoResponse = businessHoursService.getAutoResponseMessage();
      await this.createSystemReply(ticket.id, autoResponse);

    } catch (error) {
      console.error('❌ Failed to send ticket created notifications:', error);
    }
  }

  /**
   * Send notification when ticket status is updated
   */
  async notifyTicketStatusUpdate(
    ticket: TicketNotificationData,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      // Only notify customer if status change is meaningful
      if (oldStatus === newStatus) return;

      console.log(`📧 Sending status update notification: ${oldStatus} → ${newStatus}`);

      const { useEmailNotifications } = await import('@/hooks/useEmailNotifications');
      const emailService = useEmailNotifications();

      const customerEmail = ticket.user_profile?.email;
      const customerName = ticket.user_profile?.full_name || ticket.user_profile?.email || 'Customer';

      if (customerEmail) {
        const assignedToName = ticket.assigned_to_profile?.full_name || 
                              ticket.assigned_to_profile?.email || 
                              undefined;

        await emailService.sendTicketStatusUpdateEmail({
          customerEmail,
          customerName,
          ticketId: ticket.id,
          subject: ticket.subject,
          status: this.getStatusLabel(newStatus),
          assignedTo: assignedToName,
        });

        console.log(`✅ Status update notification sent to ${customerEmail}`);
      }
    } catch (error) {
      console.error('❌ Failed to send status update notification:', error);
    }
  }

  /**
   * Send notification when a reply is added to a ticket
   */
  async notifyTicketReply(
    ticket: TicketNotificationData,
    reply: ReplyNotificationData,
    isCustomerReply: boolean
  ): Promise<void> {
    try {
      console.log(`📧 Sending reply notification for ticket ${ticket.id}`);

      const { useEmailNotifications } = await import('@/hooks/useEmailNotifications');
      const emailService = useEmailNotifications();

      if (isCustomerReply) {
        // Customer replied - notify admins
        const adminEmails = await this.getAdminEmails();
        const customerName = ticket.user_profile?.full_name || 
                           ticket.user_profile?.email || 
                           'Customer';
        const assignedToName = ticket.assigned_to_profile?.full_name || 
                              ticket.assigned_to_profile?.email;

        for (const adminEmail of adminEmails) {
          await emailService.sendAdminNewReplyEmail({
            adminEmail,
            ticketId: ticket.id,
            subject: ticket.subject,
            customerName,
            replyMessage: reply.message,
            assignedTo: assignedToName,
          });
        }

        console.log(`✅ Admin reply notifications sent to ${adminEmails.length} admins`);
      } else {
        // Admin replied - notify customer
        const customerEmail = ticket.user_profile?.email;
        const customerName = ticket.user_profile?.full_name || 
                           ticket.user_profile?.email || 
                           'Customer';

        if (customerEmail) {
          await emailService.sendTicketReplyEmail({
            customerEmail,
            customerName,
            ticketId: ticket.id,
            subject: ticket.subject,
            replyMessage: reply.message,
          });

          console.log(`✅ Customer reply notification sent to ${customerEmail}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to send reply notification:', error);
    }
  }

  /**
   * Send notification when a ticket is closed
   */
  async notifyTicketClosed(ticket: TicketNotificationData): Promise<void> {
    try {
      console.log(`📧 Sending ticket closed notification for ticket ${ticket.id}`);

      const { useEmailNotifications } = await import('@/hooks/useEmailNotifications');
      const emailService = useEmailNotifications();

      const customerEmail = ticket.user_profile?.email;
      const customerName = ticket.user_profile?.full_name || 
                         ticket.user_profile?.email || 
                         'Customer';

      if (customerEmail) {
        await emailService.sendTicketClosedEmail({
          customerEmail,
          customerName,
          ticketId: ticket.id,
          subject: ticket.subject,
        });

        console.log(`✅ Ticket closed notification sent to ${customerEmail}`);
      }
    } catch (error) {
      console.error('❌ Failed to send ticket closed notification:', error);
    }
  }

  /**
   * Create a system-generated reply (e.g., auto-responses)
   */
  private async createSystemReply(ticketId: string, message: string): Promise<void> {
    try {
      // Get system user ID (you might need to create a system user in your database)
      const systemUserId = '00000000-0000-0000-0000-000000000000'; // Replace with actual system user ID

      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: ticketId,
          user_id: systemUserId,
          message: message,
          is_internal: false, // Visible to customer
        });

      if (error) {
        console.error('❌ Failed to create system reply:', error);
      } else {
        console.log('✅ System auto-response added to ticket');
      }
    } catch (error) {
      console.error('❌ Error creating system reply:', error);
    }
  }

  /**
   * Batch send notifications (useful for admin operations)
   */
  async batchNotifyTicketUpdates(
    tickets: TicketNotificationData[],
    updateType: 'status_change' | 'assignment' | 'priority_change',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`📧 Sending batch notifications for ${tickets.length} tickets (${updateType})`);

      const promises = tickets.map(async (ticket) => {
        switch (updateType) {
          case 'status_change':
            if (metadata?.oldStatus && metadata?.newStatus) {
              return this.notifyTicketStatusUpdate(ticket, metadata.oldStatus, metadata.newStatus);
            }
            break;
          case 'assignment':
            // For assignment changes, send status update notification
            return this.notifyTicketStatusUpdate(ticket, ticket.status, ticket.status);
          default:
            console.log(`Batch notification type ${updateType} not implemented yet`);
        }
      });

      await Promise.allSettled(promises);
      console.log(`✅ Batch notifications completed for ${updateType}`);
    } catch (error) {
      console.error('❌ Failed to send batch notifications:', error);
    }
  }
}

// Export singleton instance
export const ticketNotificationService = TicketNotificationService.getInstance();