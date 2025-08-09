// Secure User Support Service - Limited data access for regular users
// This service provides ONLY user-safe operations with minimal data exposure

import { supabase } from '@/lib/supabase';
import type { CreateCustomerTicketData } from '@/types/ticket';
import type { SecureUserTicket } from '@/hooks/useUserTicketsSecure';

interface SecureUserTicketReply {
  id: string;
  message: string;
  created_at: string;
  is_admin_reply: boolean;
  admin_user_name?: string; // Only name, no sensitive admin data
}

class UserSupportService {
  /**
   * Fetch user's tickets with strict data limitation
   * Only returns basic ticket info, no admin details or internal system data
   */
  async getUserTicketsSecure(userId?: string): Promise<SecureUserTicket[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          description,
          status,
          priority,
          category,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user tickets:', error);
        throw new Error('Failed to fetch tickets');
      }

      // Extra security: filter and sanitize data
      return (data || []).map(ticket => ({
        id: ticket.id,
        subject: ticket.subject || 'Untitled',
        description: ticket.description || '',
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      }));
    } catch (error) {
      console.error('UserSupportService.getUserTicketsSecure error:', error);
      throw error;
    }
  }

  /**
   * Create customer ticket with user-friendly interface
   * Uses the existing customer ticket RPC but with additional security checks
   */
  async createCustomerTicketSecure(ticketData: CreateCustomerTicketData): Promise<any> {
    try {
      // Use the existing customer-friendly RPC function
      const { data, error } = await supabase.rpc('create_customer_ticket', {
        p_subject: ticketData.subject,
        p_description: ticketData.description,
        p_category: ticketData.category,
        p_priority: ticketData.priority,
        p_user_email: ticketData.user_email,
        p_user_name: ticketData.user_name,
        p_quote_id: ticketData.quote_id || null,
      });

      if (error) {
        console.error('Error creating customer ticket:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('UserSupportService.createCustomerTicketSecure error:', error);
      throw error;
    }
  }

  /**
   * Get ticket replies for user's own tickets only
   * Returns limited reply data without sensitive admin information
   */
  async getTicketRepliesSecure(ticketId: string, userId: string): Promise<SecureUserTicketReply[]> {
    try {
      // First verify the ticket belongs to the user
      const { data: ticketOwnership, error: ownershipError } = await supabase
        .from('support_tickets')
        .select('user_id')
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single();

      if (ownershipError || !ticketOwnership) {
        throw new Error('Ticket not found or access denied');
      }

      // Fetch replies with limited admin information
      const { data, error } = await supabase
        .from('ticket_replies')
        .select(`
          id,
          message,
          created_at,
          is_admin_reply,
          admin_user:admin_user_id (
            full_name,
            email
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching ticket replies:', error);
        throw error;
      }

      // Sanitize admin information
      return (data || []).map(reply => ({
        id: reply.id,
        message: reply.message,
        created_at: reply.created_at,
        is_admin_reply: reply.is_admin_reply,
        admin_user_name: reply.is_admin_reply 
          ? (reply.admin_user?.full_name || reply.admin_user?.email || 'Support Team')
          : undefined,
      }));
    } catch (error) {
      console.error('UserSupportService.getTicketRepliesSecure error:', error);
      throw error;
    }
  }

  /**
   * Add user reply to their own ticket
   * Strict ownership validation before allowing replies
   */
  async addUserReplySecure(ticketId: string, message: string, userId: string): Promise<any> {
    try {
      // Verify ticket ownership first
      const { data: ticketOwnership, error: ownershipError } = await supabase
        .from('support_tickets')
        .select('user_id, status')
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single();

      if (ownershipError || !ticketOwnership) {
        throw new Error('Ticket not found or access denied');
      }

      // Prevent replies to closed tickets
      if (ticketOwnership.status === 'closed') {
        throw new Error('Cannot reply to closed tickets');
      }

      // Add the reply
      const { data, error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: ticketId,
          message: message.trim(),
          user_id: userId,
          is_admin_reply: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding user reply:', error);
        throw error;
      }

      // Update ticket status to 'open' if it was pending
      if (ticketOwnership.status === 'pending') {
        await supabase
          .from('support_tickets')
          .update({ status: 'open', updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      }

      return data;
    } catch (error) {
      console.error('UserSupportService.addUserReplySecure error:', error);
      throw error;
    }
  }

  /**
   * Get single ticket details for user (secure)
   * Only returns the ticket if it belongs to the user
   */
  async getUserTicketSecure(ticketId: string, userId: string): Promise<SecureUserTicket | null> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          description,
          status,
          priority,
          category,
          created_at,
          updated_at
        `)
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Ticket not found
        }
        console.error('Error fetching user ticket:', error);
        throw error;
      }

      return {
        id: data.id,
        subject: data.subject || 'Untitled',
        description: data.description || '',
        status: data.status,
        priority: data.priority,
        category: data.category,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('UserSupportService.getUserTicketSecure error:', error);
      throw error;
    }
  }

  /**
   * Check if user can access ticket
   * Simple ownership validation
   */
  async canUserAccessTicket(ticketId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('UserSupportService.canUserAccessTicket error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const userSupportService = new UserSupportService();