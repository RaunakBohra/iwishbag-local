// ============================================================================
// UNIFIED SUPPORT ENGINE - Complete Support System Management
// Replaces: TicketService, SLAService, AutoAssignmentService, TicketNotificationService
// Unified approach following UnifiedDataEngine pattern
// ============================================================================

import { supabase } from '../integrations/supabase/client';
import { notificationService, NotificationService } from './NotificationService';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';

// ============================================================================
// Type Definitions
// ============================================================================

export type SupportSystemType = 'ticket' | 'rule' | 'template' | 'preference';
export type InteractionType = 'reply' | 'status_change' | 'assignment' | 'escalation' | 'note';

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'payment' | 'shipping' | 'refund' | 'product' | 'customs';

export interface TicketData {
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assigned_to?: string;
  metadata?: {
    first_response_at?: string;
    resolution_time?: number;
    customer_satisfaction?: number;
    created_at?: string;
    source?: string;
    last_status_change?: string;
  };
}

export interface SLAData {
  response_sla: {
    target_minutes: number;
    first_response_at?: string;
    is_breached: boolean;
    breach_duration?: number;
  };
  resolution_sla: {
    target_hours: number;
    resolved_at?: string;
    is_breached: boolean;
    breach_duration?: number;
  };
  escalation?: {
    escalated_at?: string;
    escalated_to?: string;
    reason?: string;
  };
}

export interface AssignmentData {
  rule_name: string;
  conditions: {
    category?: TicketCategory[];
    priority?: TicketPriority[];
    keywords?: string[];
    business_hours_only?: boolean;
  };
  assignment: {
    assignee_id?: string;
    team?: string;
  };
  is_active: boolean;
}

export interface NotificationPrefs {
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily';
  categories: TicketCategory[];
  escalation_notifications: boolean;
}

export interface TemplateData {
  name: string;
  subject?: string;
  content: string;
  category: TicketCategory;
  variables: string[];
  is_active: boolean;
  usage_count: number;
}

export interface SupportRecord {
  id: string;
  user_id: string;
  quote_id?: string;
  system_type: SupportSystemType;
  ticket_data?: TicketData;
  assignment_data?: AssignmentData;
  sla_data?: SLAData;
  notification_prefs?: NotificationPrefs;
  template_data?: TemplateData;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportInteraction {
  id: string;
  support_id: string;
  user_id: string;
  interaction_type: InteractionType;
  content: any;
  metadata?: any;
  created_at: string;
  is_internal: boolean;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  quote_id?: string;
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assigned_to?: string;
  user_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// UNIFIED SUPPORT ENGINE - Singleton Service
// ============================================================================

class UnifiedSupportEngine {
  private static instance: UnifiedSupportEngine;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Status transition validation rules
  private readonly STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    open: ['in_progress', 'pending', 'resolved'],
    in_progress: ['pending', 'resolved', 'open', 'closed'], // Allow direct closure for admin efficiency
    pending: ['in_progress', 'open', 'closed'],
    resolved: ['closed', 'open'], // Allow reopening if needed
    closed: ['open'], // Allow reopening closed tickets for admin flexibility
  };

  private constructor() {
    console.log('🎫 UnifiedSupportEngine initialized');
  }

  static getInstance(): UnifiedSupportEngine {
    if (!UnifiedSupportEngine.instance) {
      UnifiedSupportEngine.instance = new UnifiedSupportEngine();
    }
    return UnifiedSupportEngine.instance;
  }

  // ============================================================================
  // Status Transition Validation
  // ============================================================================

  /**
   * Validate if a status transition is allowed
   */
  private isValidTransition(currentStatus: TicketStatus, newStatus: TicketStatus): boolean {
    const allowedTransitions = this.STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get allowed transitions for a given status
   */
  getAllowedTransitions(currentStatus: TicketStatus): TicketStatus[] {
    return this.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Get smart status suggestions based on current status and context
   */
  getStatusSuggestions(
    currentStatus: TicketStatus,
    isAdmin: boolean = true,
  ): {
    suggested: TicketStatus | null;
    reason: string;
    all: TicketStatus[];
  } {
    const allowedTransitions = this.getAllowedTransitions(currentStatus);

    // Smart suggestions based on current status and user role
    let suggested: TicketStatus | null = null;
    let reason = '';

    if (!isAdmin) {
      // Customers can't change status - they rely on automatic transitions
      return {
        suggested: null,
        reason: 'Status changes automatically based on ticket activity',
        all: [],
      };
    }

    switch (currentStatus) {
      case 'open':
        suggested = 'in_progress';
        reason = 'Start working on this ticket';
        break;
      case 'in_progress':
        suggested = 'pending';
        reason = 'Need more information from customer?';
        break;
      case 'pending':
        suggested = 'in_progress';
        reason = 'Continue working after customer response';
        break;
      case 'resolved':
        suggested = 'closed';
        reason = 'Close ticket if customer is satisfied';
        break;
      case 'closed':
        suggested = null;
        reason = 'Ticket is closed';
        break;
    }

    return {
      suggested,
      reason,
      all: allowedTransitions,
    };
  }

  /**
   * Get valid status options for dropdown UI with labels and metadata
   */
  getValidStatusOptionsForDropdown(
    currentStatus: TicketStatus,
    isAdmin: boolean = true,
  ): Array<{
    value: TicketStatus;
    label: string;
    description: string;
    isSuggested: boolean;
    iconColor: string;
  }> {
    if (!isAdmin) {
      return []; // Customers don't change status
    }

    const allowedTransitions = this.getAllowedTransitions(currentStatus);
    const suggestions = this.getStatusSuggestions(currentStatus, isAdmin);

    // Status metadata for UI
    const statusMetadata: Record<TicketStatus, { label: string; description: string; iconColor: string }> = {
      open: {
        label: 'Open',
        description: 'Ready for work to begin',
        iconColor: 'text-blue-600',
      },
      in_progress: {
        label: 'In Progress',
        description: 'Currently being worked on',
        iconColor: 'text-yellow-600',
      },
      pending: {
        label: 'Awaiting Customer Reply',
        description: 'Waiting for customer response',
        iconColor: 'text-orange-600',
      },
      resolved: {
        label: 'Resolved',
        description: 'Issue has been fixed',
        iconColor: 'text-green-600',
      },
      closed: {
        label: 'Closed',
        description: 'Ticket completed',
        iconColor: 'text-gray-600',
      },
    };

    return allowedTransitions.map((status) => ({
      value: status,
      label: statusMetadata[status].label,
      description: statusMetadata[status].description,
      isSuggested: status === suggestions.suggested,
      iconColor: statusMetadata[status].iconColor,
    }));
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private getCacheKey(operation: string, params: any = {}): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📦 Cache hit: ${key}`);
      return cached.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      Array.from(this.cache.keys())
        .filter((key) => key.includes(pattern))
        .forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
    console.log(`🗑️ Cache cleared: ${pattern || 'all'}`);
  }

  // ============================================================================
  // Ticket Management
  // ============================================================================

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData: CreateTicketData): Promise<SupportRecord | null> {
    try {
      console.log('🎫 Creating new support ticket:', ticketData);

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Authentication required to create support ticket');
      }

      // Use the database function for ticket creation
      const { data, error } = await supabase.rpc('create_support_ticket', {
        p_user_id: user.id,
        p_quote_id: ticketData.quote_id || null,
        p_subject: ticketData.subject,
        p_description: ticketData.description,
        p_priority: ticketData.priority || 'medium',
        p_category: ticketData.category || 'general',
      });

      if (error) {
        logger.error('❌ Error creating ticket:', error);
        Sentry.captureException(error);
        return null;
      }

      // Fetch the complete ticket record
      const ticket = await this.getTicketById(data);

      if (ticket) {
        logger.info(ticket.id);
        this.clearCache('tickets');

        // Send notifications (async, don't block)
        this.sendTicketNotifications(ticket, 'created').catch((err) => {
          logger.error('❌ Failed to send ticket creation notifications:', err);
          Sentry.captureException(err);
        });

        // Check for auto-assignment
        this.checkAutoAssignment(ticket).catch((err) => {
          logger.error('❌ Auto-assignment failed:', err);
          Sentry.captureException(err);
        });
      }

      return ticket;
    } catch (error) {
      logger.error('❌ Exception in createTicket:', error);
      Sentry.captureException(error);
      return null;
    }
  }

  /**
   * Get ticket by ID with full details
   */
  async getTicketById(ticketId: string): Promise<SupportRecord | null> {
    try {
      const cacheKey = this.getCacheKey('ticket', { id: ticketId });
      const cached = this.getFromCache<SupportRecord>(cacheKey);
      if (cached) return cached;

      logger.debug(ticketId);

      const { data, error } = await supabase
        .from('support_system')
        .select(
          `
          *,
          quote:quotes_v2(
            id,
            quote_number,
            destination_country,
            status,
            final_total_origincurrency,
            created_at,
            items,
            customer_email,
            customer_name
          )
        `,
        )
        .eq('id', ticketId)
        .in('system_type', ['ticket', 'quote_discussion'])
        .single();

      if (error) {
        logger.error('❌ Error fetching ticket:', error);
        return null;
      }

      const ticket = data as SupportRecord;
      this.setCache(cacheKey, ticket);

      logger.info(ticket.id);
      return ticket;
    } catch (error) {
      logger.error('❌ Exception in getTicketById:', error);
      Sentry.captureException(error);
      return null;
    }
  }

  /**
   * Get tickets with filters and pagination
   */
  async getTickets(
    filters: TicketFilters = {},
    userId?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<SupportRecord[]> {
    try {
      const cacheKey = this.getCacheKey('tickets', { filters, userId, limit, offset });
      const cached = this.getFromCache<SupportRecord[]>(cacheKey);
      if (cached) return cached;

      console.log('📋 Fetching tickets with filters:', filters);

      let query = supabase
        .from('support_system')
        .select(`
          *
        `)
        .in('system_type', ['ticket', 'quote_discussion'])
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply user filter
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply status filter
      if (filters.status && filters.status.length > 0) {
        query = query.in('ticket_data->>status', filters.status);
      }

      // Apply priority filter
      if (filters.priority && filters.priority.length > 0) {
        query = query.in('ticket_data->>priority', filters.priority);
      }

      // Apply category filter
      if (filters.category && filters.category.length > 0) {
        query = query.in('ticket_data->>category', filters.category);
      }

      // Apply assigned_to filter
      if (filters.assigned_to) {
        query = query.eq('ticket_data->>assigned_to', filters.assigned_to);
      }

      // Apply quote_id filter
      if (filters.quote_id) {
        query = query.eq('quote_id', filters.quote_id);
      }

      // Apply date range filter
      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ Error fetching tickets:', error);
        logger.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }

      const tickets = data as SupportRecord[];
      this.setCache(cacheKey, tickets);

      logger.info();
      return tickets;
    } catch (error) {
      logger.error('❌ Exception in getTickets:', error);
      Sentry.captureException(error);
      return [];
    }
  }

  /**
   * Update ticket status with automatic SLA tracking
   */
  async updateTicketStatus(
    ticketId: string,
    newStatus: TicketStatus,
    reason?: string,
  ): Promise<boolean> {
    try {
      console.log('🔄 Updating ticket status:', ticketId, 'to:', newStatus);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Get current ticket to validate transition
      const currentTicket = await this.getTicketById(ticketId);
      if (!currentTicket || !currentTicket.ticket_data) {
        throw new Error('Ticket not found');
      }

      const currentStatus = currentTicket.ticket_data.status as TicketStatus;

      // Validate status transition
      if (!this.isValidTransition(currentStatus, newStatus)) {
        const allowedTransitions = this.getAllowedTransitions(currentStatus);
        logger.warn(
          `❌ Invalid status transition: ${currentStatus} → ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
        );
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
        );
      }

      logger.info();

      // Use the database function for status update
      const { data, error } = await supabase.rpc('update_support_ticket_status', {
        p_support_id: ticketId,
        p_new_status: newStatus,
        p_user_id: user.id,
        p_reason: reason,
      });

      if (error) {
        logger.error('❌ Error updating ticket status:', error);
        return false;
      }

      logger.info();
      this.clearCache('tickets');

      // Update SLA tracking
      await this.updateSLATracking(ticketId, newStatus);

      // Send notifications (async)
      const ticket = await this.getTicketById(ticketId);
      if (ticket) {
        this.sendTicketNotifications(ticket, 'status_updated', {
          new_status: newStatus,
          reason,
        }).catch((err) => {
          logger.error('❌ Failed to send status update notifications:', err);
          Sentry.captureException(err);
        });
      }

      return true;
    } catch (error) {
      logger.error('❌ Exception in updateTicketStatus:', error);
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Mark ticket as read by admin
   */
  async markTicketAsRead(ticketId: string): Promise<boolean> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { error } = await supabase.rpc('mark_ticket_as_read', {
        p_ticket_id: ticketId,
        p_admin_user_id: user.id,
      });

      if (error) {
        console.error('❌ Error marking ticket as read:', error);
        return false;
      }

      console.log('✅ Ticket marked as read:', ticketId);
      return true;
    } catch (error) {
      console.error('❌ Exception marking ticket as read:', error);
      return false;
    }
  }

  /**
   * Add interaction (reply, note, etc.) to ticket
   */
  async addInteraction(
    ticketId: string,
    interactionType: InteractionType,
    content: any,
    isInternal: boolean = false,
  ): Promise<SupportInteraction | null> {
    try {
      console.log('💬 Adding interaction to ticket:', ticketId, interactionType);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Use the database function for interaction creation
      const { data, error } = await supabase.rpc('add_support_interaction', {
        p_support_id: ticketId,
        p_user_id: user.id,
        p_interaction_type: interactionType,
        p_content: content,
        p_is_internal: isInternal,
      });

      if (error) {
        logger.error('❌ Error adding interaction:', error);
        return null;
      }

      // Fetch the complete interaction record
      const { data: interaction, error: fetchError } = await supabase
        .from('support_interactions')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        logger.error('❌ Error fetching interaction:', fetchError);
        return null;
      }

      logger.info(interaction.id);
      this.clearCache('interactions');

      // Handle first response SLA
      if (interactionType === 'reply' && !isInternal) {
        await this.handleFirstResponse(ticketId);
      }

      // Auto-transition based on who is replying
      if (interactionType === 'reply' && !isInternal) {
        // Check if it's a customer or agent reply
        const ticket = await this.getTicketById(ticketId);
        if (ticket) {
          const isCustomerReply = ticket.user_id === user.id;

          if (isCustomerReply) {
            // Customer replied - handle pending tickets
            await this.handleCustomerReply(ticketId);
          } else {
            // Agent replied - auto-transition to in_progress
            await this.handleAgentReply(ticketId);
          }
        }
      }

      // Send notifications (async)
      const ticket = await this.getTicketById(ticketId);
      if (ticket && interactionType === 'reply') {
        this.sendTicketNotifications(ticket, 'reply_added', {
          interaction: interaction,
          is_customer_reply: ticket.user_id === user.id,
        }).catch((err) => {
          logger.error('❌ Failed to send reply notifications:', err);
          Sentry.captureException(err);
        });
      }

      return interaction as SupportInteraction;
    } catch (error) {
      logger.error('❌ Exception in addInteraction:', error);
      Sentry.captureException(error);
      return null;
    }
  }

  /**
   * Get interactions for a ticket
   */
  async getTicketInteractions(ticketId: string): Promise<SupportInteraction[]> {
    try {
      const cacheKey = this.getCacheKey('interactions', { ticketId });
      const cached = this.getFromCache<SupportInteraction[]>(cacheKey);
      if (cached) return cached;

      console.log('💬 Fetching interactions for ticket:', ticketId);

      const { data, error } = await supabase
        .from('support_interactions')
        .select('*')
        .eq('support_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('❌ Error fetching interactions:', error);
        return [];
      }

      const interactions = data as SupportInteraction[];
      this.setCache(cacheKey, interactions);

      logger.info();
      return interactions;
    } catch (error) {
      logger.error('❌ Exception in getTicketInteractions:', error);
      Sentry.captureException(error);
      return [];
    }
  }

  // ============================================================================
  // SLA Management
  // ============================================================================

  /**
   * Update SLA tracking when status changes
   */
  private async updateSLATracking(ticketId: string, status: TicketStatus): Promise<void> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket || !ticket.sla_data) return;

      const now = new Date().toISOString();
      const slaData = { ...ticket.sla_data };

      // Handle resolution SLA
      if (status === 'resolved' || status === 'closed') {
        if (!slaData.resolution_sla.resolved_at) {
          slaData.resolution_sla.resolved_at = now;

          // Check if resolution SLA was breached
          const createdAt = new Date(ticket.created_at);
          const resolvedAt = new Date(now);
          const resolutionTimeHours =
            (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          if (resolutionTimeHours > slaData.resolution_sla.target_hours) {
            slaData.resolution_sla.is_breached = true;
            slaData.resolution_sla.breach_duration =
              resolutionTimeHours - slaData.resolution_sla.target_hours;

            // Log SLA breach
            await this.logSLABreach(ticketId, 'resolution', slaData.resolution_sla.breach_duration);
          }
        }
      }

      // Update the ticket's SLA data
      await supabase
        .from('support_system')
        .update({
          sla_data: slaData,
          updated_at: now,
        })
        .eq('id', ticketId);
    } catch (error) {
      logger.error('❌ Error updating SLA tracking:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Handle first response SLA tracking
   */
  private async handleFirstResponse(ticketId: string): Promise<void> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket || !ticket.sla_data) return;

      const slaData = { ...ticket.sla_data };

      // Only set first response if not already set
      if (!slaData.response_sla.first_response_at) {
        const now = new Date().toISOString();
        slaData.response_sla.first_response_at = now;

        // Check if response SLA was breached
        const createdAt = new Date(ticket.created_at);
        const respondedAt = new Date(now);
        const responseTimeMinutes = (respondedAt.getTime() - createdAt.getTime()) / (1000 * 60);

        if (responseTimeMinutes > slaData.response_sla.target_minutes) {
          slaData.response_sla.is_breached = true;
          slaData.response_sla.breach_duration =
            responseTimeMinutes - slaData.response_sla.target_minutes;

          // Log SLA breach
          await this.logSLABreach(ticketId, 'response', slaData.response_sla.breach_duration);
        }

        // Update the ticket's SLA data
        await supabase
          .from('support_system')
          .update({
            sla_data: slaData,
            updated_at: now,
          })
          .eq('id', ticketId);
      }
    } catch (error) {
      logger.error('❌ Error handling first response:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Log SLA breach
   */
  private async logSLABreach(
    ticketId: string,
    breachType: 'response' | 'resolution',
    breachDuration: number,
  ): Promise<void> {
    try {
      logger.warn();

      // Create a breach record in the unified system
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await this.addInteraction(
        ticketId,
        'escalation',
        {
          breach_type: breachType,
          breach_duration: breachDuration,
          severity: breachDuration > (breachType === 'response' ? 60 : 24) ? 'high' : 'medium',
          auto_generated: true,
        },
        true, // internal note
      );

      // Send breach notifications
      const ticket = await this.getTicketById(ticketId);
      if (ticket) {
        this.sendTicketNotifications(ticket, 'sla_breach', {
          breach_type: breachType,
          breach_duration: breachDuration,
        }).catch((err) => {
          logger.error('❌ Failed to send SLA breach notifications:', err);
          Sentry.captureException(err);
        });
      }
    } catch (error) {
      logger.error('❌ Error logging SLA breach:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Handle customer reply - auto-transition pending tickets to open
   */
  private async handleCustomerReply(ticketId: string): Promise<void> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket || !ticket.ticket_data) return;

      const currentStatus = ticket.ticket_data.status as TicketStatus;

      // If ticket is pending, transition to open when customer replies
      if (currentStatus === 'pending') {
        console.log('🔄 Customer replied to pending ticket, transitioning to open:', ticketId);

        await this.updateTicketStatus(
          ticketId,
          'open',
          'Automatically reopened - customer provided response',
        );

        logger.info();
      }
    } catch (error) {
      logger.error('❌ Error handling customer reply:', error);
      // Don't throw - this is a nice-to-have feature, shouldn't break the reply process
    }
  }

  /**
   * Handle agent reply - auto-transition to in_progress when agents respond
   */
  private async handleAgentReply(ticketId: string): Promise<void> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket || !ticket.ticket_data) return;

      const currentStatus = ticket.ticket_data.status as TicketStatus;

      // Auto-transition to in_progress when agent replies to open or pending tickets
      if (currentStatus === 'open' || currentStatus === 'pending') {
        console.log(
          `🔄 Agent replied to ${currentStatus} ticket, transitioning to in_progress:`,
          ticketId,
        );

        await this.updateTicketStatus(
          ticketId,
          'in_progress',
          `Automatically moved to in progress - agent provided response`,
        );

        logger.info();
      }
    } catch (error) {
      logger.error('❌ Error handling agent reply:', error);
      // Don't throw - this is a nice-to-have feature, shouldn't break the reply process
    }
  }

  // ============================================================================
  // Auto-Assignment
  // ============================================================================

  /**
   * Check and apply auto-assignment rules to a ticket
   */
  private async checkAutoAssignment(ticket: SupportRecord): Promise<void> {
    try {
      if (!ticket.ticket_data) return;

      console.log('🤖 Checking auto-assignment for ticket:', ticket.id);

      // Get active assignment rules
      const { data: rules, error } = await supabase
        .from('support_system')
        .select('*')
        .eq('system_type', 'rule')
        .eq('is_active', true);

      if (error) {
        logger.error('❌ Error fetching assignment rules:', error);
        return;
      }

      // Find matching rule
      const matchingRule = rules?.find((rule) => {
        if (!rule.assignment_data) return false;

        const conditions = rule.assignment_data.conditions;
        const ticketData = ticket.ticket_data!;

        // Check category match
        if (conditions.category && conditions.category.length > 0) {
          if (!conditions.category.includes(ticketData.category)) return false;
        }

        // Check priority match
        if (conditions.priority && conditions.priority.length > 0) {
          if (!conditions.priority.includes(ticketData.priority)) return false;
        }

        // Check keywords match
        if (conditions.keywords && conditions.keywords.length > 0) {
          const description = ticketData.description.toLowerCase();
          const hasKeyword = conditions.keywords.some((keyword) =>
            description.includes(keyword.toLowerCase()),
          );
          if (!hasKeyword) return false;
        }

        // Check business hours (simplified - would need more complex logic)
        if (conditions.business_hours_only) {
          const now = new Date();
          const hour = now.getHours();
          if (hour < 9 || hour > 17) return false; // Basic 9-5 check
        }

        return true;
      });

      if (matchingRule && matchingRule.assignment_data) {
        const assigneeId = matchingRule.assignment_data.assignment.assignee_id;

        if (assigneeId) {
          await this.assignTicket(
            ticket.id,
            assigneeId,
            `Auto-assigned by rule: ${matchingRule.assignment_data.rule_name}`,
          );
        }
      }
    } catch (error) {
      logger.error('❌ Error in auto-assignment:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Assign ticket to a user
   */
  async assignTicket(ticketId: string, assigneeId: string, reason?: string): Promise<boolean> {
    try {
      console.log('👤 Assigning ticket:', ticketId, 'to:', assigneeId);

      const ticket = await this.getTicketById(ticketId);
      if (!ticket || !ticket.ticket_data) return false;

      // Update ticket assignment
      const updatedTicketData = {
        ...ticket.ticket_data,
        assigned_to: assigneeId,
        metadata: {
          ...ticket.ticket_data.metadata,
          assigned_at: new Date().toISOString(),
          assignment_reason: reason,
        },
      };

      const { error } = await supabase
        .from('support_system')
        .update({
          ticket_data: updatedTicketData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) {
        logger.error('❌ Error assigning ticket:', error);
        return false;
      }

      // Log assignment interaction
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await this.addInteraction(
          ticketId,
          'assignment',
          {
            to_user: assigneeId,
            reason: reason || 'Manual assignment',
            automatic: reason?.includes('Auto-assigned') || false,
          },
          true,
        );
      }

      logger.info();
      this.clearCache('tickets');
      return true;
    } catch (error) {
      logger.error('❌ Exception in assignTicket:', error);
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Get interactions (replies, notes, etc.) for a ticket
   */
  async getInteractions(ticketId: string): Promise<any[]> {
    try {
      console.log('💬 Fetching interactions for ticket:', ticketId);

      const { data, error } = await supabase
        .from('support_interactions')
        .select(`
          id,
          support_id,
          user_id,
          interaction_type,
          content,
          is_internal,
          created_at
        `)
        .eq('support_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching interactions:', error);
        return [];
      }

      console.log(`✅ Fetched ${data?.length || 0} interactions`);
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getInteractions:', error);
      return [];
    }
  }

  // ============================================================================
  // Notification Management
  // ============================================================================

  /**
   * Send notifications for ticket events
   */
  private async sendTicketNotifications(
    ticket: SupportRecord,
    event: 'created' | 'reply_added' | 'status_updated' | 'sla_breach',
    eventData?: any,
  ): Promise<void> {
    try {
      // This would integrate with your existing notification system
      // For now, we'll use a simple console log approach
      console.log(`📧 Sending notification for ticket ${ticket.id}, event: ${event}`);

      // Get user preferences (simplified - would fetch from unified system)
      const userPrefs = await this.getUserNotificationPreferences(ticket.user_id);

      if (userPrefs.email_notifications) {
        // Send actual email notification
        await this.sendTicketEmailNotification(ticket, event, eventData);
      }

      // Add more notification channels as needed (SMS, in-app, etc.)
    } catch (error) {
      logger.error('❌ Error sending notifications:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Send email notification for ticket events using enhanced NotificationService
   */
  private async sendTicketEmailNotification(
    ticket: SupportRecord,
    event: 'created' | 'reply_added' | 'status_updated' | 'sla_breach',
    eventData?: any,
  ): Promise<void> {
    try {
      console.log('📧 Sending enhanced email notification for ticket:', ticket.id, event);

      // Convert SupportRecord to TicketWithDetails format
      const ticketWithDetails = await this.convertToTicketWithDetails(ticket);
      if (!ticketWithDetails) {
        logger.warn('⚠️ Could not convert ticket for notification:', ticket.id);
        return;
      }

      // Prepare additional data for different event types
      let additionalData: any = {};

      if (event === 'status_updated' && eventData) {
        additionalData = {
          oldStatus: eventData.old_status,
          newStatus: eventData.new_status,
        };
      } else if (event === 'reply_added' && eventData) {
        additionalData = {
          replyMessage: eventData.reply_message || 'New reply available',
        };
      } else if (event === 'sla_breach' && eventData) {
        additionalData = {
          slaType: eventData.breach_type || 'response',
        };
      }

      // Use NotificationService to send comprehensive email
      await notificationService.sendTicketEmailNotification(
        ticketWithDetails,
        event,
        additionalData,
      );

      logger.info();
    } catch (error) {
      logger.error('❌ Failed to send enhanced ticket email notification:', error);
      // Don't throw - email failures shouldn't break the ticket system
    }
  }

  /**
   * Convert SupportRecord to TicketWithDetails for notification system
   */
  private async convertToTicketWithDetails(ticket: SupportRecord): Promise<any | null> {
    try {
      if (!ticket.ticket_data) return null;

      // Get user profile information
      let userProfile = null;
      if (ticket.user_id) {
        const { data: profile } = await supabase
          .from('profiles_with_phone')
          .select('full_name, email, phone')
          .eq('id', ticket.user_id)
          .single();
        userProfile = profile;
      }

      // Convert to TicketWithDetails format
      const ticketWithDetails = {
        id: ticket.id,
        user_id: ticket.user_id,
        quote_id: ticket.quote_id,
        subject: ticket.ticket_data.subject,
        description: ticket.ticket_data.description,
        status: ticket.ticket_data.status,
        priority: ticket.ticket_data.priority,
        category: ticket.ticket_data.category,
        assigned_to: ticket.ticket_data.assigned_to,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        user_profile: userProfile,
        quote: ticket.quote || null,
      };

      return ticketWithDetails;
    } catch (error) {
      logger.error('❌ Error converting ticket for notifications:', error);
      return null;
    }
  }

  /**
   * Get customer email from ticket data
   */
  private getCustomerEmailFromTicket(ticket: SupportRecord): string | null {
    // Try to get email from quote data first
    if (ticket.quote?.customer_data?.info?.email) {
      return ticket.quote.customer_data.info.email;
    }

    // Fallback: get from user profile (would need to fetch separately)
    // For now, return a placeholder - in real implementation, fetch user profile
    return null;
  }

  /**
   * Generate email content based on event type
   */
  private generateEmailContent(
    ticket: SupportRecord,
    event: 'created' | 'reply_added' | 'status_updated' | 'sla_breach',
    eventData?: any,
  ): { subject: string; html: string; template: string } {
    const ticketData = ticket.ticket_data!;
    const ticketId = ticket.id.slice(0, 8);

    switch (event) {
      case 'created':
        return {
          subject: `Support Ticket Created - #${ticketId}`,
          template: 'ticket_created',
          html: `
            <h2>Your Support Ticket Has Been Created</h2>
            <p>Hello,</p>
            <p>We've received your support request and will respond within 24 hours.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Ticket #${ticketId}</strong><br>
              <strong>Subject:</strong> ${ticketData.subject}<br>
              <strong>Status:</strong> Open<br>
              <strong>Priority:</strong> ${ticketData.priority}
            </div>
            
            <p><strong>Your message:</strong></p>
            <p style="background: #f0f0f0; padding: 10px; border-radius: 3px;">${ticketData.description}</p>
            
            <p>You can track your ticket progress in your account dashboard.</p>
            <p>Best regards,<br>iwishBag Support Team</p>
          `,
        };

      case 'status_updated':
        const newStatus = eventData?.new_status || ticketData.status;
        const statusLabels: Record<string, string> = {
          open: 'Open',
          in_progress: 'Being Worked On',
          pending: 'Waiting for Your Response',
          resolved: 'Resolved',
          closed: 'Closed',
        };

        return {
          subject: `Ticket Update - #${ticketId} is now ${statusLabels[newStatus]}`,
          template: 'ticket_status_updated',
          html: `
            <h2>Your Support Ticket Has Been Updated</h2>
            <p>Hello,</p>
            <p>Your support ticket status has been updated.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Ticket #${ticketId}</strong><br>
              <strong>Subject:</strong> ${ticketData.subject}<br>
              <strong>New Status:</strong> <span style="color: #0066cc; font-weight: bold;">${statusLabels[newStatus]}</span>
            </div>
            
            ${
              newStatus === 'pending'
                ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <strong>Action Required:</strong> We need additional information from you to continue. Please check your ticket and reply with the requested details.
              </div>
            `
                : ''
            }
            
            ${
              newStatus === 'resolved'
                ? `
              <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                <strong>Issue Resolved:</strong> Your issue has been resolved! If you need further assistance, please reply within 7 days.
              </div>
            `
                : ''
            }
            
            <p>View your ticket in your account dashboard for more details.</p>
            <p>Best regards,<br>iwishBag Support Team</p>
          `,
        };

      case 'reply_added':
        const isCustomerReply = eventData?.is_customer_reply || false;
        if (isCustomerReply) {
          // Don't email customer about their own reply
          return { subject: '', html: '', template: '' };
        }

        return {
          subject: `New Response to Your Ticket - #${ticketId}`,
          template: 'ticket_reply',
          html: `
            <h2>New Response to Your Support Ticket</h2>
            <p>Hello,</p>
            <p>Our support team has responded to your ticket.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Ticket #${ticketId}</strong><br>
              <strong>Subject:</strong> ${ticketData.subject}<br>
              <strong>Status:</strong> Being Worked On
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196f3;">
              <strong>Support Team Response:</strong><br>
              Please check your ticket for the full response and any follow-up questions.
            </div>
            
            <p>You can view the complete conversation and reply in your account dashboard.</p>
            <p>Best regards,<br>iwishBag Support Team</p>
          `,
        };

      case 'sla_breach':
        return {
          subject: `Urgent: Delayed Response on Ticket #${ticketId}`,
          template: 'ticket_sla_breach',
          html: `
            <h2>We're Working to Resolve Your Ticket</h2>
            <p>Hello,</p>
            <p>We apologize for the delay in responding to your support request.</p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <strong>Ticket #${ticketId}</strong><br>
              <strong>Subject:</strong> ${ticketData.subject}<br>
              <strong>Status:</strong> High Priority
            </div>
            
            <p>Your ticket has been escalated and will receive priority attention from our support team.</p>
            <p>We'll respond as soon as possible with an update or resolution.</p>
            
            <p>Thank you for your patience.</p>
            <p>Best regards,<br>iwishBag Support Team</p>
          `,
        };

      default:
        return {
          subject: `Ticket Update - #${ticketId}`,
          template: 'ticket_generic',
          html: `
            <h2>Your Support Ticket Has Been Updated</h2>
            <p>Hello,</p>
            <p>Your support ticket #${ticketId} has been updated.</p>
            <p>Please check your account dashboard for details.</p>
            <p>Best regards,<br>iwishBag Support Team</p>
          `,
        };
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPrefs> {
    const defaultPrefs: NotificationPrefs = {
      email_notifications: true,
      sms_notifications: false,
      in_app_notifications: true,
      notification_frequency: 'immediate',
      categories: ['general', 'payment', 'shipping', 'refund', 'product', 'customs'],
      escalation_notifications: true,
    };

    try {
      const { data, error } = await supabase
        .from('support_system')
        .select('notification_prefs')
        .eq('user_id', userId)
        .eq('system_type', 'preference')
        .single();

      if (error || !data?.notification_prefs) {
        return defaultPrefs;
      }

      return { ...defaultPrefs, ...data.notification_prefs };
    } catch (error) {
      logger.error('❌ Error fetching notification preferences:', error);
      return defaultPrefs;
    }
  }

  // ============================================================================
  // Statistics and Analytics
  // ============================================================================

  /**
   * Get ticket statistics for dashboard
   */
  async getTicketStats(): Promise<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    avg_response_time: number;
    avg_resolution_time: number;
    sla_compliance: number;
  }> {
    try {
      const cacheKey = this.getCacheKey('stats');
      const cached = this.getFromCache<any>(cacheKey);
      if (cached) return cached;

      console.log('📊 Fetching ticket statistics');

      const { data, error } = await supabase
        .from('support_system')
        .select('ticket_data, sla_data, created_at')
        .eq('system_type', 'ticket');

      if (error) {
        logger.error('❌ Error fetching ticket stats:', error);
        return {
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
          avg_response_time: 0,
          avg_resolution_time: 0,
          sla_compliance: 0,
        };
      }

      const tickets = data || [];
      const stats = {
        total: tickets.length,
        open: tickets.filter((t) => t.ticket_data?.status === 'open').length,
        in_progress: tickets.filter((t) => t.ticket_data?.status === 'in_progress').length,
        resolved: tickets.filter((t) => t.ticket_data?.status === 'resolved').length,
        closed: tickets.filter((t) => t.ticket_data?.status === 'closed').length,
        avg_response_time: 0,
        avg_resolution_time: 0,
        sla_compliance: 0,
      };

      // Calculate averages and SLA compliance (simplified calculations)
      const resolvedTickets = tickets.filter((t) => t.sla_data?.response_sla?.first_response_at);
      const closedTickets = tickets.filter((t) => t.sla_data?.resolution_sla?.resolved_at);

      if (resolvedTickets.length > 0) {
        const totalResponseTime = resolvedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at);
          const responded = new Date(ticket.sla_data.response_sla.first_response_at);
          return sum + (responded.getTime() - created.getTime()) / (1000 * 60); // minutes
        }, 0);
        stats.avg_response_time = totalResponseTime / resolvedTickets.length;
      }

      if (closedTickets.length > 0) {
        const totalResolutionTime = closedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.sla_data.resolution_sla.resolved_at);
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        }, 0);
        stats.avg_resolution_time = totalResolutionTime / closedTickets.length;
      }

      // SLA compliance rate
      const slaCompliantTickets = tickets.filter(
        (t) => !t.sla_data?.response_sla?.is_breached && !t.sla_data?.resolution_sla?.is_breached,
      ).length;
      stats.sla_compliance =
        tickets.length > 0 ? (slaCompliantTickets / tickets.length) * 100 : 100;

      this.setCache(cacheKey, stats);
      logger.info(stats);
      return stats;
    } catch (error) {
      logger.error('❌ Exception in getTicketStats:', error);
      Sentry.captureException(error);
      return {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        avg_response_time: 0,
        avg_resolution_time: 0,
        sla_compliance: 0,
      };
    }
  }
}

// Export singleton instance
export const unifiedSupportEngine = UnifiedSupportEngine.getInstance();
export default unifiedSupportEngine;
