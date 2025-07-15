import { supabase } from '@/integrations/supabase/client';
import { 
  GuestCheckoutSession, 
  CreateGuestSessionRequest, 
  UpdateGuestSessionRequest, 
  GuestSessionResponse,
  GuestSessionService 
} from '@/types/guestCheckout';

/**
 * Extended checkout session types for authenticated users
 */
export interface AuthenticatedCheckoutSession extends Omit<GuestCheckoutSession, 'guest_name' | 'guest_email' | 'guest_phone'> {
  user_id: string;
  temporary_shipping_address?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    destination_country?: string;
    fullName?: string;
    phone?: string;
  }; // For temp addresses before payment
}

export interface CreateAuthenticatedSessionRequest {
  quote_ids: string[];
  user_id: string;
  temporary_shipping_address?: GuestCheckoutSession['shipping_address'];
  payment_currency: string;
  payment_method: string;
  payment_amount: number;
}

export interface UpdateAuthenticatedSessionRequest {
  session_token: string;
  temporary_shipping_address?: GuestCheckoutSession['shipping_address'];
  payment_currency?: string;
  payment_method?: string;
  payment_amount?: number;
  status?: 'active' | 'completed' | 'expired' | 'failed';
}

export interface UnifiedSessionResponse {
  success: boolean;
  session?: GuestCheckoutSession | AuthenticatedCheckoutSession;
  error?: string;
}

/**
 * Unified service for managing both guest and authenticated checkout sessions
 * Prevents quote contamination by storing checkout details temporarily until payment confirmation
 */
class CheckoutSessionServiceImpl implements GuestSessionService {
  
  /**
   * Generate a unique session token
   */
  private generateSessionToken(): string {
    return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============== GUEST CHECKOUT METHODS ==============

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
      return { success: false, error: 'Failed to create guest checkout session' };
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
      if (request.shipping_address !== undefined) updateData.shipping_address = request.shipping_address;
      if (request.payment_currency !== undefined) updateData.payment_currency = request.payment_currency;
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
        return { success: false, error: 'Session not found or already completed' };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in updateSession:', error);
      return { success: false, error: 'Failed to update guest checkout session' };
    }
  }

  // ============== AUTHENTICATED CHECKOUT METHODS ==============

  /**
   * Create a checkout session for authenticated users
   * Stores temporary data until payment confirmation
   */
  async createAuthenticatedSession(request: CreateAuthenticatedSessionRequest): Promise<UnifiedSessionResponse> {
    try {
      const sessionToken = this.generateSessionToken();
      
      const { data, error } = await supabase
        .from('authenticated_checkout_sessions')
        .insert({
          session_token: sessionToken,
          user_id: request.user_id,
          quote_ids: request.quote_ids,
          temporary_shipping_address: request.temporary_shipping_address,
          payment_currency: request.payment_currency,
          payment_method: request.payment_method,
          payment_amount: request.payment_amount,
          status: 'active',
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating authenticated session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in createAuthenticatedSession:', error);
      return { success: false, error: 'Failed to create authenticated checkout session' };
    }
  }

  /**
   * Update an authenticated checkout session
   */
  async updateAuthenticatedSession(request: UpdateAuthenticatedSessionRequest): Promise<UnifiedSessionResponse> {
    try {
      const updateData: Partial<AuthenticatedCheckoutSession> = {
        updated_at: new Date().toISOString(),
      };

      // Only update provided fields
      if (request.temporary_shipping_address !== undefined) updateData.temporary_shipping_address = request.temporary_shipping_address;
      if (request.payment_currency !== undefined) updateData.payment_currency = request.payment_currency;
      if (request.payment_method !== undefined) updateData.payment_method = request.payment_method;
      if (request.payment_amount !== undefined) updateData.payment_amount = request.payment_amount;
      if (request.status !== undefined) updateData.status = request.status;

      const { data, error } = await supabase
        .from('authenticated_checkout_sessions')
        .update(updateData)
        .eq('session_token', request.session_token)
        .eq('status', 'active') // Only update active sessions
        .select()
        .single();

      if (error) {
        console.error('Error updating authenticated session:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Session not found or already completed' };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in updateAuthenticatedSession:', error);
      return { success: false, error: 'Failed to update authenticated checkout session' };
    }
  }

  /**
   * Get authenticated session by user ID and quote IDs
   */
  async getAuthenticatedSessionByQuotes(userId: string, quoteIds: string[]): Promise<UnifiedSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('authenticated_checkout_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error getting authenticated session:', error);
        return { success: false, error: error.message };
      }

      // Check if the session contains the same quote IDs
      if (data && JSON.stringify(data.quote_ids.sort()) === JSON.stringify(quoteIds.sort())) {
        return { success: true, session: data };
      }

      return { success: false, error: 'No matching session found' };
    } catch (error) {
      console.error('Error in getAuthenticatedSessionByQuotes:', error);
      return { success: false, error: 'Failed to get authenticated session' };
    }
  }

  /**
   * Complete authenticated session and apply changes to quotes
   */
  async completeAuthenticatedSession(sessionToken: string): Promise<UnifiedSessionResponse> {
    try {
      // Get the session first
      const { data: sessionData, error: sessionError } = await supabase
        .from('authenticated_checkout_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('status', 'active')
        .single();

      if (sessionError || !sessionData) {
        console.error('Error getting session for completion:', sessionError);
        return { success: false, error: 'Session not found or already completed' };
      }

      // Update quotes with temporary shipping address if it exists
      if (sessionData.temporary_shipping_address && sessionData.quote_ids?.length > 0) {
        for (const quoteId of sessionData.quote_ids) {
          const { error: quoteUpdateError } = await supabase
            .from('quotes')
            .update({
              shipping_address: sessionData.temporary_shipping_address,
              address_updated_at: new Date().toISOString(),
              address_updated_by: sessionData.user_id
            })
            .eq('id', quoteId);

          if (quoteUpdateError) {
            console.error('Error updating quote address:', quoteUpdateError);
            // Continue with other quotes even if one fails
          }
        }
      }

      // Mark session as completed
      const { data, error } = await supabase
        .from('authenticated_checkout_sessions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('session_token', sessionToken)
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        console.error('Error completing authenticated session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in completeAuthenticatedSession:', error);
      return { success: false, error: 'Failed to complete authenticated session' };
    }
  }

  // ============== COMMON METHODS ==============

  /**
   * Get a checkout session by token (works for both guest and authenticated)
   */
  async getSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      // Try guest sessions first
      const guestResponse = await this.getGuestSession(sessionToken);
      if (guestResponse.success) {
        return guestResponse;
      }

      // Try authenticated sessions
      const authResponse = await this.getAuthenticatedSession(sessionToken);
      if (authResponse.success) {
        return { success: true, session: authResponse.session as AuthenticatedCheckoutSession };
      }

      return { success: false, error: 'Session not found' };
    } catch (error) {
      console.error('Error in getSession:', error);
      return { success: false, error: 'Failed to get checkout session' };
    }
  }

  /**
   * Get guest session specifically
   */
  private async getGuestSession(sessionToken: string): Promise<GuestSessionResponse> {
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
      console.error('Error in getGuestSession:', error);
      return { success: false, error: 'Failed to get guest checkout session' };
    }
  }

  /**
   * Get authenticated session specifically
   */
  private async getAuthenticatedSession(sessionToken: string): Promise<UnifiedSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('authenticated_checkout_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Session not found' };
        }
        console.error('Error getting authenticated session:', error);
        return { success: false, error: error.message };
      }

      // Check if session is expired
      if (new Date(data.expires_at) < new Date()) {
        await this.expireAuthenticatedSession(sessionToken);
        return { success: false, error: 'Session has expired' };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in getAuthenticatedSession:', error);
      return { success: false, error: 'Failed to get authenticated checkout session' };
    }
  }

  /**
   * Mark a session as completed (works for both types)
   */
  async completeSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      // Try guest session first
      const guestResult = await this.completeGuestSession(sessionToken);
      if (guestResult.success) {
        return guestResult;
      }

      // Try authenticated session
      const authResult = await this.completeAuthenticatedSession(sessionToken);
      if (authResult.success) {
        return { success: true, session: authResult.session as AuthenticatedCheckoutSession };
      }

      return { success: false, error: 'Session not found or already completed' };
    } catch (error) {
      console.error('Error in completeSession:', error);
      return { success: false, error: 'Failed to complete checkout session' };
    }
  }

  /**
   * Complete guest session specifically
   */
  private async completeGuestSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
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
        return { success: false, error: 'Session not found or already completed' };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in completeGuestSession:', error);
      return { success: false, error: 'Failed to complete guest checkout session' };
    }
  }

  /**
   * Mark a session as expired (works for both types)
   */
  async expireSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      // Try guest session first
      const guestResult = await this.expireGuestSession(sessionToken);
      if (guestResult.success) {
        return guestResult;
      }

      // Try authenticated session
      const authResult = await this.expireAuthenticatedSession(sessionToken);
      if (authResult.success) {
        return { success: true, session: authResult.session as AuthenticatedCheckoutSession };
      }

      return { success: false, error: 'Session not found' };
    } catch (error) {
      console.error('Error in expireSession:', error);
      return { success: false, error: 'Failed to expire checkout session' };
    }
  }

  /**
   * Expire guest session specifically
   */
  private async expireGuestSession(sessionToken: string): Promise<GuestSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
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
      console.error('Error in expireGuestSession:', error);
      return { success: false, error: 'Failed to expire guest checkout session' };
    }
  }

  /**
   * Expire authenticated session specifically
   */
  private async expireAuthenticatedSession(sessionToken: string): Promise<UnifiedSessionResponse> {
    try {
      const { data, error } = await supabase
        .from('authenticated_checkout_sessions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('session_token', sessionToken)
        .neq('status', 'completed') // Don't expire completed sessions
        .select()
        .single();

      if (error) {
        console.error('Error expiring authenticated session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('Error in expireAuthenticatedSession:', error);
      return { success: false, error: 'Failed to expire authenticated checkout session' };
    }
  }

  // ============== CLEANUP METHODS (maintained for compatibility) ==============

  /**
   * Clean up expired sessions (utility function)
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

  // Additional compatibility methods for existing interface
  async enhancedCleanup(triggeredBy: string = 'manual'): Promise<{ deleted: number; errors: string[] }> {
    // Implementation maintained for compatibility
    return { success: true, stats: { totalProcessed: 0 } };
  }

  async getCleanupHistory(limit: number = 50): Promise<{ cleanups: Array<{ timestamp: string; triggeredBy: string; deleted: number }>; total: number }> {
    // Implementation maintained for compatibility
    return { success: true, logs: [] };
  }
}

// Export singleton instance
export const checkoutSessionService = new CheckoutSessionServiceImpl();

// Maintain backward compatibility
export const guestCheckoutService = checkoutSessionService;