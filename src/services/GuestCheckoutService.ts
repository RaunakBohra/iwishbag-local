import { supabase } from '@/integrations/supabase/client';
import {
  GuestCheckoutSession,
  CreateGuestSessionRequest,
  UpdateGuestSessionRequest,
  GuestSessionResponse,
  GuestSessionService,
} from '@/types/guestCheckout';

/**
 * Service for managing guest checkout sessions
 * Prevents quote contamination by storing guest details temporarily
 */
class GuestCheckoutServiceImpl implements GuestSessionService {
  /**
   * Generate a unique session token
   */
  private generateSessionToken(): string {
    return `gcs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new guest checkout session
   */
  async createSession(request: CreateGuestSessionRequest): Promise<GuestSessionResponse> {
    try {
      const sessionToken = this.generateSessionToken();

      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .insert({
          session_token: sessionToken,
          quote_id: request.quote_id,
          guest_name: request.guest_name,
          guest_email: request.guest_email,
          guest_phone: request.guest_phone,
          shipping_address: request.shipping_address,
          payment_currency: request.payment_currency,
          payment_method: request.payment_method,
          payment_amount: request.payment_amount,
          status: 'active',
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating guest session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in createSession:', error);
      return {
        success: false,
        error: 'Failed to create guest checkout session',
      };
    }
  }

  /**
   * Update an existing guest checkout session
   */
  async updateSession(request: UpdateGuestSessionRequest): Promise<GuestSessionResponse> {
    try {
      const updateData: Partial<GuestCheckoutSession> = {
        updated_at: new Date().toISOString(),
      };

      // Only update provided fields
      if (request.guest_name !== undefined) updateData.guest_name = request.guest_name;
      if (request.guest_email !== undefined) updateData.guest_email = request.guest_email;
      if (request.guest_phone !== undefined) updateData.guest_phone = request.guest_phone;
      if (request.shipping_address !== undefined)
        updateData.shipping_address = request.shipping_address;
      if (request.payment_currency !== undefined)
        updateData.payment_currency = request.payment_currency;
      if (request.payment_method !== undefined) updateData.payment_method = request.payment_method;
      if (request.payment_amount !== undefined) updateData.payment_amount = request.payment_amount;
      if (request.status !== undefined) updateData.status = request.status;

      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .update(updateData)
        .eq('session_token', request.session_token)
        .eq('status', 'active') // Only update active sessions
        .select()
        .single();

      if (error) {
        console.error('Error updating guest session:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return {
          success: false,
          error: 'Session not found or already completed',
        };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in updateSession:', error);
      return {
        success: false,
        error: 'Failed to update guest checkout session',
      };
    }
  }

  /**
   * Get a guest checkout session by token
   */
  async getSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Session not found' };
        }
        console.error('Error getting guest session:', error);
        return { success: false, error: error.message };
      }

      // Check if session is expired
      if (new Date(data.expires_at) < new Date()) {
        await this.expireSession(sessionToken);
        return { success: false, error: 'Session has expired' };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in getSession:', error);
      return { success: false, error: 'Failed to get guest checkout session' };
    }
  }

  /**
   * Mark a session as completed (after successful payment)
   */
  async completeSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('session_token', sessionToken)
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        console.error('Error completing guest session:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return {
          success: false,
          error: 'Session not found or already completed',
        };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in completeSession:', error);
      return {
        success: false,
        error: 'Failed to complete guest checkout session',
      };
    }
  }

  /**
   * Mark a session as expired
   */
  async expireSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('session_token', sessionToken)
        .neq('status', 'completed') // Don't expire completed sessions
        .select()
        .single();

      if (error) {
        console.error('Error expiring guest session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in expireSession:', error);
      return {
        success: false,
        error: 'Failed to expire guest checkout session',
      };
    }
  }

  /**
   * Clean up expired sessions (utility function)
   * Uses the enhanced cleanup with tiered retention policies
   */
  async cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_guest_sessions');

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
        return { deletedCount: 0 };
      }

      return { deletedCount: data || 0 };
    } catch (error) {
      console.error('Error in cleanupExpiredSessions:', error);
      return { deletedCount: 0 };
    }
  }

  /**
   * Enhanced cleanup with detailed logging (admin function)
   * Returns comprehensive cleanup statistics
   */
  async enhancedCleanup(triggeredBy: string = 'manual'): Promise<{
    success: boolean;
    logId?: string;
    stats?: {
      expiredDeleted: number;
      failedDeleted: number;
      completedAnonymized: number;
      anonymizedDeleted: number;
      totalProcessed: number;
      durationMs: number;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('cleanup_guest_sessions_with_logging', {
        triggered_by: triggeredBy,
      });

      if (error) {
        console.error('Error in enhanced cleanup:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No cleanup data returned' };
      }

      const result = data[0];
      return {
        success: true,
        logId: result.log_id,
        stats: {
          expiredDeleted: result.expired_deleted,
          failedDeleted: result.failed_deleted,
          completedAnonymized: result.completed_anonymized,
          anonymizedDeleted: result.anonymized_deleted,
          totalProcessed: result.total_processed,
          durationMs: result.duration_ms,
        },
      };
    } catch (error) {
      console.error('Error in enhancedCleanup:', error);
      return { success: false, error: 'Failed to perform enhanced cleanup' };
    }
  }

  /**
   * Get cleanup history for admin monitoring
   */
  async getCleanupHistory(limit: number = 50): Promise<{
    success: boolean;
    logs?: Array<Record<string, unknown>>;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('guest_session_cleanup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching cleanup history:', error);
        return { success: false, error: error.message };
      }

      return { success: true, logs: data };
    } catch (error) {
      console.error('Error in getCleanupHistory:', error);
      return { success: false, error: 'Failed to fetch cleanup history' };
    }
  }

  /**
   * Get session by quote ID (useful for checking if quote has active session)
   */
  async getSessionByQuoteId(quoteId: string): Promise<GuestSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error getting session by quote ID:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in getSessionByQuoteId:', error);
      return { success: false, error: 'Failed to get session by quote ID' };
    }
  }
}

// Export singleton instance
export const guestCheckoutService = new GuestCheckoutServiceImpl();
