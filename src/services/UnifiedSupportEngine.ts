// ============================================================================
// UNIFIED SUPPORT ENGINE - Complete Support System Management
// Replaces: TicketService, SLAService, AutoAssignmentService, TicketNotificationService
// Unified approach following UnifiedDataEngine pattern
// ============================================================================

import { supabase } from '../integrations/supabase/client';
import { notificationService } from './NotificationService';
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
    in_progress: ['pending', 'resolved', 'open'],
    pending: ['in_progress', 'open', 'closed'],
    resolved: ['closed', 'open'], // Allow reopening if needed
    closed: [] // Terminal state
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
  getStatusSuggestions(currentStatus: TicketStatus, isAdmin: boolean = true): {
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
        all: []
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
      all: allowedTransitions
    };
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
        .filter(key => key.includes(pattern))
        .forEach(key => this.cache.delete(key));
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
        console.error('❌ Error creating ticket:', error);
        Sentry.captureException(error);
        return null;
      }

      // Fetch the complete ticket record
      const ticket = await this.getTicketById(data);
      
      if (ticket) {
        console.log('✅ Ticket created successfully:', ticket.id);
        this.clearCache('tickets');
        
        // Send notifications (async, don't block)
        this.sendTicketNotifications(ticket, 'created').catch(err => {
          console.error('❌ Failed to send ticket creation notifications:', err);
          Sentry.captureException(err);
        });

        // Check for auto-assignment
        this.checkAutoAssignment(ticket).catch(err => {
          console.error('❌ Auto-assignment failed:', err);
          Sentry.captureException(err);
        });
      }

      return ticket;

    } catch (error) {
      console.error('❌ Exception in createTicket:', error);
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

      console.log('🔍 Fetching ticket by ID:', ticketId);

      const { data, error } = await supabase
        .from('support_system')
        .select(`
          *,
          quote:quotes(
            id,
            display_id,
            destination_country,
            status,
            final_total_usd,
            iwish_tracking_id,
            tracking_status,
            estimated_delivery_date,
            items,
            customer_data
          )
        `)
        .eq('id', ticketId)
        .eq('system_type', 'ticket')
        .single();

      if (error) {
        console.error('❌ Error fetching ticket:', error);
        return null;
      }

      const ticket = data as SupportRecord;
      this.setCache(cacheKey, ticket);
      
      console.log('✅ Ticket fetched successfully:', ticket.id);
      return ticket;

    } catch (error) {
      console.error('❌ Exception in getTicketById:', error);
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
    offset: number = 0
  ): Promise<SupportRecord[]> {
    try {
      const cacheKey = this.getCacheKey('tickets', { filters, userId, limit, offset });
      const cached = this.getFromCache<SupportRecord[]>(cacheKey);
      if (cached) return cached;

      console.log('📋 Fetching tickets with filters:', filters);

      let query = supabase
        .from('support_system')
        .select(`
          *,
          quote:quotes(
            id,
            display_id,
            destination_country,
            status,
            final_total_usd,
            iwish_tracking_id,
            tracking_status,
            estimated_delivery_date,
            items,
            customer_data
          )
        `)
        .eq('system_type', 'ticket')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply user filter
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply status filter
      if (filters.status && filters.status.length > 0) {
        const statusConditions = filters.status
          .map(status => `ticket_data->>'status' = '${status}'`)
          .join(' OR ');
        query = query.or(statusConditions);
      }

      // Apply priority filter
      if (filters.priority && filters.priority.length > 0) {
        const priorityConditions = filters.priority
          .map(priority => `ticket_data->>'priority' = '${priority}'`)
          .join(' OR ');
        query = query.or(priorityConditions);
      }

      // Apply category filter
      if (filters.category && filters.category.length > 0) {
        const categoryConditions = filters.category
          .map(category => `ticket_data->>'category' = '${category}'`)
          .join(' OR ');
        query = query.or(categoryConditions);
      }

      // Apply assigned_to filter
      if (filters.assigned_to) {
        query = query.eq('ticket_data->assigned_to', filters.assigned_to);
      }

      // Apply date range filter
      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching tickets:', error);
        return [];
      }

      const tickets = data as SupportRecord[];
      this.setCache(cacheKey, tickets);
      
      console.log(`✅ Fetched ${tickets.length} tickets`);
      return tickets;

    } catch (error) {
      console.error('❌ Exception in getTickets:', error);
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
    reason?: string
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
        console.warn(`❌ Invalid status transition: ${currentStatus} → ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`);
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`);
      }

      console.log(`✅ Valid status transition: ${currentStatus} → ${newStatus}`);

      // Use the database function for status update
      const { data, error } = await supabase.rpc('update_support_ticket_status', {
        p_support_id: ticketId,
        p_new_status: newStatus,
        p_user_id: user.id,
        p_reason: reason,
      });

      if (error) {
        console.error('❌ Error updating ticket status:', error);
        return false;
      }

      console.log('✅ Ticket status updated successfully');
      this.clearCache('tickets');

      // Update SLA tracking
      await this.updateSLATracking(ticketId, newStatus);

      // Send notifications (async)
      const ticket = await this.getTicketById(ticketId);
      if (ticket) {
        this.sendTicketNotifications(ticket, 'status_updated', { 
          new_status: newStatus,
          reason 
        }).catch(err => {
          console.error('❌ Failed to send status update notifications:', err);
          Sentry.captureException(err);
        });
      }

      return true;

    } catch (error) {
      console.error('❌ Exception in updateTicketStatus:', error);
      Sentry.captureException(error);
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
    isInternal: boolean = false
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
        console.error('❌ Error adding interaction:', error);
        return null;
      }

      // Fetch the complete interaction record
      const { data: interaction, error: fetchError } = await supabase
        .from('support_interactions')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching interaction:', fetchError);
        return null;
      }

      console.log('✅ Interaction added successfully:', interaction.id);
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
          is_customer_reply: ticket.user_id === user.id
        }).catch(err => {
          console.error('❌ Failed to send reply notifications:', err);
          Sentry.captureException(err);
        });
      }

      return interaction as SupportInteraction;

    } catch (error) {
      console.error('❌ Exception in addInteraction:', error);
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
        console.error('❌ Error fetching interactions:', error);
        return [];
      }

      const interactions = data as SupportInteraction[];
      this.setCache(cacheKey, interactions);
      
      console.log(`✅ Fetched ${interactions.length} interactions`);
      return interactions;

    } catch (error) {
      console.error('❌ Exception in getTicketInteractions:', error);
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
      let slaData = { ...ticket.sla_data };

      // Handle resolution SLA
      if (status === 'resolved' || status === 'closed') {
        if (!slaData.resolution_sla.resolved_at) {
          slaData.resolution_sla.resolved_at = now;
          
          // Check if resolution SLA was breached
          const createdAt = new Date(ticket.created_at);
          const resolvedAt = new Date(now);
          const resolutionTimeHours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          
          if (resolutionTimeHours > slaData.resolution_sla.target_hours) {
            slaData.resolution_sla.is_breached = true;
            slaData.resolution_sla.breach_duration = resolutionTimeHours - slaData.resolution_sla.target_hours;
            
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
          updated_at: now 
        })
        .eq('id', ticketId);

    } catch (error) {
      console.error('❌ Error updating SLA tracking:', error);
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

      let slaData = { ...ticket.sla_data };

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
          slaData.response_sla.breach_duration = responseTimeMinutes - slaData.response_sla.target_minutes;
          
          // Log SLA breach
          await this.logSLABreach(ticketId, 'response', slaData.response_sla.breach_duration);
        }

        // Update the ticket's SLA data
        await supabase
          .from('support_system')
          .update({ 
            sla_data: slaData,
            updated_at: now 
          })
          .eq('id', ticketId);
      }

    } catch (error) {
      console.error('❌ Error handling first response:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Log SLA breach
   */
  private async logSLABreach(
    ticketId: string, 
    breachType: 'response' | 'resolution', 
    breachDuration: number
  ): Promise<void> {
    try {
      console.log(`⚠️ SLA breach detected: ${breachType} for ticket ${ticketId}`);
      
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
          auto_generated: true
        },
        true // internal note
      );

      // Send breach notifications
      const ticket = await this.getTicketById(ticketId);
      if (ticket) {
        this.sendTicketNotifications(ticket, 'sla_breach', {
          breach_type: breachType,
          breach_duration: breachDuration
        }).catch(err => {
          console.error('❌ Failed to send SLA breach notifications:', err);
          Sentry.captureException(err);
        });
      }

    } catch (error) {
      console.error('❌ Error logging SLA breach:', error);
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
          'Automatically reopened - customer provided response'
        );

        console.log('✅ Ticket automatically transitioned from pending to open');
      }

    } catch (error) {
      console.error('❌ Error handling customer reply:', error);
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
        console.log(`🔄 Agent replied to ${currentStatus} ticket, transitioning to in_progress:`, ticketId);
        
        await this.updateTicketStatus(
          ticketId, 
          'in_progress', 
          `Automatically moved to in progress - agent provided response`
        );

        console.log('✅ Ticket automatically transitioned to in_progress');
      }

    } catch (error) {
      console.error('❌ Error handling agent reply:', error);
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
        console.error('❌ Error fetching assignment rules:', error);
        return;
      }

      // Find matching rule
      const matchingRule = rules?.find(rule => {
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
          const hasKeyword = conditions.keywords.some(keyword => 
            description.includes(keyword.toLowerCase())
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
          await this.assignTicket(ticket.id, assigneeId, `Auto-assigned by rule: ${matchingRule.assignment_data.rule_name}`);
        }
      }

    } catch (error) {
      console.error('❌ Error in auto-assignment:', error);
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
          assignment_reason: reason
        }
      };

      const { error } = await supabase
        .from('support_system')
        .update({ 
          ticket_data: updatedTicketData,
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId);

      if (error) {
        console.error('❌ Error assigning ticket:', error);
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
            automatic: reason?.includes('Auto-assigned') || false
          },
          true
        );
      }

      console.log('✅ Ticket assigned successfully');
      this.clearCache('tickets');
      return true;

    } catch (error) {
      console.error('❌ Exception in assignTicket:', error);
      Sentry.captureException(error);
      return false;
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
    eventData?: any
  ): Promise<void> {
    try {
      // This would integrate with your existing notification system
      // For now, we'll use a simple console log approach
      console.log(`📧 Sending notification for ticket ${ticket.id}, event: ${event}`);

      // Get user preferences (simplified - would fetch from unified system)
      const userPrefs = await this.getUserNotificationPreferences(ticket.user_id);
      
      if (userPrefs.email_notifications) {
        // For now, just log the notification intent
        // TODO: Implement full ticket email notifications
        console.log('📧 Would send ticket email notification:', {
          event,
          ticketId: ticket.id,
          userId: ticket.user_id,
          template: `ticket_${event}`
        });
      }

      // Add more notification channels as needed (SMS, in-app, etc.)

    } catch (error) {
      console.error('❌ Error sending notifications:', error);
      Sentry.captureException(error);
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
      escalation_notifications: true
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
      console.error('❌ Error fetching notification preferences:', error);
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
        console.error('❌ Error fetching ticket stats:', error);
        return {
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
          avg_response_time: 0,
          avg_resolution_time: 0,
          sla_compliance: 0
        };
      }

      const tickets = data || [];
      const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.ticket_data?.status === 'open').length,
        in_progress: tickets.filter(t => t.ticket_data?.status === 'in_progress').length,
        resolved: tickets.filter(t => t.ticket_data?.status === 'resolved').length,
        closed: tickets.filter(t => t.ticket_data?.status === 'closed').length,
        avg_response_time: 0,
        avg_resolution_time: 0,
        sla_compliance: 0
      };

      // Calculate averages and SLA compliance (simplified calculations)
      const resolvedTickets = tickets.filter(t => t.sla_data?.response_sla?.first_response_at);
      const closedTickets = tickets.filter(t => t.sla_data?.resolution_sla?.resolved_at);
      
      if (resolvedTickets.length > 0) {
        const totalResponseTime = resolvedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at);
          const responded = new Date(ticket.sla_data.response_sla.first_response_at);
          return sum + ((responded.getTime() - created.getTime()) / (1000 * 60)); // minutes
        }, 0);
        stats.avg_response_time = totalResponseTime / resolvedTickets.length;
      }

      if (closedTickets.length > 0) {
        const totalResolutionTime = closedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.sla_data.resolution_sla.resolved_at);
          return sum + ((resolved.getTime() - created.getTime()) / (1000 * 60 * 60)); // hours
        }, 0);
        stats.avg_resolution_time = totalResolutionTime / closedTickets.length;
      }

      // SLA compliance rate
      const slaCompliantTickets = tickets.filter(t => 
        !t.sla_data?.response_sla?.is_breached && !t.sla_data?.resolution_sla?.is_breached
      ).length;
      stats.sla_compliance = tickets.length > 0 ? (slaCompliantTickets / tickets.length) * 100 : 100;

      this.setCache(cacheKey, stats);
      console.log('✅ Ticket stats calculated:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Exception in getTicketStats:', error);
      Sentry.captureException(error);
      return {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        avg_response_time: 0,
        avg_resolution_time: 0,
        sla_compliance: 0
      };
    }
  }
}

// Export singleton instance
export const unifiedSupportEngine = UnifiedSupportEngine.getInstance();
export default unifiedSupportEngine;