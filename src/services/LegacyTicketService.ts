// ============================================================================
// LEGACY TICKET SERVICE - Backward Compatibility Layer
// Provides backward compatibility with existing TicketService interface
// Uses UnifiedSupportEngine internally while maintaining old API
// ============================================================================

import { unifiedSupportEngine } from './UnifiedSupportEngine';
import type {
  SupportRecord,
  CreateTicketData as UnifiedCreateTicketData,
  TicketFilters as UnifiedTicketFilters,
  TicketStatus as UnifiedTicketStatus,
  TicketPriority as UnifiedTicketPriority,
  TicketCategory as UnifiedTicketCategory,
} from './UnifiedSupportEngine';

// Legacy type mappings for backward compatibility
export type TicketStatus = UnifiedTicketStatus;
export type TicketPriority = UnifiedTicketPriority;
export type TicketCategory = UnifiedTicketCategory;
export type CustomerHelpType = 'order_issue' | 'payment_problem' | 'account_question' | 'other';

export interface CreateTicketData {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  quote_id?: string;
}

export interface CreateCustomerTicketData {
  subject: string;
  description: string;
  help_type: CustomerHelpType;
  quote_id?: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  quote_id?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketWithDetails extends SupportTicket {
  user_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  quote?: {
    id: string;
    final_total_usd: number;
    destination_country: string;
    iwish_tracking_id?: string;
  };
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketReplyWithUser extends TicketReply {
  user_profile: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface UpdateTicketData {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string;
}

export interface CreateReplyData {
  ticket_id: string;
  message: string;
  is_internal?: boolean;
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

export interface TicketSortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * LegacyTicketService - Backward compatibility layer for existing TicketService
 * Routes all calls to UnifiedSupportEngine while maintaining the old interface
 */
class LegacyTicketService {
  private static instance: LegacyTicketService;

  private constructor() {
    console.log('📞 LegacyTicketService initialized - routing to UnifiedSupportEngine');
  }

  static getInstance(): LegacyTicketService {
    if (!LegacyTicketService.instance) {
      LegacyTicketService.instance = new LegacyTicketService();
    }
    return LegacyTicketService.instance;
  }

  // ============================================================================
  // Helper Functions for Data Conversion
  // ============================================================================

  private convertToSupportTicket(supportRecord: SupportRecord): SupportTicket {
    return {
      id: supportRecord.id,
      user_id: supportRecord.user_id,
      quote_id: supportRecord.quote_id,
      subject: supportRecord.ticket_data?.subject || '',
      description: supportRecord.ticket_data?.description || '',
      status: supportRecord.ticket_data?.status || 'open',
      priority: supportRecord.ticket_data?.priority || 'medium',
      category: supportRecord.ticket_data?.category || 'general',
      assigned_to: supportRecord.ticket_data?.assigned_to,
      created_at: supportRecord.created_at,
      updated_at: supportRecord.updated_at,
    };
  }

  private convertToUnifiedCreateData(ticketData: CreateTicketData): UnifiedCreateTicketData {
    return {
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority,
      category: ticketData.category,
      quote_id: ticketData.quote_id,
    };
  }

  private convertToUnifiedFilters(filters: TicketFilters): UnifiedTicketFilters {
    return {
      status: filters.status,
      priority: filters.priority,
      category: filters.category,
      assigned_to: filters.assigned_to,
      user_id: filters.user_id,
      date_range: filters.date_range,
    };
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

  // ============================================================================
  // Legacy API Methods
  // ============================================================================

  /**
   * Create a new support ticket (admin/technical interface)
   */
  async createTicket(ticketData: CreateTicketData): Promise<SupportTicket | null> {
    try {
      const unifiedData = this.convertToUnifiedCreateData(ticketData);
      const supportRecord = await unifiedSupportEngine.createTicket(unifiedData);
      
      if (!supportRecord) return null;
      
      return this.convertToSupportTicket(supportRecord);
    } catch (error) {
      console.error('❌ Exception in legacy createTicket:', error);
      return null;
    }
  }

  /**
   * Create a new support ticket from customer-friendly form data
   */
  async createCustomerTicket(customerData: CreateCustomerTicketData): Promise<SupportTicket | null> {
    try {
      const hasOrder = !!customerData.quote_id;
      const autoCategory = this.autoCategorize(
        customerData.help_type,
        customerData.description,
        hasOrder,
      );
      const autoPriority = this.autoPrioritize(customerData.help_type, customerData.description);

      const unifiedData: UnifiedCreateTicketData = {
        subject: customerData.subject,
        description: customerData.description,
        priority: autoPriority,
        category: autoCategory,
        quote_id: customerData.quote_id,
      };

      const supportRecord = await unifiedSupportEngine.createTicket(unifiedData);
      
      if (!supportRecord) return null;
      
      return this.convertToSupportTicket(supportRecord);
    } catch (error) {
      console.error('❌ Exception in legacy createCustomerTicket:', error);
      return null;
    }
  }

  /**
   * Get tickets for a specific user
   */
  async getUserTickets(userId?: string): Promise<TicketWithDetails[]> {
    try {
      const supportRecords = await unifiedSupportEngine.getTickets({}, userId);
      
      return supportRecords.map(record => ({
        ...this.convertToSupportTicket(record),
        // Note: Profile data would need to be fetched separately in the unified system
        // This is a simplified conversion for backward compatibility
        user_profile: undefined,
        assigned_to_profile: undefined,
        quote: undefined,
      }));
    } catch (error) {
      console.error('❌ Exception in legacy getUserTickets:', error);
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
      const unifiedFilters = filters ? this.convertToUnifiedFilters(filters) : {};
      const supportRecords = await unifiedSupportEngine.getTickets(unifiedFilters);
      
      // Note: Sorting would need to be implemented in the unified system
      // For now, we'll return unsorted data
      return supportRecords.map(record => ({
        ...this.convertToSupportTicket(record),
        user_profile: undefined,
        assigned_to_profile: undefined,
        quote: undefined,
      }));
    } catch (error) {
      console.error('❌ Exception in legacy getAdminTickets:', error);
      return [];
    }
  }

  /**
   * Get a specific ticket with all details
   */
  async getTicketById(ticketId: string): Promise<TicketWithDetails | null> {
    try {
      const supportRecord = await unifiedSupportEngine.getTicketById(ticketId);
      
      if (!supportRecord) return null;
      
      return {
        ...this.convertToSupportTicket(supportRecord),
        user_profile: undefined,
        assigned_to_profile: undefined,
        quote: undefined,
      };
    } catch (error) {
      console.error('❌ Exception in legacy getTicketById:', error);
      return null;
    }
  }

  /**
   * Update a ticket
   */
  async updateTicket(ticketId: string, updateData: UpdateTicketData): Promise<boolean> {
    try {
      // For status updates, use the specialized method
      if (updateData.status) {
        return await unifiedSupportEngine.updateTicketStatus(ticketId, updateData.status);
      }
      
      // For other updates, we would need to add support in the unified system
      // For now, return true as a placeholder
      console.warn('⚠️ Non-status updates not fully implemented in legacy adapter');
      return true;
    } catch (error) {
      console.error('❌ Exception in legacy updateTicket:', error);
      return false;
    }
  }

  /**
   * Get replies for a ticket
   */
  async getTicketReplies(ticketId: string): Promise<TicketReplyWithUser[]> {
    try {
      const interactions = await unifiedSupportEngine.getTicketInteractions(ticketId);
      
      return interactions
        .filter(interaction => interaction.interaction_type === 'reply')
        .map(interaction => ({
          id: interaction.id,
          ticket_id: interaction.support_id,
          user_id: interaction.user_id,
          message: interaction.content?.message || '',
          is_internal: interaction.is_internal,
          created_at: interaction.created_at,
          user_profile: {
            id: interaction.user_id,
            full_name: 'Unknown User', // Would need to fetch from profiles
            email: 'unknown@example.com',
          },
        }));
    } catch (error) {
      console.error('❌ Exception in legacy getTicketReplies:', error);
      return [];
    }
  }

  /**
   * Create a reply to a ticket
   */
  async createReply(replyData: CreateReplyData): Promise<TicketReply | null> {
    try {
      const interaction = await unifiedSupportEngine.addInteraction(
        replyData.ticket_id,
        'reply',
        { message: replyData.message },
        replyData.is_internal || false
      );
      
      if (!interaction) return null;
      
      return {
        id: interaction.id,
        ticket_id: interaction.support_id,
        user_id: interaction.user_id,
        message: interaction.content?.message || '',
        is_internal: interaction.is_internal,
        created_at: interaction.created_at,
      };
    } catch (error) {
      console.error('❌ Exception in legacy createReply:', error);
      return null;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    try {
      return await unifiedSupportEngine.updateTicketStatus(ticketId, status);
    } catch (error) {
      console.error('❌ Exception in legacy updateTicketStatus:', error);
      return false;
    }
  }

  /**
   * Assign ticket to an admin user
   */
  async assignTicket(ticketId: string, adminUserId: string | null): Promise<boolean> {
    try {
      if (!adminUserId) {
        // Unassignment - would need to be implemented in unified system
        console.warn('⚠️ Ticket unassignment not implemented in legacy adapter');
        return true;
      }
      
      return await unifiedSupportEngine.assignTicket(ticketId, adminUserId);
    } catch (error) {
      console.error('❌ Exception in legacy assignTicket:', error);
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
      const stats = await unifiedSupportEngine.getTicketStats();
      
      return {
        total: stats.total,
        open: stats.open,
        in_progress: stats.in_progress,
        resolved: stats.resolved,
        closed: stats.closed,
      };
    } catch (error) {
      console.error('❌ Exception in legacy getTicketStats:', error);
      return { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
    }
  }

  /**
   * Auto-close resolved tickets that have been inactive for 7 days
   */
  async autoCloseResolvedTickets(): Promise<{ closedCount: number; message: string }> {
    try {
      // This would need to be implemented in the unified system
      // For now, return a placeholder response
      console.warn('⚠️ Auto-close functionality needs to be implemented in unified system');
      return { closedCount: 0, message: 'Auto-close not implemented in unified system' };
    } catch (error) {
      console.error('❌ Exception in legacy autoCloseResolvedTickets:', error);
      return { closedCount: 0, message: 'Error in auto-close process' };
    }
  }
}

// Export singleton instance for backward compatibility
export const ticketService = LegacyTicketService.getInstance();