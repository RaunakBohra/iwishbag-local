// ============================================================================
// TICKET SERVICE - Customer Support System
// Handles all ticket CRUD operations, status management, and integrations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { ticketNotificationService } from './TicketNotificationService';
import { unifiedSupportEngine } from './UnifiedSupportEngine';
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
   * Transform unified support record to legacy ticket format
   */
  private transformToLegacyTicket(supportRecord: any): SupportTicket {
    return {
      id: supportRecord.id,
      user_id: supportRecord.user_id,
      quote_id: supportRecord.quote_id || null,
      subject: supportRecord.ticket_data?.subject || '',
      description: supportRecord.ticket_data?.description || '',
      priority: supportRecord.ticket_data?.priority || 'medium',
      category: supportRecord.ticket_data?.category || 'general',
      status: supportRecord.ticket_data?.status || 'open',
      assigned_to: supportRecord.ticket_data?.assigned_to || null,
      created_at: supportRecord.created_at,
      updated_at: supportRecord.updated_at,
    };
  }

  /**
   * Transform unified support record to legacy TicketWithDetails format
   */
  private transformToLegacyTicketWithDetails(supportRecord: any): TicketWithDetails {
    const baseTicket = this.transformToLegacyTicket(supportRecord);
    
    return {
      ...baseTicket,
      user_profile: null, // Would need to fetch separately if needed
      assigned_to_profile: null, // Would need to fetch separately if needed
      quote: supportRecord.quote ? {
        id: supportRecord.quote.id,
        display_id: supportRecord.quote.display_id,
        destination_country: supportRecord.quote.destination_country,
        status: supportRecord.quote.status,
        final_total_usd: supportRecord.quote.final_total_usd,
        iwish_tracking_id: supportRecord.quote.iwish_tracking_id,
        tracking_status: supportRecord.quote.tracking_status,
        estimated_delivery_date: supportRecord.quote.estimated_delivery_date,
        items: supportRecord.quote.items,
        customer_data: supportRecord.quote.customer_data,
      } : null,
    };
  }

  /**
   * Auto-close resolved tickets that have been inactive for 7 days
   * and pending tickets that have been waiting for customer response for 5 days
   */
  async autoCloseResolvedTickets(): Promise<{ closedCount: number; message: string }> {
    try {
      console.log('🤖 Starting auto-close process for inactive tickets...');
      
      // Find resolved tickets older than 7 days with no recent activity
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Find pending tickets older than 5 days (customer hasn't responded)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      // Get resolved tickets for auto-closure
      const resolvedTickets = await unifiedSupportEngine.getTickets({
        status: ['resolved'],
        date_range: {
          start: '1970-01-01T00:00:00Z', // Beginning of time
          end: sevenDaysAgo.toISOString()
        }
      });

      // Get pending tickets for auto-closure
      const pendingTickets = await unifiedSupportEngine.getTickets({
        status: ['pending'],
        date_range: {
          start: '1970-01-01T00:00:00Z', // Beginning of time
          end: fiveDaysAgo.toISOString()
        }
      });

      let closedCount = 0;
      const messages: string[] = [];

      // Auto-close resolved tickets (7 days)
      if (resolvedTickets && resolvedTickets.length > 0) {
        for (const ticket of resolvedTickets) {
          const success = await unifiedSupportEngine.updateTicketStatus(
            ticket.id, 
            'closed', 
            'Auto-closed after 7 days of inactivity'
          );
          if (success) closedCount++;
        }
        messages.push(`${resolvedTickets.length} resolved tickets auto-closed after 7 days`);
      }

      // Auto-close pending tickets (5 days)
      if (pendingTickets && pendingTickets.length > 0) {
        for (const ticket of pendingTickets) {
          const success = await unifiedSupportEngine.updateTicketStatus(
            ticket.id, 
            'closed', 
            'Auto-closed after 5 days waiting for customer response'
          );
          if (success) closedCount++;
        }
        messages.push(`${pendingTickets.length} pending tickets auto-closed after 5 days`);
      }

      if (closedCount === 0) {
        console.log('✅ No tickets found for auto-closure');
        return { closedCount: 0, message: 'No tickets found for auto-closure' };
      }

      const finalMessage = messages.join('; ');
      console.log(`✅ Auto-closed ${closedCount} tickets: ${finalMessage}`);
      return { 
        closedCount, 
        message: `Successfully auto-closed ${closedCount} tickets: ${finalMessage}` 
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

      // Use unified support engine to create ticket
      const supportRecord = await unifiedSupportEngine.createTicket({
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        quote_id: ticketData.quote_id,
      });

      if (!supportRecord) {
        console.error('❌ Failed to create ticket via unified support engine');
        return null;
      }

      console.log('✅ Ticket created successfully via unified engine:', supportRecord.id);
      this.clearCache();

      return this.transformToLegacyTicket(supportRecord);
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

      const hasOrder = !!customerData.quote_id;
      const autoCategory = this.autoCategorize(
        customerData.help_type,
        customerData.description,
        hasOrder,
      );
      const autoPriority = this.autoPrioritize(customerData.help_type, customerData.description);

      // Use unified support engine to create ticket
      const supportRecord = await unifiedSupportEngine.createTicket({
        subject: customerData.subject,
        description: customerData.description,
        priority: autoPriority,
        category: autoCategory,
        quote_id: customerData.quote_id,
      });

      if (!supportRecord) {
        console.error('❌ Failed to create customer ticket via unified support engine');
        return null;
      }

      console.log(
        '✅ Customer ticket created successfully via unified engine:',
        supportRecord.id,
        `[${autoCategory}/${autoPriority}]`,
      );
      this.clearCache();

      return this.transformToLegacyTicket(supportRecord);
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

      // Use unified support engine to get tickets
      const supportRecords = await unifiedSupportEngine.getTickets({}, userId);

      if (!supportRecords || supportRecords.length === 0) {
        console.log('✅ No tickets found for user');
        return [];
      }

      // Transform to legacy format (simplified - would need additional queries for full details)
      const tickets = supportRecords.map(record => this.transformToLegacyTicketWithDetails(record));

      console.log(`✅ Fetched ${tickets.length} tickets via unified engine`);
      return tickets;
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

      // Use unified support engine to get tickets with filters
      const supportRecords = await unifiedSupportEngine.getTickets(filters || {});

      if (!supportRecords || supportRecords.length === 0) {
        console.log('✅ No admin tickets found');
        return [];
      }

      // Transform to legacy format (simplified - would need additional queries for full details)
      let tickets = supportRecords.map(record => this.transformToLegacyTicketWithDetails(record));

      // Apply sorting if specified (simple implementation)
      if (sort) {
        tickets.sort((a, b) => {
          const aValue = a[sort.field as keyof TicketWithDetails] as any;
          const bValue = b[sort.field as keyof TicketWithDetails] as any;
          
          if (sort.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }

      console.log(`✅ Fetched ${tickets.length} admin tickets via unified engine`);
      return tickets;
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

      // Use unified support engine to get ticket by ID
      const supportRecord = await unifiedSupportEngine.getTicketById(ticketId);

      if (!supportRecord) {
        console.log('❌ Ticket not found via unified engine:', ticketId);
        return null;
      }

      // Transform to legacy format (simplified - would need additional queries for full details)
      const ticket = this.transformToLegacyTicketWithDetails(supportRecord);

      console.log('✅ Ticket fetched successfully via unified engine:', ticket.id);
      return ticket;
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

      // Use unified support engine to add interaction (reply)
      const interaction = await unifiedSupportEngine.addInteraction(
        replyData.ticket_id,
        'reply',
        { message: replyData.message },
        replyData.is_internal || false
      );

      if (!interaction) {
        console.error('❌ Failed to create reply via unified support engine');
        return null;
      }

      console.log('✅ Reply created successfully via unified engine:', interaction.id);
      this.clearCache();

      // Transform to legacy format for backward compatibility
      const legacyReply: TicketReply = {
        id: interaction.id,
        ticket_id: replyData.ticket_id,
        user_id: interaction.user_id,
        message: interaction.content?.message || replyData.message,
        is_internal: interaction.is_internal,
        created_at: interaction.created_at,
        updated_at: interaction.created_at,
      };

      return legacyReply;
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

      // Use unified support engine to update ticket status
      const success = await unifiedSupportEngine.updateTicketStatus(
        ticketId, 
        status, 
        'Status updated via legacy TicketService'
      );

      if (success) {
        console.log('✅ Ticket status updated successfully via unified engine');
        this.clearCache();
      } else {
        console.error('❌ Failed to update ticket status via unified engine');
      }

      return success;
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

      // Use unified support engine to assign ticket
      const success = await unifiedSupportEngine.assignTicket(
        ticketId, 
        adminUserId || '', 
        'Ticket assigned via legacy TicketService'
      );

      if (success) {
        console.log('✅ Ticket assigned successfully via unified engine');
        this.clearCache();
      } else {
        console.error('❌ Failed to assign ticket via unified engine');
      }

      return success;
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

      // Use unified support engine to get ticket stats
      const stats = await unifiedSupportEngine.getTicketStats();

      // Transform to legacy format (simplified version)
      const legacyStats = {
        total: stats.total,
        open: stats.open,
        in_progress: stats.in_progress,
        resolved: stats.resolved,
        closed: stats.closed,
      };

      console.log('✅ Ticket stats via unified engine:', legacyStats);
      return legacyStats;
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
