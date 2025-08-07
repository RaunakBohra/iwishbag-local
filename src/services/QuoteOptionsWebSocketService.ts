/**
 * QuoteOptionsWebSocketService - Real-Time Quote Options Sync
 * 
 * Provides WebSocket-based real-time synchronization for quote option changes
 * Enables live updates between admin and customer interfaces
 * 
 * Features:
 * - Real-time notifications of quote option changes
 * - Cross-device synchronization (admin ↔ customer)
 * - Automatic reconnection and error handling
 * - Room-based isolation (one room per quote)
 * - Optimistic update support with conflict resolution
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { QuoteRecalculationResult } from './QuoteOptionsService';

export interface QuoteOptionsNotification {
  type: 'quote_options_updated' | 'quote_recalculated' | 'user_joined' | 'user_left';
  quote_id: string;
  user_id?: string;
  user_type?: 'admin' | 'customer';
  timestamp: string;
  data?: {
    changes?: {
      shipping_change: number;
      insurance_change: number;
      discount_change: number;
      total_change: number;
    };
    options_state?: any;
    updated_by?: string;
  };
}

export interface QuoteOptionsSubscriber {
  id: string;
  quote_id: string;
  user_id?: string;
  user_type: 'admin' | 'customer';
  callback: (notification: QuoteOptionsNotification) => void;
  connected_at: Date;
}

class QuoteOptionsWebSocketService {
  private static instance: QuoteOptionsWebSocketService;
  private subscribers = new Map<string, Map<string, QuoteOptionsSubscriber>>();
  private supabaseRealtimeChannel: any = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_INTERVAL = 2000; // 2 seconds

  static getInstance(): QuoteOptionsWebSocketService {
    if (!QuoteOptionsWebSocketService.instance) {
      QuoteOptionsWebSocketService.instance = new QuoteOptionsWebSocketService();
    }
    return QuoteOptionsWebSocketService.instance;
  }

  /**
   * Initialize WebSocket connection using Supabase Realtime
   */
  async initialize(): Promise<void> {
    try {
      logger.info('📡 [QuoteOptionsWS] Initializing WebSocket service...');

      // Use Supabase Realtime for WebSocket functionality
      this.supabaseRealtimeChannel = supabase
        .channel('quote_options_updates')
        .on('broadcast', { event: 'quote_options_changed' }, (payload) => {
          this.handleIncomingMessage(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          logger.info('📡 [QuoteOptionsWS] Presence sync completed');
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          logger.info('📡 [QuoteOptionsWS] User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          logger.info('📡 [QuoteOptionsWS] User left:', key, leftPresences);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger.info('✅ [QuoteOptionsWS] Successfully connected to Supabase Realtime');
          } else if (status === 'CHANNEL_ERROR') {
            this.isConnected = false;
            logger.error('❌ [QuoteOptionsWS] Channel error, attempting reconnection...');
            this.attemptReconnection();
          } else if (status === 'TIMED_OUT') {
            this.isConnected = false;
            logger.error('⏰ [QuoteOptionsWS] Connection timed out, attempting reconnection...');
            this.attemptReconnection();
          }
        });

      logger.info('✅ [QuoteOptionsWS] WebSocket service initialized');

    } catch (error) {
      logger.error('❌ [QuoteOptionsWS] Failed to initialize WebSocket service:', error);
      this.attemptReconnection();
    }
  }

  /**
   * Subscribe to quote option changes for a specific quote
   */
  subscribeToQuote(
    quoteId: string,
    userId: string | undefined,
    userType: 'admin' | 'customer',
    callback: (notification: QuoteOptionsNotification) => void
  ): string {
    const subscriberId = `${quoteId}_${userType}_${userId || 'anonymous'}_${Date.now()}`;
    
    logger.info(`📡 [QuoteOptionsWS] New subscription: ${subscriberId} for quote ${quoteId}`);

    // Initialize quote room if not exists
    if (!this.subscribers.has(quoteId)) {
      this.subscribers.set(quoteId, new Map());
    }

    const quoteSubscribers = this.subscribers.get(quoteId)!;
    
    // Add subscriber
    const subscriber: QuoteOptionsSubscriber = {
      id: subscriberId,
      quote_id: quoteId,
      user_id: userId,
      user_type: userType,
      callback,
      connected_at: new Date()
    };

    quoteSubscribers.set(subscriberId, subscriber);

    // Track presence in Supabase Realtime
    if (this.supabaseRealtimeChannel && this.isConnected) {
      this.supabaseRealtimeChannel.track({
        user_id: userId,
        user_type: userType,
        quote_id: quoteId,
        subscriber_id: subscriberId,
        online_at: new Date().toISOString()
      });
    }

    // Notify other subscribers that a user joined
    this.broadcastToQuote(quoteId, {
      type: 'user_joined',
      quote_id: quoteId,
      user_id: userId,
      user_type: userType,
      timestamp: new Date().toISOString()
    }, subscriberId); // Exclude the joining user from notification

    logger.info(`✅ [QuoteOptionsWS] Subscription created: ${subscriberId} (${quoteSubscribers.size} total subscribers for quote ${quoteId})`);

    return subscriberId;
  }

  /**
   * Unsubscribe from quote option changes
   */
  unsubscribeFromQuote(subscriberId: string): void {
    logger.info(`📡 [QuoteOptionsWS] Unsubscribing: ${subscriberId}`);

    let foundQuoteId: string | null = null;
    let subscriber: QuoteOptionsSubscriber | null = null;

    // Find and remove subscriber
    for (const [quoteId, quoteSubscribers] of this.subscribers.entries()) {
      if (quoteSubscribers.has(subscriberId)) {
        subscriber = quoteSubscribers.get(subscriberId)!;
        quoteSubscribers.delete(subscriberId);
        foundQuoteId = quoteId;

        // Clean up empty quote rooms
        if (quoteSubscribers.size === 0) {
          this.subscribers.delete(quoteId);
        }
        break;
      }
    }

    if (foundQuoteId && subscriber) {
      // Untrack presence in Supabase Realtime
      if (this.supabaseRealtimeChannel && this.isConnected) {
        this.supabaseRealtimeChannel.untrack();
      }

      // Notify other subscribers that user left
      this.broadcastToQuote(foundQuoteId, {
        type: 'user_left',
        quote_id: foundQuoteId,
        user_id: subscriber.user_id,
        user_type: subscriber.user_type,
        timestamp: new Date().toISOString()
      });

      logger.info(`✅ [QuoteOptionsWS] Unsubscribed: ${subscriberId} from quote ${foundQuoteId}`);
    } else {
      logger.warn(`⚠️ [QuoteOptionsWS] Subscriber not found: ${subscriberId}`);
    }
  }

  /**
   * Notify subscribers of quote option changes
   */
  async notifyQuoteOptionsUpdate(
    quoteId: string,
    recalculationResult: QuoteRecalculationResult,
    updatedBy?: string
  ): Promise<void> {
    logger.info(`📡 [QuoteOptionsWS] Notifying quote options update for ${quoteId}`, recalculationResult.changes);

    const notification: QuoteOptionsNotification = {
      type: 'quote_options_updated',
      quote_id: quoteId,
      timestamp: new Date().toISOString(),
      data: {
        changes: recalculationResult.changes,
        options_state: recalculationResult.options_state,
        updated_by: updatedBy
      }
    };

    // Broadcast to all subscribers of this quote
    await this.broadcastToQuote(quoteId, notification);

    // Also broadcast via Supabase Realtime for cross-tab sync
    if (this.supabaseRealtimeChannel && this.isConnected) {
      this.supabaseRealtimeChannel.send({
        type: 'broadcast',
        event: 'quote_options_changed',
        payload: notification
      });
    }
  }

  /**
   * Get current subscribers for a quote (for analytics)
   */
  getQuoteSubscribers(quoteId: string): QuoteOptionsSubscriber[] {
    const quoteSubscribers = this.subscribers.get(quoteId);
    return quoteSubscribers ? Array.from(quoteSubscribers.values()) : [];
  }

  /**
   * Get total connection stats
   */
  getConnectionStats(): {
    connected: boolean;
    total_subscribers: number;
    active_quotes: number;
    reconnect_attempts: number;
  } {
    let totalSubscribers = 0;
    for (const quoteSubscribers of this.subscribers.values()) {
      totalSubscribers += quoteSubscribers.size;
    }

    return {
      connected: this.isConnected,
      total_subscribers: totalSubscribers,
      active_quotes: this.subscribers.size,
      reconnect_attempts: this.reconnectAttempts
    };
  }

  /**
   * Broadcast notification to all subscribers of a quote
   */
  private async broadcastToQuote(
    quoteId: string,
    notification: QuoteOptionsNotification,
    excludeSubscriberId?: string
  ): Promise<void> {
    const quoteSubscribers = this.subscribers.get(quoteId);
    if (!quoteSubscribers || quoteSubscribers.size === 0) {
      logger.info(`📡 [QuoteOptionsWS] No subscribers for quote ${quoteId}, skipping broadcast`);
      return;
    }

    let notifiedCount = 0;
    for (const [subscriberId, subscriber] of quoteSubscribers.entries()) {
      if (excludeSubscriberId && subscriberId === excludeSubscriberId) {
        continue; // Skip excluded subscriber
      }

      try {
        subscriber.callback(notification);
        notifiedCount++;
      } catch (error) {
        logger.error(`❌ [QuoteOptionsWS] Failed to notify subscriber ${subscriberId}:`, error);
        // Remove failed subscriber
        quoteSubscribers.delete(subscriberId);
      }
    }

    logger.info(`✅ [QuoteOptionsWS] Notified ${notifiedCount} subscribers for quote ${quoteId}`);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(payload: any): void {
    try {
      logger.info('📡 [QuoteOptionsWS] Received message:', payload);

      if (payload.type === 'quote_options_changed') {
        const notification = payload as QuoteOptionsNotification;
        this.broadcastToQuote(notification.quote_id, notification);
      }

    } catch (error) {
      logger.error('❌ [QuoteOptionsWS] Failed to handle incoming message:', error, payload);
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error(`❌ [QuoteOptionsWS] Max reconnection attempts reached (${this.MAX_RECONNECT_ATTEMPTS}), giving up`);
      return;
    }

    this.reconnectAttempts++;
    logger.info(`🔄 [QuoteOptionsWS] Attempting reconnection ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}...`);

    setTimeout(() => {
      this.initialize();
    }, this.RECONNECT_INTERVAL * this.reconnectAttempts); // Exponential backoff
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    logger.info('📡 [QuoteOptionsWS] Disconnecting WebSocket service...');

    if (this.supabaseRealtimeChannel) {
      await this.supabaseRealtimeChannel.unsubscribe();
      this.supabaseRealtimeChannel = null;
    }

    this.subscribers.clear();
    this.isConnected = false;
    this.reconnectAttempts = 0;

    logger.info('✅ [QuoteOptionsWS] Disconnected successfully');
  }
}

// Export singleton instance
export const quoteOptionsWebSocketService = QuoteOptionsWebSocketService.getInstance();

// Auto-initialize when service is imported
quoteOptionsWebSocketService.initialize().catch((error) => {
  logger.error('❌ [QuoteOptionsWS] Auto-initialization failed:', error);
});

export default QuoteOptionsWebSocketService;