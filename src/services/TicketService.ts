// ============================================================================
// TICKET SERVICE - Customer Support System
// Handles all ticket CRUD operations, status management, and integrations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { ticketNotificationService } from './TicketNotificationService';
import type {
  SupportTicket,
  TicketReply,
  TicketWithDetails,
  TicketReplyWithUser,
  CreateTicketData,
  CreateCustomerTicketData,
  UpdateTicketData,
  CreateReplyData,
  TicketFilters,
  TicketSortOptions,
  TicketStatus,
  CustomerHelpType,
  TicketCategory,
  TicketPriority,
} from '@/types/ticket';

/**
 * TicketService - Singleton service for customer support ticket operations
 * Provides CRUD operations, status management, and admin features
 */
class TicketService {
  private static instance: TicketService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * Auto-close resolved tickets that have been inactive for 7 days
   */
  async autoCloseResolvedTickets(): Promise<{ closedCount: number; message: string }> {
    try {
      console.log('🤖 Starting auto-close process for resolved tickets...');
      
      // Find resolved tickets older than 7 days with no recent activity
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: resolvedTickets, error: fetchError } = await supabase
        .from('support_tickets')
        .select('id, subject, user_id, updated_at')
        .eq('status', 'resolved')
        .lt('updated_at', sevenDaysAgo.toISOString());

      if (fetchError) {
        console.error('❌ Error fetching resolved tickets:', fetchError);
        throw new Error(`Failed to fetch resolved tickets: ${fetchError.message}`);
      }

      if (!resolvedTickets || resolvedTickets.length === 0) {
        console.log('✅ No resolved tickets found for auto-closure');
        return { closedCount: 0, message: 'No resolved tickets found for auto-closure' };
      }

      // Update tickets to closed status
      const ticketIds = resolvedTickets.map(ticket => ticket.id);
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .in('id', ticketIds);

      if (updateError) {
        console.error('❌ Error updating tickets to closed:', updateError);
        throw new Error(`Failed to close tickets: ${updateError.message}`);
      }

      console.log(`✅ Auto-closed ${resolvedTickets.length} resolved tickets`);
      return { 
        closedCount: resolvedTickets.length, 
        message: `Successfully auto-closed ${resolvedTickets.length} resolved tickets` 
      };

    } catch (error) {
      console.error('❌ Auto-close process failed:', error);
      throw error;
    }
  }

  /**
   * Auto-categorization logic based on customer help type and description
   */
  private autoCategorize(
    helpType: CustomerHelpType,
    description: string,
    hasOrder: boolean,
  ): TicketCategory {
    const descLower = description.toLowerCase();

    switch (helpType) {
      case 'order_issue':
        if (descLower.includes('refund') || descLower.includes('return')) return 'refund';
        if (
          descLower.includes('track') ||
          descLower.includes('delivery') ||
          descLower.includes('shipping')
        )
          return 'shipping';
        if (descLower.includes('custom') || descLower.includes('duty') || descLower.includes('tax'))
          return 'customs';
        return hasOrder ? 'shipping' : 'general';

      case 'payment_problem':
        return 'payment';

      case 'account_question':
        return 'general';

      default:
        // Smart detection from description
        if (
          descLower.includes('payment') ||
          descLower.includes('charge') ||
          descLower.includes('bill')
        )
          return 'payment';
        if (
          descLower.includes('ship') ||
          descLower.includes('deliver') ||
          descLower.includes('track')
        )
          return 'shipping';
        if (descLower.includes('refund') || descLower.includes('return')) return 'refund';
        if (descLower.includes('product') || descLower.includes('item')) return 'product';
        return 'general';
    }
  }

  /**
   * Auto-prioritization logic based on customer help type and description
   */
  private autoPrioritize(helpType: CustomerHelpType, description: string): TicketPriority {
    const descLower = description.toLowerCase();
    const urgentKeywords = [
      'urgent',
      'emergency',
      'asap',
      'immediately',
      'stuck',
      'blocked',
      'lost',
    ];
    const highKeywords = ['payment', 'refund', 'money', 'charge', 'billing'];

    if (urgentKeywords.some((keyword) => descLower.includes(keyword))) return 'urgent';
    if (
      helpType === 'payment_problem' ||
      highKeywords.some((keyword) => descLower.includes(keyword))
    )
      return 'high';
    if (helpType === 'order_issue') return 'medium';
    return 'low';
  }

  static getInstance(): TicketService {
    if (!TicketService.instance) {
      TicketService.instance = new TicketService();
    }
    return TicketService.instance;
  }

  /**
   * Create a new support ticket (admin/technical interface)
   */
  async createTicket(ticketData: CreateTicketData): Promise<SupportTicket | null> {
    try {
      console.log('🎫 Creating new support ticket:', ticketData);

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ User not authenticated:', authError);
        throw new Error('Authentication required to create support ticket');
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          quote_id: ticketData.quote_id || null,
          subject: ticketData.subject,
          description: ticketData.description,
          priority: ticketData.priority,
          category: ticketData.category,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating ticket:', error);
        return null;
      }

      console.log('✅ Ticket created successfully:', data.id);
      this.clearCache();

      // Send notifications for the new ticket
      try {
        // Get full ticket data with user profile for notifications
        const ticketWithProfile = await this.getTicketById(data.id);
        if (ticketWithProfile) {
          await ticketNotificationService.notifyTicketCreated(ticketWithProfile as any);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send ticket creation notifications:', notificationError);
        // Don't fail the ticket creation if notifications fail
      }

      return data as SupportTicket;
    } catch (error) {
      console.error('❌ Exception in createTicket:', error);
      return null;
    }
  }

  /**
   * Create a new support ticket from customer-friendly form data
   */
  async createCustomerTicket(
    customerData: CreateCustomerTicketData,
  ): Promise<SupportTicket | null> {
    try {
      console.log('🎫 Creating customer support ticket:', customerData);

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ User not authenticated:', authError);
        throw new Error('Authentication required to create support ticket');
      }

      const hasOrder = !!customerData.quote_id;
      const autoCategory = this.autoCategorize(
        customerData.help_type,
        customerData.description,
        hasOrder,
      );
      const autoPriority = this.autoPrioritize(customerData.help_type, customerData.description);

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          quote_id: customerData.quote_id || null,
          subject: customerData.subject,
          description: customerData.description,
          priority: autoPriority,
          category: autoCategory,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating customer ticket:', error);
        return null;
      }

      console.log(
        '✅ Customer ticket created successfully:',
        data.id,
        `[${autoCategory}/${autoPriority}]`,
      );
      this.clearCache();

      // Send notifications for the new customer ticket
      try {
        // Get full ticket data with user profile for notifications
        const ticketWithProfile = await this.getTicketById(data.id);
        if (ticketWithProfile) {
          await ticketNotificationService.notifyTicketCreated(ticketWithProfile as any);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send customer ticket creation notifications:', notificationError);
        // Don't fail the ticket creation if notifications fail
      }

      return data as SupportTicket;
    } catch (error) {
      console.error('❌ Exception in createCustomerTicket:', error);
      return null;
    }
  }

  /**
   * Get tickets for a specific user
   */
  async getUserTickets(userId?: string): Promise<TicketWithDetails[]> {
    try {
      console.log('📋 Fetching user tickets for:', userId);

      let query = supabase
        .from('support_tickets')
        .select(
          `
          *,
          user_profile:profiles!support_tickets_user_id_fkey(id, full_name, email),
          assigned_to_profile:profiles!support_tickets_assigned_to_fkey(id, full_name, email),
          quote:quotes!support_tickets_quote_id_fkey(id, final_total_usd, destination_country, iwish_tracking_id)
        `,
        )
        .order('created_at', { ascending: false });

      // If userId is provided, filter by it (for customer view)
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching user tickets:', error);
        return [];
      }

      console.log(`✅ Fetched ${data?.length || 0} tickets`);
      return data as TicketWithDetails[];
    } catch (error) {
      console.error('❌ Exception in getUserTickets:', error);
      return [];
    }
  }

  /**
   * Get all tickets for admin with filtering and sorting
   */
  async getAdminTickets(
    filters?: TicketFilters,
    sort?: TicketSortOptions,
  ): Promise<TicketWithDetails[]> {
    try {
      console.log('👨‍💼 Fetching admin tickets with filters:', filters, sort);

      let query = supabase.from('support_tickets').select(`
          *,
          user_profile:profiles!support_tickets_user_id_fkey(id, full_name, email),
          assigned_to_profile:profiles!support_tickets_assigned_to_fkey(id, full_name, email),
          quote:quotes!support_tickets_quote_id_fkey(id, final_total_usd, destination_country, iwish_tracking_id)
        `);

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        if (filters.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority);
        }
        if (filters.category && filters.category.length > 0) {
          query = query.in('category', filters.category);
        }
        if (filters.assigned_to) {
          query = query.eq('assigned_to', filters.assigned_to);
        }
        if (filters.user_id) {
          query = query.eq('user_id', filters.user_id);
        }
        if (filters.date_range) {
          query = query
            .gte('created_at', filters.date_range.start)
            .lte('created_at', filters.date_range.end);
        }
      }

      // Apply sorting
      if (sort) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching admin tickets:', error);
        return [];
      }

      console.log(`✅ Fetched ${data?.length || 0} admin tickets`);
      return data as TicketWithDetails[];
    } catch (error) {
      console.error('❌ Exception in getAdminTickets:', error);
      return [];
    }
  }

  /**
   * Get a specific ticket with all details
   */
  async getTicketById(ticketId: string): Promise<TicketWithDetails | null> {
    try {
      console.log('🔍 Fetching ticket by ID:', ticketId);

      const { data, error } = await supabase
        .from('support_tickets')
        .select(
          `
          *,
          user_profile:profiles!support_tickets_user_id_fkey(id, full_name, email),
          assigned_to_profile:profiles!support_tickets_assigned_to_fkey(id, full_name, email),
          quote:quotes!support_tickets_quote_id_fkey(id, final_total_usd, destination_country, iwish_tracking_id)
        `,
        )
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('❌ Error fetching ticket:', error);
        return null;
      }

      console.log('✅ Ticket fetched successfully:', data.id);
      return data as TicketWithDetails;
    } catch (error) {
      console.error('❌ Exception in getTicketById:', error);
      return null;
    }
  }

  /**
   * Update a ticket
   */
  async updateTicket(ticketId: string, updateData: UpdateTicketData): Promise<boolean> {
    try {
      console.log('📝 Updating ticket:', ticketId, updateData);

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        console.error('❌ Error updating ticket:', error);
        return false;
      }

      console.log('✅ Ticket updated successfully');
      this.clearCache();
      return true;
    } catch (error) {
      console.error('❌ Exception in updateTicket:', error);
      return false;
    }
  }

  /**
   * Get replies for a ticket
   */
  async getTicketReplies(ticketId: string): Promise<TicketReplyWithUser[]> {
    try {
      console.log('💬 Fetching replies for ticket:', ticketId);

      const { data, error } = await supabase
        .from('ticket_replies')
        .select(
          `
          *,
          user_profile:profiles!ticket_replies_user_id_fkey(id, full_name, email)
        `,
        )
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching ticket replies:', error);
        return [];
      }

      console.log(`✅ Fetched ${data?.length || 0} replies`);
      return data as TicketReplyWithUser[];
    } catch (error) {
      console.error('❌ Exception in getTicketReplies:', error);
      return [];
    }
  }

  /**
   * Create a reply to a ticket
   */
  async createReply(replyData: CreateReplyData): Promise<TicketReply | null> {
    try {
      console.log('💭 Creating ticket reply:', replyData);

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ User not authenticated:', authError);
        throw new Error('Authentication required to create reply');
      }

      const { data, error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: replyData.ticket_id,
          user_id: user.id,
          message: replyData.message,
          is_internal: replyData.is_internal || false,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating reply:', error);
        return null;
      }

      // Update ticket's updated_at timestamp
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', replyData.ticket_id);

      console.log('✅ Reply created successfully:', data.id);
      this.clearCache();

      // Send notifications for the new reply
      try {
        // Get ticket data with user profile for notifications
        const ticket = await this.getTicketById(replyData.ticket_id);
        if (ticket) {
          // Determine if this is a customer or admin reply
          const isCustomerReply = user.id === ticket.user_id;
          
          const replyWithProfile = {
            id: data.id,
            message: replyData.message,
            user_id: user.id,
            created_at: data.created_at,
            user_profile: {
              id: user.id,
              // We'll use the ticket's user profile data for the customer
              // For admin replies, we might not have the admin profile readily available
              full_name: isCustomerReply ? ticket.user_profile?.full_name : undefined,
              email: isCustomerReply ? ticket.user_profile?.email : undefined,
            },
          };

          await ticketNotificationService.notifyTicketReply(
            ticket as any,
            replyWithProfile as any,
            isCustomerReply
          );
        }
      } catch (notificationError) {
        console.error('❌ Failed to send reply notifications:', notificationError);
        // Don't fail the reply creation if notifications fail
      }

      return data as TicketReply;
    } catch (error) {
      console.error('❌ Exception in createReply:', error);
      return null;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    try {
      console.log('🔄 Updating ticket status:', ticketId, status);

      // Get current ticket data before update to compare status
      const currentTicket = await this.getTicketById(ticketId);
      const oldStatus = currentTicket?.status;

      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) {
        console.error('❌ Error updating ticket status:', error);
        return false;
      }

      console.log('✅ Ticket status updated successfully');
      this.clearCache();

      // Send notification for status change
      try {
        if (oldStatus && oldStatus !== status) {
          // Get updated ticket data with user profile for notifications
          const updatedTicket = await this.getTicketById(ticketId);
          if (updatedTicket) {
            if (status === 'closed') {
              await ticketNotificationService.notifyTicketClosed(updatedTicket as any);
            } else {
              await ticketNotificationService.notifyTicketStatusUpdate(
                updatedTicket as any,
                oldStatus,
                status
              );
            }
          }
        }
      } catch (notificationError) {
        console.error('❌ Failed to send status update notifications:', notificationError);
        // Don't fail the status update if notifications fail
      }

      return true;
    } catch (error) {
      console.error('❌ Exception in updateTicketStatus:', error);
      return false;
    }
  }

  /**
   * Assign ticket to an admin user
   */
  async assignTicket(ticketId: string, adminUserId: string | null): Promise<boolean> {
    try {
      console.log('👤 Assigning ticket:', ticketId, 'to:', adminUserId);

      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to: adminUserId })
        .eq('id', ticketId);

      if (error) {
        console.error('❌ Error assigning ticket:', error);
        return false;
      }

      console.log('✅ Ticket assigned successfully');
      this.clearCache();
      return true;
    } catch (error) {
      console.error('❌ Exception in assignTicket:', error);
      return false;
    }
  }

  /**
   * Get ticket statistics for dashboard
   */
  async getTicketStats(): Promise<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  }> {
    try {
      console.log('📊 Fetching ticket statistics');

      const { data, error } = await supabase.from('support_tickets').select('status');

      if (error) {
        console.error('❌ Error fetching ticket stats:', error);
        return { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
      }

      const stats = {
        total: data.length,
        open: data.filter((t) => t.status === 'open').length,
        in_progress: data.filter((t) => t.status === 'in_progress').length,
        resolved: data.filter((t) => t.status === 'resolved').length,
        closed: data.filter((t) => t.status === 'closed').length,
      };

      console.log('✅ Ticket stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Exception in getTicketStats:', error);
      return { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
    }
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Ticket service cache cleared');
  }
}

// Export singleton instance
export const ticketService = TicketService.getInstance();
