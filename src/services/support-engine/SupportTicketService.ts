/**
 * Support Ticket Service
 * Handles ticket CRUD operations and lifecycle management
 * Decomposed from UnifiedSupportEngine for better separation of concerns
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';

// Type definitions - shared across support services
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'payment' | 'shipping' | 'refund' | 'product' | 'customs';
export type SupportSystemType = 'ticket' | 'rule' | 'template' | 'preference';
export type InteractionType = 'reply' | 'status_change' | 'assignment' | 'escalation' | 'note';

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

export interface SupportRecord {
  id: string;
  user_id: string;
  quote_id?: string;
  system_type: SupportSystemType;
  ticket_data?: TicketData;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface TicketUpdateData {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string;
  metadata?: any;
}

export interface TicketValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SupportTicketService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Status transition validation rules
  private readonly STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    open: ['in_progress', 'pending', 'resolved'],
    in_progress: ['pending', 'resolved', 'open'],
    pending: ['in_progress', 'open', 'closed'],
    resolved: ['closed', 'open'], // Allow reopening if needed
    closed: [], // Terminal state
  };

  constructor() {
    logger.info('SupportTicketService initialized');
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData: CreateTicketData, userId?: string): Promise<SupportRecord | null> {
    try {
      // Validate ticket data
      const validation = this.validateTicketData(ticketData);
      if (!validation.isValid) {
        logger.error('Ticket validation failed:', validation.errors);
        throw new Error(`Ticket validation failed: ${validation.errors.join(', ')}`);
      }

      // Get current user if not provided
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User authentication required');
      }

      const ticket: TicketData = {
        subject: ticketData.subject.trim(),
        description: ticketData.description.trim(),
        status: 'open',
        priority: ticketData.priority || 'medium',
        category: ticketData.category || 'general',
        metadata: {
          created_at: new Date().toISOString(),
          source: 'web',
        }
      };

      const supportRecord = {
        user_id: currentUserId,
        quote_id: ticketData.quote_id,
        system_type: 'ticket' as SupportSystemType,
        ticket_data: ticket,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('support_system')
        .insert([supportRecord])
        .select()
        .single();

      if (error) {
        logger.error('Failed to create ticket:', error);
        throw error;
      }

      logger.info('Ticket created successfully:', { ticketId: data.id });
      this.clearCache('tickets');

      return data;

    } catch (error) {
      logger.error('Ticket creation error:', error);
      Sentry.captureException(error);
      return null;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SupportRecord | null> {
    try {
      const cacheKey = this.getCacheKey('ticket', { ticketId });
      const cached = this.getFromCache<SupportRecord>(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('support_system')
        .select('*')
        .eq('id', ticketId)
        .eq('system_type', 'ticket')
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      logger.error('Failed to get ticket:', error);
      return null;
    }
  }

  /**
   * Get tickets with filters
   */
  async getTickets(
    filters: TicketFilters = {},
    page = 1,
    limit = 50
  ): Promise<{ tickets: SupportRecord[]; total: number; page: number; limit: number }> {
    try {
      const cacheKey = this.getCacheKey('tickets', { filters, page, limit });
      const cached = this.getFromCache<any>(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from('support_system')
        .select('*', { count: 'exact' })
        .eq('system_type', 'ticket')
        .eq('is_active', true);

      // Apply filters
      if (filters.status?.length) {
        query = query.in('ticket_data->status', filters.status);
      }

      if (filters.priority?.length) {
        query = query.in('ticket_data->priority', filters.priority);
      }

      if (filters.category?.length) {
        query = query.in('ticket_data->category', filters.category);
      }

      if (filters.assigned_to) {
        query = query.eq('ticket_data->assigned_to', filters.assigned_to);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const result = {
        tickets: data || [],
        total: count || 0,
        page,
        limit
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Failed to get tickets:', error);
      return {
        tickets: [],
        total: 0,
        page,
        limit
      };
    }
  }

  /**
   * Update ticket data
   */
  async updateTicket(
    ticketId: string,
    updateData: TicketUpdateData,
    userId?: string
  ): Promise<SupportRecord | null> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User authentication required');
      }

      // Get current ticket
      const currentTicket = await this.getTicketById(ticketId);
      if (!currentTicket) {
        throw new Error('Ticket not found');
      }

      // Validate status transition if status is being changed
      if (updateData.status && updateData.status !== currentTicket.ticket_data?.status) {
        const isValidTransition = this.isValidTransition(
          currentTicket.ticket_data?.status as TicketStatus,
          updateData.status
        );

        if (!isValidTransition) {
          throw new Error(`Invalid status transition from ${currentTicket.ticket_data?.status} to ${updateData.status}`);
        }
      }

      // Merge update data with existing ticket data
      const updatedTicketData = {
        ...currentTicket.ticket_data,
        ...updateData,
        metadata: {
          ...currentTicket.ticket_data?.metadata,
          ...updateData.metadata,
          last_status_change: updateData.status ? new Date().toISOString() : currentTicket.ticket_data?.metadata?.last_status_change,
        }
      };

      const { data, error } = await supabase
        .from('support_system')
        .update({
          ticket_data: updatedTicketData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Ticket updated successfully:', { ticketId, updateData });
      this.clearCache('ticket');
      this.clearCache('tickets');

      return data;

    } catch (error) {
      logger.error('Ticket update error:', error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) ticket
   */
  async deleteTicket(ticketId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_system')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      logger.info('Ticket deleted successfully:', { ticketId });
      this.clearCache();
      return true;

    } catch (error) {
      logger.error('Ticket deletion error:', error);
      return false;
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(userId?: string): Promise<{
    total: number;
    open: number;
    in_progress: number;
    pending: number;
    resolved: number;
    closed: number;
    by_priority: Record<TicketPriority, number>;
    by_category: Record<TicketCategory, number>;
    avg_resolution_time: number;
  }> {
    try {
      const cacheKey = this.getCacheKey('stats', { userId });
      const cached = this.getFromCache<any>(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from('support_system')
        .select('ticket_data')
        .eq('system_type', 'ticket')
        .eq('is_active', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Initialize stats
      const stats = {
        total: data?.length || 0,
        open: 0,
        in_progress: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        by_priority: { low: 0, medium: 0, high: 0, urgent: 0 } as Record<TicketPriority, number>,
        by_category: { general: 0, payment: 0, shipping: 0, refund: 0, product: 0, customs: 0 } as Record<TicketCategory, number>,
        avg_resolution_time: 0,
      };

      let totalResolutionTime = 0;
      let resolvedCount = 0;

      // Process tickets
      data?.forEach((record) => {
        const ticketData = record.ticket_data as TicketData;
        
        // Count by status
        stats[ticketData.status as keyof typeof stats] = (stats[ticketData.status as keyof typeof stats] as number) + 1;
        
        // Count by priority
        stats.by_priority[ticketData.priority]++;
        
        // Count by category
        stats.by_category[ticketData.category]++;

        // Calculate resolution time
        if (ticketData.status === 'resolved' && ticketData.metadata?.resolution_time) {
          totalResolutionTime += ticketData.metadata.resolution_time;
          resolvedCount++;
        }
      });

      // Calculate average resolution time
      stats.avg_resolution_time = resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;

      this.setCache(cacheKey, stats);
      return stats;

    } catch (error) {
      logger.error('Failed to get ticket stats:', error);
      return {
        total: 0,
        open: 0,
        in_progress: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
        by_category: { general: 0, payment: 0, shipping: 0, refund: 0, product: 0, customs: 0 },
        avg_resolution_time: 0,
      };
    }
  }

  /**
   * Status transition validation
   */
  private isValidTransition(currentStatus: TicketStatus, newStatus: TicketStatus): boolean {
    const allowedTransitions = this.STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get allowed transitions for current status
   */
  getAllowedTransitions(currentStatus: TicketStatus): TicketStatus[] {
    return this.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Get smart status suggestions
   */
  getStatusSuggestions(currentStatus: TicketStatus, isAdmin: boolean = true): {
    suggested: TicketStatus | null;
    reason: string;
    all: TicketStatus[];
  } {
    const allowedTransitions = this.getAllowedTransitions(currentStatus);

    let suggested: TicketStatus | null = null;
    let reason = '';

    // Smart suggestions based on current status
    switch (currentStatus) {
      case 'open':
        suggested = 'in_progress';
        reason = 'Start working on this ticket';
        break;
      case 'in_progress':
        suggested = isAdmin ? 'resolved' : 'pending';
        reason = isAdmin ? 'Mark as resolved if issue is fixed' : 'Request customer feedback';
        break;
      case 'pending':
        suggested = 'in_progress';
        reason = 'Resume work on this ticket';
        break;
      case 'resolved':
        suggested = 'closed';
        reason = 'Close ticket after customer confirmation';
        break;
    }

    return {
      suggested,
      reason,
      all: allowedTransitions
    };
  }

  /**
   * Validate ticket data
   */
  private validateTicketData(ticketData: CreateTicketData): TicketValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Subject validation
    if (!ticketData.subject || ticketData.subject.trim().length === 0) {
      errors.push('Subject is required');
    } else if (ticketData.subject.length < 5) {
      warnings.push('Subject is very short');
    } else if (ticketData.subject.length > 200) {
      errors.push('Subject is too long (max 200 characters)');
    }

    // Description validation
    if (!ticketData.description || ticketData.description.trim().length === 0) {
      errors.push('Description is required');
    } else if (ticketData.description.length < 10) {
      warnings.push('Description is very short');
    } else if (ticketData.description.length > 5000) {
      errors.push('Description is too long (max 5000 characters)');
    }

    // Priority validation
    if (ticketData.priority && !['low', 'medium', 'high', 'urgent'].includes(ticketData.priority)) {
      errors.push('Invalid priority value');
    }

    // Category validation
    if (ticketData.category && !['general', 'payment', 'shipping', 'refund', 'product', 'customs'].includes(ticketData.category)) {
      errors.push('Invalid category value');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get current authenticated user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      logger.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Cache management utilities
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `ticket_${operation}_${JSON.stringify(params)}`;
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
    logger.info('SupportTicketService cleanup completed');
  }
}

export default SupportTicketService;