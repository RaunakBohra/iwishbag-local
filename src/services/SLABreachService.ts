/**
 * SLA Breach Notification Service
 * Handles breach detection, notifications, and escalations
 */

import { supabase } from '@/integrations/supabase/client';

export interface BreachNotification {
  id: string;
  ticket_id: string;
  breach_type: 'response_warning' | 'response_breach' | 'resolution_warning' | 'resolution_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sent_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  notification_data: {
    breach_time?: string;
    warning_time?: string;
    deadline: string;
    ticket_age_hours?: number;
    time_remaining_hours?: number;
  };
  // Extended fields from join
  ticket_subject?: string;
  ticket_priority?: string;
  assigned_to_name?: string;
  customer_email?: string;
}

export interface BreachStats {
  total_unacknowledged: number;
  critical_breaches: number;
  high_priority_breaches: number;
  response_breaches: number;
  resolution_breaches: number;
  warnings: number;
  breaches_last_24h: number;
}

export class SLABreachService {
  private static instance: SLABreachService;

  private constructor() {}

  static getInstance(): SLABreachService {
    if (!SLABreachService.instance) {
      SLABreachService.instance = new SLABreachService();
    }
    return SLABreachService.instance;
  }

  /**
   * Run breach detection across all tickets
   */
  async detectBreaches(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('detect_sla_breaches');

      if (error) {
        console.error('❌ Error detecting SLA breaches:', error);
        return 0;
      }

      console.log(`✅ Breach detection completed: ${data} new breaches/warnings detected`);
      return data || 0;
    } catch (error) {
      console.error('❌ Exception during breach detection:', error);
      return 0;
    }
  }

  /**
   * Get all unacknowledged breach notifications
   */
  async getUnacknowledgedBreaches(): Promise<BreachNotification[]> {
    try {
      const { data, error } = await supabase.rpc('get_unacknowledged_breaches');

      if (error) {
        console.error('❌ Error fetching unacknowledged breaches:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching unacknowledged breaches:', error);
      return [];
    }
  }

  /**
   * Get breach notifications for specific ticket
   */
  async getTicketBreachNotifications(ticketId: string): Promise<BreachNotification[]> {
    try {
      const { data, error } = await supabase.rpc('get_ticket_breach_notifications', {
        ticket_uuid: ticketId,
      });

      if (error) {
        console.error('❌ Error fetching ticket breach notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching ticket breach notifications:', error);
      return [];
    }
  }

  /**
   * Acknowledge breach notification
   */
  async acknowledgeNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('acknowledge_breach_notification', {
        notification_id: notificationId,
        user_id: userId,
      });

      if (error) {
        console.error('❌ Error acknowledging breach notification:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('❌ Exception acknowledging breach notification:', error);
      return false;
    }
  }

  /**
   * Get breach statistics summary
   */
  async getBreachStats(): Promise<BreachStats> {
    try {
      const { data, error } = await supabase
        .from('breach_notifications')
        .select(
          `
          id,
          breach_type,
          severity,
          sent_at,
          acknowledged_at
        `,
        )
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (error) {
        console.error('❌ Error fetching breach stats:', error);
        return this.getEmptyStats();
      }

      const notifications = data || [];
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

      return {
        total_unacknowledged: notifications.filter((n) => !n.acknowledged_at).length,
        critical_breaches: notifications.filter(
          (n) => !n.acknowledged_at && n.severity === 'critical',
        ).length,
        high_priority_breaches: notifications.filter(
          (n) => !n.acknowledged_at && n.severity === 'high',
        ).length,
        response_breaches: notifications.filter(
          (n) => !n.acknowledged_at && n.breach_type.includes('response_breach'),
        ).length,
        resolution_breaches: notifications.filter(
          (n) => !n.acknowledged_at && n.breach_type.includes('resolution_breach'),
        ).length,
        warnings: notifications.filter(
          (n) => !n.acknowledged_at && n.breach_type.includes('warning'),
        ).length,
        breaches_last_24h: notifications.filter(
          (n) =>
            new Date(n.sent_at).getTime() > twentyFourHoursAgo &&
            (n.breach_type === 'response_breach' || n.breach_type === 'resolution_breach'),
        ).length,
      };
    } catch (error) {
      console.error('❌ Exception fetching breach stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Send breach notification emails
   * Note: This is a simplified version - email sending should be handled through React hooks
   */
  async sendBreachNotifications(notifications: BreachNotification[]): Promise<number> {
    console.log('📧 SLA Breach Notifications to send:', notifications.length);

    // For now, we'll log the notifications and mark them as "sent"
    // In a real implementation, this would integrate with the email system
    for (const notification of notifications) {
      console.log(`📧 Breach notification for ticket ${notification.ticket_id}:`, {
        type: notification.breach_type,
        severity: notification.severity,
        ticket: notification.ticket_subject,
      });

      // Update notification as sent (simplified)
      await supabase
        .from('breach_notifications')
        .update({
          notification_method: 'email',
          sent_to: [], // Would contain recipient IDs in real implementation
        })
        .eq('id', notification.id);
    }

    return notifications.length;
  }

  /**
   * Prepare breach notification data for email sending
   */
  async prepareNotificationData(notification: BreachNotification) {
    try {
      const templateKey = this.getEmailTemplate(notification.breach_type);
      const subject = this.getEmailSubject(notification);

      // Get ticket details for context
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select(
          `
          *,
          user_profile:user_id(full_name, email),
          assigned_to_profile:assigned_to(full_name, email)
        `,
        )
        .eq('id', notification.ticket_id)
        .single();

      if (!ticket) {
        console.error(`❌ Ticket not found: ${notification.ticket_id}`);
        return null;
      }

      // Determine recipients
      const recipients = await this.getNotificationRecipients(ticket, notification);

      return {
        templateKey,
        subject,
        ticket,
        recipients,
        variables: {
          recipientName: '', // Will be filled per recipient
          ticketSubject: ticket.subject,
          ticketId: ticket.id.slice(0, 8),
          priority: ticket.priority,
          customerName: ticket.user_profile?.full_name || ticket.user_profile?.email || 'Unknown',
          breachType: notification.breach_type,
          severity: notification.severity,
          deadline: new Date(notification.notification_data.deadline).toLocaleString(),
          timeInfo: this.formatTimeInfo(notification),
          ticketUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/admin/support-tickets`,
        },
      };
    } catch (error) {
      console.error('❌ Error preparing notification data:', error);
      return null;
    }
  }

  /**
   * Get email template key based on breach type
   */
  private getEmailTemplate(breachType: string): string {
    switch (breachType) {
      case 'response_breach':
        return 'sla_response_breach';
      case 'resolution_breach':
        return 'sla_resolution_breach';
      case 'response_warning':
        return 'sla_response_warning';
      case 'resolution_warning':
        return 'sla_resolution_warning';
      default:
        return 'sla_breach_generic';
    }
  }

  /**
   * Generate email subject based on breach type
   */
  private getEmailSubject(notification: BreachNotification): string {
    const severity = notification.severity === 'critical' ? '🚨 CRITICAL' : '⚠️';
    const type = notification.breach_type.includes('response') ? 'Response' : 'Resolution';
    const action = notification.breach_type.includes('breach') ? 'BREACH' : 'Warning';

    return `${severity} SLA ${type} ${action} - Ticket #${notification.ticket_id.slice(0, 8)}`;
  }

  /**
   * Get notification recipients based on ticket and breach type
   */
  private async getNotificationRecipients(ticket: any, notification: BreachNotification) {
    const recipients = [];

    // Always notify assigned user if exists
    if (ticket.assigned_to_profile) {
      recipients.push({
        id: ticket.assigned_to,
        email: ticket.assigned_to_profile.email,
        name: ticket.assigned_to_profile.full_name || ticket.assigned_to_profile.email,
      });
    }

    // For critical breaches, notify all admins
    if (notification.severity === 'critical') {
      const { data: admins } = await supabase
        .from('profiles')
        .select(
          `
          id,
          email,
          full_name,
          user_roles!inner (role)
        `,
        )
        .eq('user_roles.role', 'admin');

      if (admins) {
        admins.forEach((admin) => {
          if (!recipients.some((r) => r.id === admin.id)) {
            recipients.push({
              id: admin.id,
              email: admin.email,
              name: admin.full_name || admin.email,
            });
          }
        });
      }
    }

    return recipients;
  }

  /**
   * Format time information for notifications
   */
  private formatTimeInfo(notification: BreachNotification): string {
    const data = notification.notification_data;

    if (data.time_remaining_hours !== undefined) {
      return `${Math.floor(data.time_remaining_hours)} hours remaining`;
    }

    if (data.ticket_age_hours !== undefined) {
      return `Overdue by ${Math.floor(data.ticket_age_hours - 24)} hours`;
    }

    return 'Time information unavailable';
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats(): BreachStats {
    return {
      total_unacknowledged: 0,
      critical_breaches: 0,
      high_priority_breaches: 0,
      response_breaches: 0,
      resolution_breaches: 0,
      warnings: 0,
      breaches_last_24h: 0,
    };
  }

  /**
   * Get formatted breach type label
   */
  getBreachTypeLabel(type: string): string {
    switch (type) {
      case 'response_warning':
        return 'Response Warning';
      case 'response_breach':
        return 'Response Breach';
      case 'resolution_warning':
        return 'Resolution Warning';
      case 'resolution_breach':
        return 'Resolution Breach';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get severity color for UI
   */
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get severity icon for UI
   */
  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⏰';
      case 'low':
        return 'ℹ️';
      default:
        return '❓';
    }
  }
}

// Export singleton instance
export const slaBreachService = SLABreachService.getInstance();
