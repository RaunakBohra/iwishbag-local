// ============================================================================
// QUOTE MESSAGE SERVICE - Centralized quote-specific messaging
// Handles message CRUD operations, thread management, and integration
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { fileUploadService } from './FileUploadService';
import { notificationService, Message } from './NotificationService';
import { UnifiedQuote } from '@/types/unified-quote';

export interface SendMessageRequest {
  quoteId: string;
  content: string;
  messageType?: string;
  threadType?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  attachments?: File[];
  recipientId?: string;
  isInternal?: boolean;
}

export interface MessageThread {
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
  participants: {
    customer: { id: string; name: string; email: string };
    admins: { id: string; name: string; email: string }[];
  };
}

export class QuoteMessageService {
  private static instance: QuoteMessageService;

  static getInstance(): QuoteMessageService {
    if (!QuoteMessageService.instance) {
      QuoteMessageService.instance = new QuoteMessageService();
    }
    return QuoteMessageService.instance;
  }

  /**
   * Send a new message in a quote thread
   */
  async sendMessage(
    request: SendMessageRequest,
  ): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get quote information
      const quote = await this.getQuoteById(request.quoteId);
      if (!quote) {
        return { success: false, error: 'Quote not found' };
      }

      // Handle file attachments
      let attachmentUrl: string | undefined;
      let attachmentFileName: string | undefined;

      if (request.attachments && request.attachments.length > 0) {
        const file = request.attachments[0]; // For now, handle single attachment
        const uploadResult = await fileUploadService.uploadToSupabase(
          file,
          'message-attachments',
          `quote-${request.quoteId}`,
          request.messageType === 'payment_proof' ? 'payment_proof' : 'message_attachment',
        );

        if (!uploadResult.success) {
          return { success: false, error: uploadResult.error };
        }

        attachmentUrl = uploadResult.url;
        attachmentFileName = uploadResult.fileName;
      }

      // Determine recipient
      let recipientId: string | undefined = request.recipientId;

      // If no explicit recipient, determine based on sender
      if (!recipientId) {
        const isAdmin = await this.isUserAdmin(user.id);
        if (isAdmin) {
          // Admin sending to customer
          recipientId = quote.user_id;
        } else {
          // Customer sending to admin (no specific recipient)
          recipientId = null; // This allows the message to be visible to all admins
        }
      }

      // Ensure sender_id ≠ recipient_id (database constraint)
      if (recipientId === user.id) {
        recipientId = null; // Allow message to be general admin message
      }

      // Insert message into database
      const { data: messageData, error: insertError } = await supabase
        .from('messages')
        .insert({
          quote_id: request.quoteId,
          sender_id: user.id,
          recipient_id: recipientId,
          subject: `Quote #${quote.display_id || quote.id} Discussion`,
          content: request.content,
          message_type: request.messageType || 'general',
          thread_type: request.threadType || 'quote',
          priority: request.priority || 'normal',
          attachment_url: attachmentUrl,
          attachment_file_name: attachmentFileName,
          sender_name:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Unknown',
          sender_email: user.email,
          is_internal: request.isInternal || false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to insert message:', insertError);
        return { success: false, error: 'Failed to send message' };
      }

      const message = messageData as Message;

      // Send notifications based on message type and sender
      await this.handleMessageNotifications(quote, message, user.id);

      console.log('✅ Message sent successfully:', message.id);
      return { success: true, message };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Get message thread for a quote
   */
  async getMessageThread(quoteId: string): Promise<MessageThread> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get messages using the database function
      const { data: messages, error } = await supabase.rpc('get_quote_message_thread', {
        p_quote_id: quoteId,
      });

      if (error) {
        console.error('❌ Failed to fetch message thread:', error);
        throw error;
      }

      // Get unread count for current user
      const unreadCount = await notificationService.getUnreadMessageCount(user.id, quoteId);

      // Get quote and participant information
      const quote = await this.getQuoteById(quoteId);
      const participants = await this.getThreadParticipants(quoteId, quote);

      const messageThread: MessageThread = {
        messages: messages || [],
        unreadCount,
        lastMessage: messages && messages.length > 0 ? messages[messages.length - 1] : undefined,
        participants,
      };

      return messageThread;
    } catch (error) {
      console.error('❌ Error getting message thread:', error);
      return {
        messages: [],
        unreadCount: 0,
        participants: {
          customer: { id: '', name: 'Unknown', email: 'unknown@example.com' },
          admins: [],
        },
      };
    }
  }

  /**
   * Mark messages as read for current user
   */
  async markMessagesAsRead(messageIds: string[]): Promise<number> {
    return notificationService.markMessagesAsRead(messageIds);
  }

  /**
   * Get unread message count for a quote
   */
  async getUnreadMessageCount(quoteId: string): Promise<number> {
    const user = await this.getCurrentUser();
    if (!user) return 0;

    return notificationService.getUnreadMessageCount(user.id, quoteId);
  }

  /**
   * Get total message count for a quote (excludes internal admin messages)
   */
  async getTotalMessageCount(quoteId: string): Promise<number> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return 0;

      const isAdmin = await this.isUserAdmin(user.id);
      
      console.log('🔍 [DEBUG] Getting total message count:', { quoteId, userId: user.id, isAdmin });

      // First, try to get all messages for this quote to see what we can access
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, is_internal, created_at')
        .eq('quote_id', quoteId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Failed to get messages for count:', messagesError);
        return 0;
      }

      const totalCount = messages?.length || 0;
      console.log('✅ [DEBUG] Total message count result:', { 
        quoteId, 
        totalCount, 
        isAdmin,
        messagesPreview: messages?.slice(0, 3).map(m => ({
          id: m.id,
          sender_id: m.sender_id,
          recipient_id: m.recipient_id,
          is_internal: m.is_internal
        }))
      });
      
      return totalCount;
    } catch (error) {
      console.error('❌ Error getting total message count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time updates for a quote's messages
   */
  subscribeToQuoteMessages(quoteId: string, callback: (payload: any) => void) {
    return notificationService.subscribeToQuoteMessages(quoteId, callback);
  }

  /**
   * Update message verification status (admin only)
   */
  async updateMessageVerification(
    messageId: string,
    status: 'pending' | 'verified' | 'confirmed' | 'rejected',
    adminNotes?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const isAdmin = await this.isUserAdmin(user.id);
      if (!isAdmin) {
        return { success: false, error: 'Admin access required' };
      }

      const { error } = await supabase
        .from('messages')
        .update({
          verification_status: status,
          admin_notes: adminNotes,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        console.error('❌ Failed to update verification status:', error);
        return { success: false, error: 'Failed to update verification status' };
      }

      console.log('✅ Message verification updated:', { messageId, status });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating verification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Get current authenticated user
   */
  private async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      console.error('❌ Failed to get current user:', error);
      return null;
    }
    return user;
  }

  /**
   * Get quote by ID
   */
  private async getQuoteById(quoteId: string): Promise<UnifiedQuote | null> {
    try {
      const { data, error } = await supabase.from('quotes').select('*').eq('id', quoteId).single();

      if (error) {
        console.error('❌ Failed to fetch quote:', error);
        return null;
      }

      return data as UnifiedQuote;
    } catch (error) {
      console.error('❌ Error fetching quote:', error);
      return null;
    }
  }

  /**
   * Check if user is admin
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get thread participants (customer and admins)
   */
  private async getThreadParticipants(quoteId: string, quote: UnifiedQuote | null) {
    const participants = {
      customer: { id: '', name: 'Unknown', email: 'unknown@example.com' },
      admins: [] as { id: string; name: string; email: string }[],
    };

    try {
      if (quote) {
        // Get customer info
        participants.customer = {
          id: quote.user_id || '',
          name: quote.customer_data?.info?.name || quote.customer_name || 'Customer',
          email: quote.customer_data?.info?.email || quote.email || 'No email provided',
        };

        // Get admin users
        const { data: admins, error } = await supabase
          .from('user_roles')
          .select(
            `
            user_id,
            profiles!inner(email, full_name)
          `,
          )
          .eq('role', 'admin');

        if (!error && admins) {
          participants.admins = admins.map((admin) => ({
            id: admin.user_id,
            name: (admin.profiles as any)?.full_name || 'Admin',
            email: (admin.profiles as any)?.email || 'admin@iwishbag.com',
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error getting thread participants:', error);
    }

    return participants;
  }

  /**
   * Handle message notifications based on sender and message type
   */
  private async handleMessageNotifications(
    quote: UnifiedQuote,
    message: Message,
    senderId: string,
  ) {
    try {
      const isAdmin = await this.isUserAdmin(senderId);

      if (message.message_type === 'payment_proof') {
        // Always notify admin for payment proof
        await notificationService.notifyPaymentProofUploaded(quote, message);
      } else if (isAdmin) {
        // Admin replying to customer
        await notificationService.notifyCustomerReply(quote, message);
      } else {
        // Customer messaging admin
        await notificationService.notifyAdminNewMessage(quote, message);
      }
    } catch (error) {
      console.error('❌ Error handling message notifications:', error);
    }
  }
}

// Export singleton instance
export const quoteMessageService = QuoteMessageService.getInstance();
