/**
 * Enhanced Support Service - Context-Aware Customer Support
 * 
 * Provides intelligent support integration with complete context about
 * customer's packages, quotes, orders, and history. Integrates with
 * UnifiedUserContextService for personalized support experiences.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import { unifiedUserContextService, type UnifiedUserProfile } from '@/services/UnifiedUserContextService';

// ============================================================================
// ENHANCED SUPPORT TYPES
// ============================================================================

export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type SupportTicketCategory = 
  | 'quote_inquiry' 
  | 'package_issue' 
  | 'payment_problem' 
  | 'shipping_question' 
  | 'account_access' 
  | 'technical_issue' 
  | 'billing_dispute' 
  | 'general_inquiry';

export interface SupportTicketContext {
  // Related entities
  quote_id?: string;
  package_id?: string;
  order_id?: string;
  consolidation_id?: string;
  
  // User context at time of ticket creation
  user_tier: string;
  total_orders: number;
  lifetime_value: number;
  last_order_date: string | null;
  
  // Issue context
  affected_services: string[];
  error_codes?: string[];
  browser_info?: string;
  device_info?: string;
  
  // Previous interactions
  related_tickets: string[];
  escalation_history: EscalationEvent[];
}

export interface EscalationEvent {
  timestamp: string;
  from_agent: string;
  to_agent: string;
  reason: string;
  notes?: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  subject: string;
  description: string;
  context: SupportTicketContext;
  
  // Assignment & resolution
  assigned_agent_id?: string;
  assigned_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  
  // Customer satisfaction
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  message: string;
  attachments?: string[];
  is_internal: boolean;
  created_at: string;
}

export interface AgentResponse {
  message: string;
  suggested_actions?: string[];
  requires_escalation: boolean;
  estimated_resolution_time?: string;
}

// ============================================================================
// ENHANCED SUPPORT SERVICE
// ============================================================================

class EnhancedSupportService {
  private static instance: EnhancedSupportService;

  private constructor() {}

  public static getInstance(): EnhancedSupportService {
    if (!EnhancedSupportService.instance) {
      EnhancedSupportService.instance = new EnhancedSupportService();
    }
    return EnhancedSupportService.instance;
  }

  // ============================================================================
  // TICKET CREATION WITH CONTEXT
  // ============================================================================

  /**
   * Create a new support ticket with full user context
   */
  async createTicketWithContext(
    userId: string,
    category: SupportTicketCategory,
    subject: string,
    description: string,
    relatedEntityIds: {
      quote_id?: string;
      package_id?: string;
      order_id?: string;
      consolidation_id?: string;
    } = {}
  ): Promise<SupportTicket | null> {
    try {
      // Get unified user context
      const userContext = await unifiedUserContextService.getUserContext(userId);
      if (!userContext) {
        throw new Error('Unable to load user context for support ticket');
      }

      // Build ticket context with all available information
      const ticketContext = await this.buildTicketContext(userContext, relatedEntityIds);

      // Determine priority based on context
      const priority = this.determinePriority(category, userContext, ticketContext);

      // Create ticket record
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          category,
          priority,
          status: 'open' as SupportTicketStatus,
          subject,
          description,
          context: ticketContext,
          tags: this.generateTags(category, userContext, ticketContext)
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial system message
      await this.addSystemMessage(
        ticket.id,
        `Ticket created automatically with priority: ${priority}. ${this.getContextSummary(ticketContext)}`
      );

      // Notify user
      await notificationService.create
      // Activity tracking removed

      // Auto-assign if applicable
      await this.attemptAutoAssignment(ticket);

      logger.info('Support ticket created with enhanced context', {
        ticket_id: ticket.id,
        user_id: userId,
        category,
        priority,
        context_summary: this.getContextSummary(ticketContext)
      });

      return ticket;
    } catch (error) {
      this.handleError('createTicketWithContext', error, { userId, category, subject });
      return null;
    }
  }

  /**
   * Build comprehensive ticket context
   */
  private async buildTicketContext(
    userContext: UnifiedUserProfile,
    relatedEntityIds: any
  ): Promise<SupportTicketContext> {
    try {
      // Get related entities data
      const [quoteData, packageData, orderData] = await Promise.all([
        relatedEntityIds.quote_id ? this.getQuoteContext(relatedEntityIds.quote_id) : null,
        relatedEntityIds.package_id ? this.getPackageContext(relatedEntityIds.package_id) : null,
        relatedEntityIds.order_id ? this.getOrderContext(relatedEntityIds.order_id) : null
      ]);

      // Find related tickets
      const { data: relatedTickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', userContext.id)
        .neq('status', 'closed')
        .limit(5);

      // Identify affected services
      const affectedServices: string[] = [];
      if (quoteData) affectedServices.push('quotes');
      if (packageData) affectedServices.push('packages', 'warehouse');
      if (orderData) affectedServices.push('orders', 'shipping');

      return {
        // Related entities
        quote_id: relatedEntityIds.quote_id,
        package_id: relatedEntityIds.package_id,
        order_id: relatedEntityIds.order_id,
        consolidation_id: relatedEntityIds.consolidation_id,

        // User context
        user_tier: userContext.customer_data.customer_segment,
        total_orders: userContext.customer_data.total_orders,
        lifetime_value: userContext.customer_data.lifetime_value,
        last_order_date: userContext.customer_data.last_order_date,

        // Issue context
        affected_services: affectedServices,
        browser_info: navigator.userAgent,
        device_info: this.getDeviceInfo(),

        // Previous interactions
        related_tickets: relatedTickets?.map(t => t.id) || [],
        escalation_history: []
      };
    } catch (error) {
      logger.error('Failed to build ticket context', { error, userContext: userContext.id });
      return {
        user_tier: userContext.customer_data.customer_segment,
        total_orders: userContext.customer_data.total_orders,
        lifetime_value: userContext.customer_data.lifetime_value,
        last_order_date: userContext.customer_data.last_order_date,
        affected_services: [],
        related_tickets: [],
        escalation_history: []
      };
    }
  }

  /**
   * Determine ticket priority based on context
   */
  private determinePriority(
    category: SupportTicketCategory,
    userContext: UnifiedUserProfile,
    ticketContext: SupportTicketContext
  ): SupportTicketPriority {
    // VIP customers get higher priority
    if (userContext.customer_data.customer_segment === 'vip') {
      return category === 'payment_problem' || category === 'account_access' ? 'urgent' : 'high';
    }

    // High-value customers get elevated priority
    if (userContext.customer_data.lifetime_value > 2000) {
      return category === 'payment_problem' ? 'high' : 'medium';
    }

    // Category-based priority
    switch (category) {
      case 'payment_problem':
      case 'account_access':
        return 'high';
      case 'package_issue':
      case 'shipping_question':
        return 'medium';
      case 'quote_inquiry':
      case 'technical_issue':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Generate relevant tags for the ticket
   */
  private generateTags(
    category: SupportTicketCategory,
    userContext: UnifiedUserProfile,
    context: SupportTicketContext
  ): string[] {
    const tags: string[] = [category];

    // User tier tags
    tags.push(`tier:${userContext.customer_data.customer_segment}`);

    // Service tags
    context.affected_services.forEach(service => tags.push(`service:${service}`));

    // Context-specific tags
    if (context.quote_id) tags.push('has-quote');
    if (context.package_id) tags.push('has-package');
    if (context.related_tickets.length > 0) tags.push('repeat-customer');

    // Priority tags
    if (userContext.customer_data.lifetime_value > 5000) tags.push('high-value');
    if (userContext.customer_data.total_orders > 10) tags.push('frequent-customer');

    return tags;
  }

  // ============================================================================
  // CONTEXT RETRIEVAL METHODS
  // ============================================================================

  private async getQuoteContext(quoteId: string): Promise<any> {
    const { data } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', quoteId)
      .single();
    return data;
  }

  private async getPackageContext(packageId: string): Promise<any> {
    const { data } = await supabase
      .from('received_packages')
      .select('*')
      .eq('id', packageId)
      .single();
    return data;
  }

  private async getOrderContext(orderId: string): Promise<any> {
    const { data } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', orderId)
      .single();
    return data;
  }

  // ============================================================================
  // TICKET MANAGEMENT
  // ============================================================================

  /**
   * Add a message to a support ticket
   */
  async addMessage(
    ticketId: string,
    senderId: string,
    senderType: 'customer' | 'agent' | 'system',
    message: string,
    attachments: string[] = [],
    isInternal: boolean = false
  ): Promise<SupportMessage | null> {
    try {
      const { data: messageRecord, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: senderId,
          sender_type: senderType,
          message,
          attachments,
          is_internal: isInternal
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket timestamp
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      // Notify relevant parties (if not internal)
      if (!isInternal) {
        await this.notifyTicketUpdate(ticketId, senderType, message);
      }

      return messageRecord;
    } catch (error) {
      this.handleError('addMessage', error, { ticketId, senderId, senderType });
      return null;
    }
  }

  /**
   * Add system message to ticket
   */
  private async addSystemMessage(ticketId: string, message: string): Promise<void> {
    await this.addMessage(ticketId, 'system', 'system', message, [], true);
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: SupportTicketStatus,
    agentId?: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved' && agentId) {
        updates.resolved_at = new Date().toISOString();
        updates.resolution_notes = notes;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      // Add system message
      await this.addSystemMessage(
        ticketId,
        `Ticket status updated to: ${status}${notes ? `. Notes: ${notes}` : ''}`
      );

      return true;
    } catch (error) {
      this.handleError('updateTicketStatus', error, { ticketId, status });
      return false;
    }
  }

  /**
   * Attempt automatic ticket assignment
   */
  private async attemptAutoAssignment(ticket: SupportTicket): Promise<void> {
    try {
      // Get available agents based on category and priority
      const { data: availableAgents } = await supabase
        .from('support_agents')
        .select('*')
        .eq('is_available', true)
        .contains('specializations', [ticket.category])
        .order('current_ticket_count', { ascending: true })
        .limit(3);

      if (availableAgents && availableAgents.length > 0) {
        const selectedAgent = availableAgents[0]; // Assign to least busy agent

        await supabase
          .from('support_tickets')
          .update({
            assigned_agent_id: selectedAgent.id,
            assigned_at: new Date().toISOString(),
            status: 'in_progress'
          })
          .eq('id', ticket.id);

        await this.addSystemMessage(
          ticket.id,
          `Ticket automatically assigned to ${selectedAgent.name} based on specialization and availability.`
        );
      }
    } catch (error) {
      logger.warn('Auto-assignment failed', { ticketId: ticket.id, error });
      // Don't throw - manual assignment will handle
    }
  }

  /**
   * Notify relevant parties of ticket updates
   */
  private async notifyTicketUpdate(
    ticketId: string,
    senderType: 'customer' | 'agent' | 'system',
    message: string
  ): Promise<void> {
    try {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('user_id, assigned_agent_id, subject')
        .eq('id', ticketId)
        .single();

      if (!ticket) return;

      // Notify customer if agent replied
      if (senderType === 'agent') {
        await notificationService.create      }

      // Notify agent if customer replied
      if (senderType === 'customer' && ticket.assigned_agent_id) {
        await notificationService.create      }
    } catch (error) {
      logger.error('Failed to notify ticket update', { ticketId, error });
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getDeviceInfo(): string {
    const screen = window.screen;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    return `Screen: ${screen.width}x${screen.height}, Viewport: ${viewport.width}x${viewport.height}`;
  }

  private getContextSummary(context: SupportTicketContext): string {
    const parts: string[] = [];
    
    if (context.user_tier !== 'new') parts.push(`${context.user_tier} customer`);
    if (context.total_orders > 0) parts.push(`${context.total_orders} orders`);
    if (context.lifetime_value > 0) parts.push(`$${context.lifetime_value.toFixed(0)} LTV`);
    if (context.affected_services.length > 0) parts.push(`Services: ${context.affected_services.join(', ')}`);
    
    return parts.join(' • ');
  }

  private handleError(operation: string, error: any, context: any = {}): void {
    const transaction = typeof Sentry?.startTransaction === 'function'
      ? Sentry.startTransaction({
          name: `EnhancedSupportService.${operation}`,
          op: 'support_operation'
        })
      : null;

    if (transaction) {
      Sentry.captureException(error, {
        tags: {
          service: 'EnhancedSupportService',
          operation
        },
        extra: context
      });
      transaction.finish();
    }

    logger.error(`EnhancedSupportService.${operation} failed`, {
      error: error.message,
      context
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get user's support tickets with context
   */
  async getUserTickets(
    userId: string,
    options: {
      status?: SupportTicketStatus[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SupportTicket[]> {
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.in('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError('getUserTickets', error, { userId, options });
      return [];
    }
  }

  /**
   * Get ticket messages
   */
  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError('getTicketMessages', error, { ticketId });
      return [];
    }
  }

  /**
   * Get intelligent response suggestions
   */
  async getResponseSuggestions(ticketId: string): Promise<AgentResponse | null> {
    try {
      // This would integrate with AI service for intelligent responses
      // For now, return basic template responses
      
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (!ticket) return null;

      // Basic response templates based on category
      const suggestions: Record<SupportTicketCategory, AgentResponse> = {
        quote_inquiry: {
          message: "Thank you for your quote inquiry. I've reviewed your request and will provide you with detailed information about the pricing and timeline.",
          suggested_actions: ['Review quote details', 'Check shipping options', 'Verify items list'],
          requires_escalation: false,
          estimated_resolution_time: '2-4 hours'
        },
        package_issue: {
          message: "I understand your concern about your package. Let me check the current status and tracking information to provide you with an update.",
          suggested_actions: ['Check package status', 'Verify tracking info', 'Contact warehouse'],
          requires_escalation: false,
          estimated_resolution_time: '1-2 hours'
        },
        payment_problem: {
          message: "I apologize for the payment issue you're experiencing. Let me review your transaction and work on resolving this immediately.",
          suggested_actions: ['Check payment status', 'Verify billing info', 'Process refund if needed'],
          requires_escalation: ticket.context.lifetime_value > 5000,
          estimated_resolution_time: '30 minutes - 2 hours'
        },
        // Add other categories...
        shipping_question: {
          message: "I'll help you with your shipping question. Let me check the available options and provide recommendations based on your needs.",
          suggested_actions: ['Review shipping options', 'Calculate costs', 'Check delivery times'],
          requires_escalation: false,
          estimated_resolution_time: '1-3 hours'
        },
        account_access: {
          message: "I'll help you regain access to your account. For security purposes, I'll need to verify your identity first.",
          suggested_actions: ['Verify identity', 'Reset password', 'Check account status'],
          requires_escalation: false,
          estimated_resolution_time: '15-30 minutes'
        },
        technical_issue: {
          message: "Thank you for reporting this technical issue. I'll investigate the problem and provide you with a solution or workaround.",
          suggested_actions: ['Check system status', 'Review error logs', 'Test functionality'],
          requires_escalation: false,
          estimated_resolution_time: '1-4 hours'
        },
        billing_dispute: {
          message: "I understand your billing concern and will review your account charges carefully to resolve this matter.",
          suggested_actions: ['Review billing history', 'Check transaction details', 'Process adjustments'],
          requires_escalation: true,
          estimated_resolution_time: '2-24 hours'
        },
        general_inquiry: {
          message: "Thank you for contacting us. I'm here to help with any questions you may have about our services.",
          suggested_actions: ['Provide information', 'Direct to resources', 'Follow up if needed'],
          requires_escalation: false,
          estimated_resolution_time: '30 minutes - 2 hours'
        }
      };

      return suggestions[ticket.category];
    } catch (error) {
      this.handleError('getResponseSuggestions', error, { ticketId });
      return null;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const enhancedSupportService = EnhancedSupportService.getInstance();
export default enhancedSupportService;

// Export types
export type {
  SupportTicket,
  SupportMessage,
  SupportTicketContext,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketCategory,
  AgentResponse,
  EscalationEvent
};