/**
 * Cart Abandonment Service
 * 
 * Detects when users abandon their carts and triggers recovery workflows.
 * Integrates with analytics, email service, and push notifications.
 */

import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/utils/analytics';
import { logger } from '@/utils/logger';

// Types
interface CartItem {
  quote: {
    id: string;
    total_quote_origincurrency: number;
    destination_country: string;
    customer_data?: {
      description?: string;
    };
  };
}

interface AbandonmentEvent {
  id: string;
  user_id?: string;
  session_id: string;
  cart_items: CartItem[];
  cart_value: number;
  currency: string;
  abandonment_stage: 'cart' | 'checkout' | 'payment';
  user_email?: string;
  abandoned_at: string;
  is_recovered: boolean;
}

interface RecoveryAttempt {
  id: string;
  abandonment_event_id: string;
  attempt_type: 'email' | 'push_notification' | 'sms';
  sequence_number: number;
  template_id?: string;
  incentive_offered: string;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  user_returned: boolean;
  conversion_achieved: boolean;
}

class CartAbandonmentService {
  private static instance: CartAbandonmentService;
  private abandonmentTimers = new Map<string, NodeJS.Timeout>();
  private readonly ABANDONMENT_DELAY = 30 * 60 * 1000; // 30 minutes
  private readonly SESSION_KEY = 'iwish_session_id';

  static getInstance(): CartAbandonmentService {
    if (!CartAbandonmentService.instance) {
      CartAbandonmentService.instance = new CartAbandonmentService();
    }
    return CartAbandonmentService.instance;
  }

  /**
   * Get or create session ID for tracking guest users
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    let sessionId = localStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      localStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Track cart activity - call this whenever cart changes
   */
  async trackCartActivity(
    cartItems: CartItem[],
    stage: 'cart' | 'checkout' | 'payment' = 'cart',
    userEmail?: string
  ): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      const userId = await this.getCurrentUserId();
      
      // Clear existing abandonment timer
      if (this.abandonmentTimers.has(sessionId)) {
        clearTimeout(this.abandonmentTimers.get(sessionId)!);
        this.abandonmentTimers.delete(sessionId);
      }

      // If cart is empty, no need to track abandonment
      if (cartItems.length === 0) {
        return;
      }

      // Calculate cart value and currency
      const cartValue = cartItems.reduce((sum, item) => 
        sum + (item.quote.total_quote_origincurrency || 0), 0
      );
      const currency = cartItems[0]?.quote.destination_country === 'NP' ? 'NPR' : 'INR';

      // Set new abandonment timer
      const timer = setTimeout(async () => {
        await this.detectAbandonment(
          userId,
          sessionId,
          cartItems,
          cartValue,
          currency,
          stage,
          userEmail
        );
      }, this.ABANDONMENT_DELAY);

      this.abandonmentTimers.set(sessionId, timer);

    } catch (error) {
      logger.error('Failed to track cart activity:', error);
    }
  }

  /**
   * Detect cart abandonment and create abandonment event
   */
  private async detectAbandonment(
    userId: string | null,
    sessionId: string,
    cartItems: CartItem[],
    cartValue: number,
    currency: string,
    stage: 'cart' | 'checkout' | 'payment',
    userEmail?: string
  ): Promise<void> {
    try {
      // Get current user email if not provided
      if (!userEmail && userId) {
        const { data: user } = await supabase.auth.getUser();
        userEmail = user.user?.email;
      }

      // Prepare context data
      const context = {
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        country: await this.getUserCountry(),
      };

      // Create abandonment event in database
      const { data: abandonmentId, error } = await supabase.rpc('detect_cart_abandonment', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_cart_items: cartItems,
        p_cart_value: cartValue,
        p_currency: currency,
        p_stage: stage,
        p_user_email: userEmail,
        p_context: context
      });

      if (error) throw error;

      logger.info('Cart abandonment detected:', {
        abandonmentId,
        stage,
        cartValue,
        itemCount: cartItems.length
      });

      // Track abandonment event in analytics
      analytics.trackEngagement({
        event_name: 'cart_abandoned',
        quote_value: cartValue,
        user_type: userId ? 'returning' : 'guest',
      });

      // Start recovery workflow
      await this.startRecoveryWorkflow(abandonmentId, userEmail, cartItems, cartValue, currency);

    } catch (error) {
      logger.error('Failed to detect cart abandonment:', error);
    }
  }

  /**
   * Start the recovery workflow for an abandoned cart
   */
  private async startRecoveryWorkflow(
    abandonmentId: string,
    userEmail: string | undefined,
    cartItems: CartItem[],
    cartValue: number,
    currency: string
  ): Promise<void> {
    try {
      // Schedule immediate browser notification (if permissions granted)
      if ('Notification' in window && Notification.permission === 'granted') {
        await this.scheduleNotificationRecovery(abandonmentId, cartItems, cartValue);
      }

      // Schedule email recovery sequence (if email available)
      if (userEmail) {
        await this.scheduleEmailRecoverySequence(abandonmentId, userEmail, cartItems, cartValue, currency);
      }

    } catch (error) {
      logger.error('Failed to start recovery workflow:', error);
    }
  }

  /**
   * Schedule browser notification for immediate recovery
   */
  private async scheduleNotificationRecovery(
    abandonmentId: string,
    cartItems: CartItem[],
    cartValue: number
  ): Promise<void> {
    try {
      // Schedule notification attempt in database
      const { error } = await supabase.rpc('schedule_recovery_attempt', {
        p_abandonment_id: abandonmentId,
        p_attempt_type: 'push_notification',
        p_sequence_number: 1,
        p_template_id: 'browser_notification_immediate',
        p_incentive: 'none'
      });

      if (error) throw error;

      // Show notification after 2 minutes
      setTimeout(() => {
        const notification = new Notification('Don\'t forget your items!', {
          body: `You have ${cartItems.length} items waiting in your cart`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'cart-abandonment',
          requireInteraction: true,
          actions: [
            { action: 'view-cart', title: 'View Cart' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = '/cart';
          notification.close();
        };

        // Track notification sent
        analytics.trackEngagement({
          event_name: 'recovery_notification_sent',
          quote_value: cartValue,
          user_type: 'customer',
        });

      }, 2 * 60 * 1000); // 2 minutes delay

    } catch (error) {
      logger.error('Failed to schedule notification recovery:', error);
    }
  }

  /**
   * Schedule email recovery sequence
   */
  private async scheduleEmailRecoverySequence(
    abandonmentId: string,
    userEmail: string,
    cartItems: CartItem[],
    cartValue: number,
    currency: string
  ): Promise<void> {
    try {
      // Email sequence timing:
      // 1 hour: Gentle reminder
      // 24 hours: With 5% discount
      // 72 hours: With free shipping
      
      const emailSequence = [
        { delay: 1 * 60 * 60 * 1000, template: 'cart_reminder_1h', incentive: 'none' }, // 1 hour
        { delay: 24 * 60 * 60 * 1000, template: 'cart_reminder_24h', incentive: '5_percent_off' }, // 24 hours
        { delay: 72 * 60 * 60 * 1000, template: 'cart_reminder_72h', incentive: 'free_shipping' }, // 72 hours
      ];

      for (let i = 0; i < emailSequence.length; i++) {
        const { delay, template, incentive } = emailSequence[i];
        
        setTimeout(async () => {
          try {
            // Check if cart is still abandoned
            const { data: event } = await supabase
              .from('cart_abandonment_events')
              .select('is_recovered')
              .eq('id', abandonmentId)
              .single();

            if (event?.is_recovered) {
              logger.info('Cart already recovered, skipping email', { abandonmentId, sequence: i + 1 });
              return;
            }

            // Schedule email attempt
            const { error } = await supabase.rpc('schedule_recovery_attempt', {
              p_abandonment_id: abandonmentId,
              p_attempt_type: 'email',
              p_sequence_number: i + 1,
              p_template_id: template,
              p_incentive: incentive
            });

            if (error) throw error;

            // Send email via your existing email service
            await this.sendRecoveryEmail(userEmail, template, cartItems, cartValue, currency, incentive);

            // Track email sent
            analytics.trackEngagement({
              event_name: 'recovery_email_sent',
              quote_value: cartValue,
              user_type: 'customer',
            });

          } catch (error) {
            logger.error(`Failed to send recovery email ${i + 1}:`, error);
          }
        }, delay);
      }

    } catch (error) {
      logger.error('Failed to schedule email recovery sequence:', error);
    }
  }

  /**
   * Send recovery email using existing email infrastructure
   */
  private async sendRecoveryEmail(
    email: string,
    template: string,
    cartItems: CartItem[],
    cartValue: number,
    currency: string,
    incentive: string
  ): Promise<void> {
    try {
      // This would integrate with your existing email service (Resend)
      // For now, log the email attempt
      logger.info('Sending cart recovery email:', {
        email,
        template,
        cartValue,
        itemCount: cartItems.length,
        incentive
      });

      // TODO: Implement actual email sending via Resend API
      // const emailData = this.buildRecoveryEmail(template, cartItems, cartValue, currency, incentive);
      // await this.sendEmail(email, emailData);

    } catch (error) {
      logger.error('Failed to send recovery email:', error);
    }
  }

  /**
   * Mark a cart as recovered (call when user completes purchase)
   */
  async markCartRecovered(userId?: string, recoveryMethod: string = 'organic'): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      
      // Find recent abandonment event
      const { data: events } = await supabase
        .from('cart_abandonment_events')
        .select('id')
        .or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
        .eq('is_recovered', false)
        .order('abandoned_at', { ascending: false })
        .limit(1);

      if (events && events.length > 0) {
        const { error } = await supabase.rpc('mark_cart_recovered', {
          p_abandonment_id: events[0].id,
          p_recovery_method: recoveryMethod
        });

        if (error) throw error;

        // Track recovery success
        analytics.trackEngagement({
          event_name: 'cart_recovery_success',
          user_type: userId ? 'returning' : 'guest',
        });

        logger.info('Cart recovery tracked:', { 
          abandonmentId: events[0].id, 
          recoveryMethod 
        });
      }

    } catch (error) {
      logger.error('Failed to mark cart as recovered:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Get analytics data for cart abandonment
   */
  async getAbandonmentAnalytics(days: number = 30): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('cart_recovery_analytics')
        .select('*')
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      return data;

    } catch (error) {
      logger.error('Failed to get abandonment analytics:', error);
      return [];
    }
  }

  // Helper methods
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  private async getUserCountry(): Promise<string> {
    try {
      // Try to get from user profile or localStorage
      const country = localStorage.getItem('userCountry');
      if (country) return country;

      // Fallback to geolocation or default
      return 'IN'; // Default to India
    } catch {
      return 'IN';
    }
  }
}

export const cartAbandonmentService = CartAbandonmentService.getInstance();
export type { CartItem, AbandonmentEvent, RecoveryAttempt };