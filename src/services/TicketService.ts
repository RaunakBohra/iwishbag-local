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
      display_id: supportRecord.display_id || null,
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
      quote: supportRecord.quote
        ? {
            id: supportRecord.quote.id,
            display_id: supportRecord.quote.quote_number,
            destination_country: supportRecord.quote.destination_country,
            status: supportRecord.quote.status,
            final_total_origincurrency: supportRecord.quote.final_total_origincurrency,
            iwish_tracking_id: null, // Not available in quotes_v2
            tracking_status: null, // Not available in quotes_v2
            estimated_delivery_date: null, // Not available in quotes_v2
            items: supportRecord.quote.items,
            customer_data: {
              email: supportRecord.quote.customer_email,
              name: supportRecord.quote.customer_name
            },
          }
        : null,
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
          end: sevenDaysAgo.toISOString(),
        },
      });

      // Get pending tickets for auto-closure
      const pendingTickets = await unifiedSupportEngine.getTickets({
        status: ['pending'],
        date_range: {
          start: '1970-01-01T00:00:00Z', // Beginning of time
          end: fiveDaysAgo.toISOString(),
        },
      });

      let closedCount = 0;
      const messages: string[] = [];

      // Auto-close resolved tickets (7 days)
      if (resolvedTickets && resolvedTickets.length > 0) {
        for (const ticket of resolvedTickets) {
          const success = await unifiedSupportEngine.updateTicketStatus(
            ticket.id,
            'closed',
            'Auto-closed after 7 days of inactivity',
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
            'Auto-closed after 5 days waiting for customer response',
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
        message: `Successfully auto-closed ${closedCount} tickets: ${finalMessage}`,
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
      const tickets = supportRecords.map((record) =>
        this.transformToLegacyTicketWithDetails(record),
      );

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

      // Transform to legacy format with user profiles and quotes
      const tickets = await Promise.all(
        supportRecords.map(async (record) => {
          const baseTicket = this.transformToLegacyTicketWithDetails(record);
          
          // Fetch user profile separately
          if (record.user_id) {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, country, preferred_display_currency, created_at')
                .eq('id', record.user_id)
                .single();
              
              if (profileError) {
                console.warn('Profile query error for ticket:', record.id, profileError);
              }
              
              if (profile) {
                baseTicket.user_profile = profile;
                console.log('✅ Profile found for ticket:', record.id, profile.full_name || profile.email);
              } else {
                console.warn('❌ No profile found for user_id:', record.user_id, 'ticket:', record.id);
              }
            } catch (error) {
              console.error('❌ Exception fetching user profile for ticket:', record.id, error);
            }
          } else {
            console.warn('❌ No user_id found for ticket:', record.id);
          }
          
          // Fetch quote separately if it exists
          if (record.quote_id) {
            try {
              const { data: quote } = await supabase
                .from('quotes_v2')
                .select(`
                  id,
                  quote_number,
                  destination_country,
                  origin_country,
                  status,
                  final_total_origincurrency,
                  items,
                  customer_email,
                  customer_name,
                  created_at
                `)
                .eq('id', record.quote_id)
                .single();
              
              if (quote) {
                baseTicket.quote = {
                  id: quote.id,
                  display_id: quote.quote_number,
                  destination_country: quote.destination_country,
                  origin_country: quote.origin_country,
                  status: quote.status,
                  final_total_origincurrency: quote.final_total_origincurrency,
                  iwish_tracking_id: null,
                  tracking_status: null,
                  estimated_delivery_date: null,
                  created_at: quote.created_at,
                  items: quote.items,
                  customer_data: {
                    email: quote.customer_email,
                    name: quote.customer_name
                  }
                };
              }
            } catch (error) {
              console.warn('Failed to fetch quote for ticket:', record.id);
            }
          }
          
          return baseTicket;
        })
      );

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

      // Transform to legacy format with full profile and quote details
      const ticket = this.transformToLegacyTicketWithDetails(supportRecord);

      // Fetch user profile separately (same logic as getAdminTickets)
      if (supportRecord.user_id) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, country, preferred_display_currency, created_at')
            .eq('id', supportRecord.user_id)
            .single();
          
          if (profileError) {
            console.warn('Profile query error for ticket detail:', ticketId, profileError);
          }
          
          if (profile) {
            ticket.user_profile = profile;
            console.log('✅ Profile found for ticket detail:', ticketId, profile.full_name || profile.email);
          } else {
            console.warn('❌ No profile found for user_id in ticket detail:', supportRecord.user_id, 'ticket:', ticketId);
          }
        } catch (error) {
          console.error('❌ Exception fetching user profile for ticket detail:', ticketId, error);
        }
      } else {
        console.warn('❌ No user_id found for ticket detail:', ticketId);
      }

      // Fetch quote separately if it exists (same logic as getAdminTickets)
      if (supportRecord.quote_id) {
        try {
          const { data: quote } = await supabase
            .from('quotes_v2')
            .select(`
              id,
              quote_number,
              destination_country,
              origin_country,
              status,
              final_total_origincurrency,
              items,
              customer_email,
              customer_name,
              created_at
            `)
            .eq('id', supportRecord.quote_id)
            .single();
          
          if (quote) {
            ticket.quote = {
              id: quote.id,
              display_id: quote.quote_number,
              destination_country: quote.destination_country,
              origin_country: quote.origin_country,
              status: quote.status,
              final_total_origincurrency: quote.final_total_origincurrency,
              iwish_tracking_id: null,
              tracking_status: null,
              estimated_delivery_date: null,
              created_at: quote.created_at,
              items: quote.items,
              customer_data: {
                email: quote.customer_email,
                name: quote.customer_name
              }
            };
          }
        } catch (error) {
          console.warn('Failed to fetch quote for ticket detail:', ticketId);
        }
      }

      console.log('✅ Ticket with full details fetched successfully:', ticket.id, ticket.user_profile?.full_name || ticket.user_profile?.email || 'No profile');
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

      // Use unified support system to get interactions (replies)
      const interactions = await unifiedSupportEngine.getInteractions(ticketId);

      if (!interactions || interactions.length === 0) {
        console.log('✅ No replies found for ticket');
        return [];
      }

      // Transform interactions to legacy reply format
      const replies = interactions
        .filter(interaction => interaction.interaction_type === 'reply')
        .map(interaction => ({
          id: interaction.id,
          ticket_id: interaction.support_id,
          user_id: interaction.user_id,
          message: interaction.content?.message || '',
          is_internal: interaction.is_internal,
          created_at: interaction.created_at,
          updated_at: interaction.created_at,
          user_profile: null, // Would need to fetch separately if needed
        }));

      console.log(`✅ Fetched ${replies.length} replies`);
      return replies as TicketReplyWithUser[];
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
        replyData.is_internal || false,
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

      // Try unified engine first
      try {
        const success = await unifiedSupportEngine.updateTicketStatus(
          ticketId,
          status,
          'Status updated via admin interface',
        );

        if (success) {
          console.log('✅ Ticket status updated successfully via unified engine');
          this.clearCache();
          return true;
        }
      } catch (unifiedError) {
        console.warn('⚠️ Unified engine update failed, falling back to direct update:', unifiedError);
      }

      // Fallback: Direct database update
      console.log('🔄 Falling back to direct database update');
      
      // Get current ticket data
      const { data: currentTicket, error: fetchError } = await supabase
        .from('support_system')
        .select('ticket_data')
        .eq('id', ticketId)
        .eq('system_type', 'ticket')
        .single();

      if (fetchError || !currentTicket) {
        console.error('❌ Failed to fetch current ticket:', fetchError);
        return false;
      }

      // Update the status in the ticket_data
      const updatedTicketData = {
        ...currentTicket.ticket_data,
        status: status,
        metadata: {
          ...currentTicket.ticket_data.metadata,
          last_status_change: new Date().toISOString(),
        },
      };

      // Update the record
      const { error: updateError } = await supabase
        .from('support_system')
        .update({
          ticket_data: updatedTicketData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (updateError) {
        console.error('❌ Error in direct ticket status update:', updateError);
        return false;
      }

      console.log('✅ Ticket status updated successfully via direct update');
      this.clearCache();
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

      // Try unified engine first
      try {
        const success = await unifiedSupportEngine.assignTicket(
          ticketId,
          adminUserId || '',
          'Ticket assigned via admin interface',
        );

        if (success) {
          console.log('✅ Ticket assigned successfully via unified engine');
          this.clearCache();
          return true;
        }
      } catch (unifiedError) {
        console.warn('⚠️ Unified engine assignment failed, falling back to direct update:', unifiedError);
      }

      // Fallback: Direct database update
      console.log('🔄 Falling back to direct assignment update');
      
      // Get current ticket data
      const { data: currentTicket, error: fetchError } = await supabase
        .from('support_system')
        .select('ticket_data')
        .eq('id', ticketId)
        .eq('system_type', 'ticket')
        .single();

      if (fetchError || !currentTicket) {
        console.error('❌ Failed to fetch current ticket for assignment:', fetchError);
        return false;
      }

      // Update the assigned_to in the ticket_data
      const updatedTicketData = {
        ...currentTicket.ticket_data,
        assigned_to: adminUserId,
        metadata: {
          ...currentTicket.ticket_data.metadata,
          last_assignment_change: new Date().toISOString(),
        },
      };

      // Update the record
      const { error: updateError } = await supabase
        .from('support_system')
        .update({
          ticket_data: updatedTicketData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (updateError) {
        console.error('❌ Error in direct ticket assignment update:', updateError);
        return false;
      }

      console.log('✅ Ticket assigned successfully via direct update');
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

  // ============================================================================
  // Customer Satisfaction Survey Methods
  // ============================================================================

  /**
   * Submit customer satisfaction survey
   */
  async submitSatisfactionSurvey(
    surveyData: import('@/types/ticket').CreateSurveyData,
  ): Promise<string | null> {
    try {
      console.log('📊 Submitting satisfaction survey:', surveyData);

      const { data, error } = await supabase
        .from('customer_satisfaction_surveys')
        .insert({
          ticket_id: surveyData.ticket_id,
          rating: surveyData.rating,
          feedback: surveyData.feedback || null,
          experience_rating: surveyData.experience_rating,
          response_time_rating: surveyData.response_time_rating,
          resolution_rating: surveyData.resolution_rating,
          would_recommend: surveyData.would_recommend,
          additional_comments: surveyData.additional_comments || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error submitting satisfaction survey:', error);
        return null;
      }

      console.log('✅ Satisfaction survey submitted successfully:', data.id);

      // Update ticket metadata to indicate survey was completed
      await this.updateTicketSurveyStatus(surveyData.ticket_id, true);

      this.clearCache();
      return data.id;
    } catch (error) {
      console.error('❌ Exception in submitSatisfactionSurvey:', error);
      return null;
    }
  }

  /**
   * Get satisfaction survey for a ticket
   */
  async getSatisfactionSurvey(
    ticketId: string,
  ): Promise<import('@/types/ticket').CustomerSatisfactionSurvey | null> {
    try {
      const cacheKey = `survey_${ticketId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const { data, error } = await supabase
        .from('customer_satisfaction_surveys')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No survey found - this is expected for many tickets
          return null;
        }
        console.error('❌ Error fetching satisfaction survey:', error);
        return null;
      }

      this.cache.set(cacheKey, data);
      return data as import('@/types/ticket').CustomerSatisfactionSurvey;
    } catch (error) {
      console.error('❌ Exception in getSatisfactionSurvey:', error);
      return null;
    }
  }

  /**
   * Check if ticket has a completed survey
   */
  async hasCompletedSurvey(ticketId: string): Promise<boolean> {
    try {
      const survey = await this.getSatisfactionSurvey(ticketId);
      return survey !== null;
    } catch (error) {
      console.error('❌ Exception in hasCompletedSurvey:', error);
      return false;
    }
  }

  /**
   * Update ticket metadata to track survey completion
   */
  private async updateTicketSurveyStatus(
    ticketId: string,
    surveyCompleted: boolean,
  ): Promise<void> {
    try {
      // Use unified support engine to update ticket metadata
      const ticket = await unifiedSupportEngine.getTicketById(ticketId);
      if (!ticket || !ticket.ticket_data) {
        console.warn('⚠️ Ticket not found for survey status update:', ticketId);
        return;
      }

      const updatedTicketData = {
        ...ticket.ticket_data,
        metadata: {
          ...ticket.ticket_data.metadata,
          survey_completed: surveyCompleted,
          survey_completed_at: surveyCompleted ? new Date().toISOString() : null,
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
        console.error('❌ Error updating ticket survey status:', error);
      } else {
        console.log('✅ Ticket survey status updated successfully');
      }
    } catch (error) {
      console.error('❌ Exception in updateTicketSurveyStatus:', error);
    }
  }

  /**
   * Get survey statistics for admin dashboard
   */
  async getSurveyStatistics(filters?: {
    dateRange?: { start: string; end: string };
    ticketCategory?: string;
  }): Promise<{
    totalSurveys: number;
    averageRating: number;
    averageExperienceRating: number;
    averageResponseTimeRating: number;
    averageResolutionRating: number;
    recommendationPercentage: number;
    ratingDistribution: Record<number, number>;
  } | null> {
    try {
      console.log('📈 Fetching survey statistics with filters:', filters);

      let query = supabase.from('customer_satisfaction_surveys').select('*');

      // Apply date filters if provided
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching survey statistics:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          totalSurveys: 0,
          averageRating: 0,
          averageExperienceRating: 0,
          averageResponseTimeRating: 0,
          averageResolutionRating: 0,
          recommendationPercentage: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      const totalSurveys = data.length;
      const averageRating = data.reduce((sum, survey) => sum + survey.rating, 0) / totalSurveys;
      const averageExperienceRating =
        data.reduce((sum, survey) => sum + survey.experience_rating, 0) / totalSurveys;
      const averageResponseTimeRating =
        data.reduce((sum, survey) => sum + survey.response_time_rating, 0) / totalSurveys;
      const averageResolutionRating =
        data.reduce((sum, survey) => sum + survey.resolution_rating, 0) / totalSurveys;
      const recommendationCount = data.filter((survey) => survey.would_recommend).length;
      const recommendationPercentage = (recommendationCount / totalSurveys) * 100;

      // Rating distribution
      const ratingDistribution = data.reduce(
        (dist, survey) => {
          dist[survey.rating] = (dist[survey.rating] || 0) + 1;
          return dist;
        },
        { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      );

      const statistics = {
        totalSurveys,
        averageRating: Math.round(averageRating * 100) / 100,
        averageExperienceRating: Math.round(averageExperienceRating * 100) / 100,
        averageResponseTimeRating: Math.round(averageResponseTimeRating * 100) / 100,
        averageResolutionRating: Math.round(averageResolutionRating * 100) / 100,
        recommendationPercentage: Math.round(recommendationPercentage * 100) / 100,
        ratingDistribution,
      };

      console.log('✅ Survey statistics calculated:', statistics);
      return statistics;
    } catch (error) {
      console.error('❌ Exception in getSurveyStatistics:', error);
      return null;
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
