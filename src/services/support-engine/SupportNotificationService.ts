/**
 * Support Notification Service
 * Handles ticket notifications and escalations for support system
 * Decomposed from UnifiedSupportEngine for better separation of concerns
 */

import { supabase } from '@/integrations/supabase/client';
import { notificationService } from '../NotificationService';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { TicketStatus, TicketPriority, TicketCategory, SupportRecord } from './SupportTicketService';

export interface NotificationPrefs {
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily';
  categories: TicketCategory[];
  escalation_notifications: boolean;
  priority_filters: TicketPriority[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationTemplateType;
  subject: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export type NotificationTemplateType = 
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_replied'
  | 'sla_warning'
  | 'sla_breach'
  | 'escalation'
  | 'resolution_confirmation';

export interface NotificationContext {
  ticket: SupportRecord;
  agent?: {
    id: string;
    name: string;
    email: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  additional_data?: any;
}

export interface NotificationResult {
  success: boolean;
  notification_id?: string;
  channels_sent: string[];
  failed_channels: string[];
  error?: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  conditions: {
    sla_breach_type: 'response' | 'resolution' | 'both';
    priority: TicketPriority[];
    category: TicketCategory[];
    time_threshold_minutes: number;
  };
  escalation_targets: {
    notify_manager: boolean;
    notify_team_lead: boolean;
    reassign_to?: string;
    escalate_priority: boolean;
  };
  is_active: boolean;
}

export class SupportNotificationService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Default notification templates
  private readonly DEFAULT_TEMPLATES: Record<NotificationTemplateType, Omit<NotificationTemplate, 'id' | 'created_at'>> = {
    ticket_created: {
      name: 'New Ticket Created',
      type: 'ticket_created',
      subject: 'New Support Ticket #{ticket_id}: {subject}',
      content: `Dear {customer_name},

Thank you for contacting our support team. We have received your ticket and it has been assigned ID #{ticket_id}.

Ticket Details:
- Subject: {subject}
- Priority: {priority}
- Category: {category}
- Created: {created_at}

Our team will respond within {response_sla} according to our service level agreement. You can track your ticket status at any time.

Best regards,
Support Team`,
      variables: ['ticket_id', 'subject', 'priority', 'category', 'created_at', 'customer_name', 'response_sla'],
      is_active: true,
    },
    ticket_assigned: {
      name: 'Ticket Assigned',
      type: 'ticket_assigned',
      subject: 'Ticket #{ticket_id} has been assigned to {agent_name}',
      content: `Hello {agent_name},

You have been assigned a new support ticket:

Ticket #{ticket_id}: {subject}
Priority: {priority}
Category: {category}
Customer: {customer_name}
Created: {created_at}

Please review and respond according to our SLA requirements.

You can access the ticket here: {ticket_url}

Best regards,
Support Management`,
      variables: ['ticket_id', 'subject', 'priority', 'category', 'agent_name', 'customer_name', 'created_at', 'ticket_url'],
      is_active: true,
    },
    ticket_status_changed: {
      name: 'Ticket Status Updated',
      type: 'ticket_status_changed',
      subject: 'Your ticket #{ticket_id} status has been updated',
      content: `Dear {customer_name},

Your support ticket #{ticket_id} status has been updated:

Previous Status: {old_status}
New Status: {new_status}
Updated by: {updated_by}
Update Time: {updated_at}

{status_message}

If you have any questions, please reply to this email or contact our support team.

Best regards,
Support Team`,
      variables: ['ticket_id', 'customer_name', 'old_status', 'new_status', 'updated_by', 'updated_at', 'status_message'],
      is_active: true,
    },
    ticket_replied: {
      name: 'New Reply on Ticket',
      type: 'ticket_replied',
      subject: 'New reply on your ticket #{ticket_id}',
      content: `Dear {customer_name},

{reply_author} has replied to your support ticket #{ticket_id}:

---
{reply_content}
---

Replied on: {reply_time}

Please reply if you need further assistance or if this resolves your issue.

Best regards,
Support Team`,
      variables: ['ticket_id', 'customer_name', 'reply_author', 'reply_content', 'reply_time'],
      is_active: true,
    },
    sla_warning: {
      name: 'SLA Warning',
      type: 'sla_warning',
      subject: 'SLA Warning: Ticket #{ticket_id} approaching deadline',
      content: `ATTENTION: SLA Warning for Ticket #{ticket_id}

The following ticket is approaching its SLA deadline:

Ticket: {subject}
Priority: {priority}
Customer: {customer_name}
Time Remaining: {time_remaining}
Assigned to: {assigned_agent}

Please take immediate action to meet SLA requirements.

Ticket Details: {ticket_url}`,
      variables: ['ticket_id', 'subject', 'priority', 'customer_name', 'time_remaining', 'assigned_agent', 'ticket_url'],
      is_active: true,
    },
    sla_breach: {
      name: 'SLA Breach Alert',
      type: 'sla_breach',
      subject: 'URGENT: SLA Breach on Ticket #{ticket_id}',
      content: `URGENT: SLA BREACH DETECTED

Ticket #{ticket_id} has breached its SLA:

Ticket: {subject}
Priority: {priority}
Customer: {customer_name}
Breach Type: {breach_type}
Breach Duration: {breach_duration}
Assigned to: {assigned_agent}

Immediate action required. Please escalate if necessary.

Ticket Details: {ticket_url}`,
      variables: ['ticket_id', 'subject', 'priority', 'customer_name', 'breach_type', 'breach_duration', 'assigned_agent', 'ticket_url'],
      is_active: true,
    },
    escalation: {
      name: 'Ticket Escalation',
      type: 'escalation',
      subject: 'Ticket #{ticket_id} has been escalated',
      content: `Ticket #{ticket_id} has been escalated to your attention:

Original Details:
- Subject: {subject}
- Priority: {priority} → {new_priority}
- Customer: {customer_name}
- Escalation Reason: {escalation_reason}
- Previous Agent: {previous_agent}

This ticket requires your immediate attention due to {escalation_trigger}.

Please review and take appropriate action.

Ticket Details: {ticket_url}`,
      variables: ['ticket_id', 'subject', 'priority', 'new_priority', 'customer_name', 'escalation_reason', 'previous_agent', 'escalation_trigger', 'ticket_url'],
      is_active: true,
    },
    resolution_confirmation: {
      name: 'Resolution Confirmation',
      type: 'resolution_confirmation',
      subject: 'Is your issue resolved? Ticket #{ticket_id}',
      content: `Dear {customer_name},

Your support ticket #{ticket_id} has been marked as resolved:

Issue: {subject}
Resolution: {resolution_summary}
Resolved by: {resolved_by}
Resolution Time: {resolution_time}

If your issue has been fully resolved, no further action is needed. This ticket will be automatically closed in 48 hours.

If you need additional assistance, please reply to this email within 48 hours and we'll reopen your ticket.

We value your feedback. Please rate your support experience: {feedback_url}

Best regards,
Support Team`,
      variables: ['ticket_id', 'customer_name', 'subject', 'resolution_summary', 'resolved_by', 'resolution_time', 'feedback_url'],
      is_active: true,
    },
  };

  constructor() {
    logger.info('SupportNotificationService initialized');
  }

  /**
   * Send ticket notification based on type and context
   */
  async sendTicketNotification(
    type: NotificationTemplateType,
    context: NotificationContext,
    customMessage?: string
  ): Promise<NotificationResult> {
    try {
      logger.info('Sending ticket notification:', { type, ticketId: context.ticket.id });

      // Get notification preferences
      const prefs = await this.getUserNotificationPreferences(context.ticket.user_id);
      if (!this.shouldSendNotification(type, context, prefs)) {
        return {
          success: true,
          channels_sent: [],
          failed_channels: [],
        };
      }

      // Get template
      const template = await this.getNotificationTemplate(type);
      if (!template) {
        throw new Error(`Template not found for type: ${type}`);
      }

      // Generate content
      const content = await this.generateNotificationContent(template, context, customMessage);
      
      // Determine recipients
      const recipients = await this.getNotificationRecipients(type, context);
      
      // Send notifications
      const results = await this.sendNotifications(content, recipients, prefs);

      logger.info('Notification sent successfully:', {
        type,
        ticketId: context.ticket.id,
        channelsSent: results.channels_sent.length,
        failedChannels: results.failed_channels.length,
      });

      return results;

    } catch (error) {
      logger.error('Notification sending error:', error);
      Sentry.captureException(error);
      return {
        success: false,
        channels_sent: [],
        failed_channels: ['all'],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SLA warning notification
   */
  async sendSLAWarning(
    ticketId: string,
    slaType: 'response' | 'resolution',
    timeRemaining: number
  ): Promise<NotificationResult> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found for SLA warning');
      }

      const context: NotificationContext = {
        ticket,
        additional_data: {
          sla_type: slaType,
          time_remaining: this.formatTimeRemaining(timeRemaining),
        },
      };

      return await this.sendTicketNotification('sla_warning', context);

    } catch (error) {
      logger.error('SLA warning notification error:', error);
      return {
        success: false,
        channels_sent: [],
        failed_channels: ['all'],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SLA breach notification
   */
  async sendSLABreach(
    ticketId: string,
    breachType: 'response' | 'resolution',
    breachDuration: number
  ): Promise<NotificationResult> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found for SLA breach');
      }

      const context: NotificationContext = {
        ticket,
        additional_data: {
          breach_type: breachType,
          breach_duration: this.formatBreachDuration(breachDuration),
        },
      };

      // Also trigger escalation if configured
      await this.checkEscalationRules(ticket, breachType);

      return await this.sendTicketNotification('sla_breach', context);

    } catch (error) {
      logger.error('SLA breach notification error:', error);
      return {
        success: false,
        channels_sent: [],
        failed_channels: ['all'],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(
    ticketId: string,
    escalationReason: string,
    escalatedTo: string
  ): Promise<NotificationResult> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found for escalation');
      }

      const context: NotificationContext = {
        ticket,
        additional_data: {
          escalation_reason: escalationReason,
          escalated_to: escalatedTo,
          escalation_trigger: 'SLA breach or manual escalation',
        },
      };

      return await this.sendTicketNotification('escalation', context);

    } catch (error) {
      logger.error('Escalation notification error:', error);
      return {
        success: false,
        channels_sent: [],
        failed_channels: ['all'],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check and trigger escalation rules
   */
  private async checkEscalationRules(
    ticket: SupportRecord,
    breachType: 'response' | 'resolution'
  ): Promise<void> {
    try {
      const rules = await this.getActiveEscalationRules();
      const ticketData = ticket.ticket_data;
      
      if (!ticketData) return;

      for (const rule of rules) {
        if (this.ruleMatches(rule, ticket, breachType)) {
          await this.executeEscalationRule(rule, ticket);
        }
      }

    } catch (error) {
      logger.error('Escalation rule check error:', error);
    }
  }

  /**
   * Execute escalation rule
   */
  private async executeEscalationRule(rule: EscalationRule, ticket: SupportRecord): Promise<void> {
    try {
      logger.info('Executing escalation rule:', { ruleId: rule.id, ticketId: ticket.id });

      if (rule.escalation_targets.notify_manager) {
        await this.notifyManager(ticket, rule.name);
      }

      if (rule.escalation_targets.notify_team_lead) {
        await this.notifyTeamLead(ticket, rule.name);
      }

      if (rule.escalation_targets.reassign_to) {
        await this.reassignTicket(ticket.id, rule.escalation_targets.reassign_to, `Escalated via rule: ${rule.name}`);
      }

      if (rule.escalation_targets.escalate_priority) {
        await this.escalatePriority(ticket.id);
      }

      // Log escalation action
      await this.logEscalationAction(ticket.id, rule.id, rule.name);

    } catch (error) {
      logger.error('Escalation rule execution error:', error);
    }
  }

  /**
   * Get notification template
   */
  private async getNotificationTemplate(type: NotificationTemplateType): Promise<NotificationTemplate | null> {
    try {
      const cacheKey = this.getCacheKey('template', { type });
      const cached = this.getFromCache<NotificationTemplate>(cacheKey);
      if (cached) return cached;

      // Try to get custom template from database
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        this.setCache(cacheKey, data);
        return data;
      }

      // Fall back to default template
      const defaultTemplate = this.DEFAULT_TEMPLATES[type];
      if (defaultTemplate) {
        const template: NotificationTemplate = {
          id: `default_${type}`,
          ...defaultTemplate,
          created_at: new Date().toISOString(),
        };
        this.setCache(cacheKey, template);
        return template;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get notification template:', error);
      return null;
    }
  }

  /**
   * Generate notification content from template
   */
  private async generateNotificationContent(
    template: NotificationTemplate,
    context: NotificationContext,
    customMessage?: string
  ): Promise<{ subject: string; content: string }> {
    try {
      let subject = template.subject;
      let content = customMessage || template.content;

      // Get template variables
      const variables = await this.getTemplateVariables(context);

      // Replace variables in subject and content
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        content = content.replace(new RegExp(placeholder, 'g'), String(value));
      }

      return { subject, content };

    } catch (error) {
      logger.error('Content generation error:', error);
      return { subject: template.subject, content: template.content };
    }
  }

  /**
   * Get template variables from context
   */
  private async getTemplateVariables(context: NotificationContext): Promise<Record<string, any>> {
    try {
      const ticket = context.ticket;
      const ticketData = ticket.ticket_data;

      const variables: Record<string, any> = {
        ticket_id: ticket.id,
        subject: ticketData?.subject || 'No subject',
        priority: ticketData?.priority || 'medium',
        category: ticketData?.category || 'general',
        created_at: this.formatDate(ticket.created_at),
        updated_at: this.formatDate(ticket.updated_at),
        status: ticketData?.status || 'open',
        customer_name: context.customer?.name || 'Valued Customer',
        customer_email: context.customer?.email || '',
        agent_name: context.agent?.name || 'Support Team',
        agent_email: context.agent?.email || '',
        ticket_url: this.generateTicketUrl(ticket.id),
        ...context.additional_data,
      };

      return variables;

    } catch (error) {
      logger.error('Template variables error:', error);
      return {};
    }
  }

  /**
   * Get notification recipients
   */
  private async getNotificationRecipients(
    type: NotificationTemplateType,
    context: NotificationContext
  ): Promise<Array<{ email: string; name?: string; role?: string }>> {
    try {
      const recipients: Array<{ email: string; name?: string; role?: string }> = [];

      // Customer notifications
      if (['ticket_created', 'ticket_status_changed', 'ticket_replied', 'resolution_confirmation'].includes(type)) {
        if (context.customer?.email) {
          recipients.push({
            email: context.customer.email,
            name: context.customer.name,
            role: 'customer',
          });
        }
      }

      // Agent notifications
      if (['ticket_assigned', 'sla_warning'].includes(type)) {
        if (context.agent?.email) {
          recipients.push({
            email: context.agent.email,
            name: context.agent.name,
            role: 'agent',
          });
        }
      }

      // Management notifications
      if (['sla_breach', 'escalation'].includes(type)) {
        const managers = await this.getManagerEmails();
        recipients.push(...managers);
      }

      return recipients;

    } catch (error) {
      logger.error('Failed to get notification recipients:', error);
      return [];
    }
  }

  /**
   * Send notifications through multiple channels
   */
  private async sendNotifications(
    content: { subject: string; content: string },
    recipients: Array<{ email: string; name?: string; role?: string }>,
    prefs: NotificationPrefs
  ): Promise<NotificationResult> {
    try {
      const channelsSent: string[] = [];
      const failedChannels: string[] = [];

      for (const recipient of recipients) {
        // Email notifications
        if (prefs.email_notifications) {
          try {
            await this.sendEmailNotification(recipient.email, content.subject, content.content);
            channelsSent.push(`email:${recipient.email}`);
          } catch (error) {
            logger.error('Email notification failed:', error);
            failedChannels.push(`email:${recipient.email}`);
          }
        }

        // In-app notifications
        if (prefs.in_app_notifications) {
          try {
            await this.sendInAppNotification(recipient.email, content.subject, content.content);
            channelsSent.push(`in-app:${recipient.email}`);
          } catch (error) {
            logger.error('In-app notification failed:', error);
            failedChannels.push(`in-app:${recipient.email}`);
          }
        }

        // SMS notifications (if enabled and phone available)
        if (prefs.sms_notifications) {
          try {
            const phone = await this.getUserPhone(recipient.email);
            if (phone) {
              await this.sendSMSNotification(phone, content.subject);
              channelsSent.push(`sms:${phone}`);
            }
          } catch (error) {
            logger.error('SMS notification failed:', error);
            failedChannels.push(`sms:${recipient.email}`);
          }
        }
      }

      return {
        success: channelsSent.length > 0 || recipients.length === 0,
        channels_sent: channelsSent,
        failed_channels: failedChannels,
      };

    } catch (error) {
      logger.error('Notifications sending error:', error);
      return {
        success: false,
        channels_sent: [],
        failed_channels: ['all'],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Utility methods
   */
  private async getTicketById(ticketId: string): Promise<SupportRecord | null> {
    try {
      const { data, error } = await supabase
        .from('support_system')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  private async getUserNotificationPreferences(userId: string): Promise<NotificationPrefs> {
    try {
      const cacheKey = this.getCacheKey('prefs', { userId });
      const cached = this.getFromCache<NotificationPrefs>(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('support_system')
        .select('notification_prefs')
        .eq('user_id', userId)
        .eq('system_type', 'preference')
        .single();

      if (!error && data?.notification_prefs) {
        this.setCache(cacheKey, data.notification_prefs);
        return data.notification_prefs;
      }

      // Default preferences
      const defaultPrefs: NotificationPrefs = {
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        notification_frequency: 'immediate',
        categories: ['general', 'payment', 'shipping', 'refund', 'product', 'customs'],
        escalation_notifications: true,
        priority_filters: ['low', 'medium', 'high', 'urgent'],
      };

      this.setCache(cacheKey, defaultPrefs);
      return defaultPrefs;

    } catch (error) {
      logger.error('Failed to get notification preferences:', error);
      return {
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        notification_frequency: 'immediate',
        categories: ['general', 'payment', 'shipping', 'refund', 'product', 'customs'],
        escalation_notifications: true,
        priority_filters: ['low', 'medium', 'high', 'urgent'],
      };
    }
  }

  private shouldSendNotification(
    type: NotificationTemplateType,
    context: NotificationContext,
    prefs: NotificationPrefs
  ): boolean {
    const ticketData = context.ticket.ticket_data;
    if (!ticketData) return false;

    // Check category filter
    if (!prefs.categories.includes(ticketData.category)) {
      return false;
    }

    // Check priority filter
    if (!prefs.priority_filters.includes(ticketData.priority)) {
      return false;
    }

    // Check escalation notifications
    if (type === 'escalation' && !prefs.escalation_notifications) {
      return false;
    }

    // Check frequency (would implement batching for non-immediate)
    if (prefs.notification_frequency !== 'immediate') {
      // TODO: Implement batching logic for hourly/daily notifications
    }

    return true;
  }

  private async sendEmailNotification(email: string, subject: string, content: string): Promise<void> {
    // Use existing notification service
    await notificationService.sendEmail({
      to: email,
      subject,
      html: content.replace(/\n/g, '<br>'),
      text: content,
    });
  }

  private async sendInAppNotification(userEmail: string, title: string, message: string): Promise<void> {
    // Would integrate with in-app notification system
    logger.info('In-app notification sent:', { userEmail, title });
  }

  private async sendSMSNotification(phone: string, message: string): Promise<void> {
    // Would integrate with SMS service
    logger.info('SMS notification sent:', { phone, message: message.substring(0, 50) });
  }

  private async getUserPhone(email: string): Promise<string | null> {
    // Would get user phone from profile
    return null;
  }

  private async getManagerEmails(): Promise<Array<{ email: string; name?: string; role?: string }>> {
    // Would get manager emails from database
    return [
      { email: 'manager@example.com', name: 'Support Manager', role: 'manager' }
    ];
  }

  private async getActiveEscalationRules(): Promise<EscalationRule[]> {
    // Mock rules - would fetch from database
    return [];
  }

  private ruleMatches(rule: EscalationRule, ticket: SupportRecord, breachType: 'response' | 'resolution'): boolean {
    const ticketData = ticket.ticket_data;
    if (!ticketData) return false;

    // Check breach type
    if (rule.conditions.sla_breach_type !== 'both' && rule.conditions.sla_breach_type !== breachType) {
      return false;
    }

    // Check priority
    if (rule.conditions.priority.length && !rule.conditions.priority.includes(ticketData.priority)) {
      return false;
    }

    // Check category
    if (rule.conditions.category.length && !rule.conditions.category.includes(ticketData.category)) {
      return false;
    }

    return true;
  }

  private async notifyManager(ticket: SupportRecord, ruleName: string): Promise<void> {
    logger.info('Manager notification triggered:', { ticketId: ticket.id, rule: ruleName });
  }

  private async notifyTeamLead(ticket: SupportRecord, ruleName: string): Promise<void> {
    logger.info('Team lead notification triggered:', { ticketId: ticket.id, rule: ruleName });
  }

  private async reassignTicket(ticketId: string, newAssigneeId: string, reason: string): Promise<void> {
    logger.info('Ticket reassignment triggered:', { ticketId, newAssigneeId, reason });
  }

  private async escalatePriority(ticketId: string): Promise<void> {
    logger.info('Priority escalation triggered:', { ticketId });
  }

  private async logEscalationAction(ticketId: string, ruleId: string, ruleName: string): Promise<void> {
    await supabase.from('support_analytics').insert({
      ticket_id: ticketId,
      metric_type: 'escalation',
      metric_data: {
        rule_id: ruleId,
        rule_name: ruleName,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  }

  private formatTimeRemaining(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hours${remainingMinutes > 0 ? ` ${remainingMinutes} minutes` : ''}`;
  }

  private formatBreachDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} hours ${minutes % 60} minutes`;
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  private generateTicketUrl(ticketId: string): string {
    return `${window.location.origin}/support/tickets/${ticketId}`;
  }

  /**
   * Cache management
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `notification_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('SupportNotificationService cleanup completed');
  }
}

export default SupportNotificationService;