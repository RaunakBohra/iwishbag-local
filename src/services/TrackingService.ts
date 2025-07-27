// ============================================================================
// TRACKING SERVICE - iwishBag Internal Tracking System
// Minimal implementation for Phase 1: Generate IDs, update statuses, basic operations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

type Quote = Database['public']['Tables']['quotes']['Row'];
type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];

// Basic tracking statuses for Phase 1
export type TrackingStatus =
  | 'pending' // Quote approved, not yet prepared
  | 'preparing' // Packing/processing order
  | 'shipped' // Handed to carrier
  | 'delivered' // Successfully delivered
  | 'exception'; // Any issues/delays

interface TrackingUpdate {
  tracking_status: TrackingStatus;
  shipping_carrier?: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
}

interface BasicTrackingInfo {
  iwish_tracking_id: string | null;
  tracking_status: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  estimated_delivery_date: string | null;
  display_id: string | null;
}

class TrackingService {
  /**
   * Generate iwishBag tracking ID for a quote
   */
  async generateTrackingId(quoteId: string): Promise<string | null> {
    try {
      logger.debug('🆔 Generating iwishBag tracking ID for quote:', quoteId);

      // Call database function to generate tracking ID
      const { data, error } = await supabase.rpc('generate_iwish_tracking_id');

      if (error) {
        logger.error('❌ Error generating tracking ID:', error);
        return null;
      }

      const trackingId = data as string;
      logger.debug('✅ Generated tracking ID:', trackingId);

      // Update quote with new tracking ID
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ iwish_tracking_id: trackingId })
        .eq('id', quoteId);

      if (updateError) {
        logger.error('❌ Error updating quote with tracking ID:', updateError);
        return null;
      }

      logger.debug('✅ Quote updated with tracking ID successfully');
      return trackingId;
    } catch (error) {
      logger.error('❌ Exception in generateTrackingId:', error);
      return null;
    }
  }

  /**
   * Update tracking status for a quote
   */
  async updateTrackingStatus(quoteId: string, update: TrackingUpdate): Promise<boolean> {
    try {
      logger.debug('📦 Updating tracking status for quote:', quoteId, update);

      const updateData: QuoteUpdate = {
        tracking_status: update.tracking_status,
      };

      // Add optional fields if provided
      if (update.shipping_carrier) {
        updateData.shipping_carrier = update.shipping_carrier;
      }

      if (update.tracking_number) {
        updateData.tracking_number = update.tracking_number;
      }

      if (update.estimated_delivery_date) {
        updateData.estimated_delivery_date = update.estimated_delivery_date;
      }

      const { error } = await supabase.from('quotes').update(updateData).eq('id', quoteId);

      if (error) {
        logger.error('❌ Error updating tracking status:', error);
        return false;
      }

      logger.debug('✅ Tracking status updated successfully');
      return true;
    } catch (error) {
      logger.error('❌ Exception in updateTrackingStatus:', error);
      return false;
    }
  }

  /**
   * Get basic tracking info for a quote by quote ID (for admin use)
   */
  async getBasicTrackingInfo(quoteId: string): Promise<BasicTrackingInfo | null> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(
          'iwish_tracking_id, tracking_status, shipping_carrier, tracking_number, estimated_delivery_date, display_id',
        )
        .eq('id', quoteId)
        .single();

      if (error) {
        logger.error('❌ Error fetching tracking info:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ Exception in getBasicTrackingInfo:', error);
      return null;
    }
  }

  /**
   * Get tracking info by iwishBag tracking ID (for customer tracking page)
   */
  async getTrackingInfoByTrackingId(iwishTrackingId: string): Promise<BasicTrackingInfo | null> {
    try {
      logger.debug('🔍 Looking up tracking info for:', iwishTrackingId);

      const { data, error } = await supabase
        .from('quotes')
        .select(
          'iwish_tracking_id, tracking_status, shipping_carrier, tracking_number, estimated_delivery_date, display_id',
        )
        .eq('iwish_tracking_id', iwishTrackingId)
        .single();

      if (error) {
        logger.error('❌ Error fetching tracking info by tracking ID:', error);
        return null;
      }

      logger.debug('✅ Found tracking info:', data);
      return data;
    } catch (error) {
      logger.error('❌ Exception in getTrackingInfoByTrackingId:', error);
      return null;
    }
  }

  /**
   * Get full quote data for customer tracking page by iwishBag tracking ID
   * This is what the customer tracking page needs
   */
  async getTrackingInfo(iwishTrackingId: string): Promise<any> {
    try {
      logger.debug('🔍 Looking up full quote for customer tracking:', iwishTrackingId);

      // Import UnifiedDataEngine dynamically to avoid circular dependencies
      const { unifiedDataEngine } = await import('@/services/UnifiedDataEngine');

      // First get the quote ID from tracking ID
      const { data: trackingData, error: trackingError } = await supabase
        .from('quotes')
        .select('id')
        .eq('iwish_tracking_id', iwishTrackingId)
        .single();

      if (trackingError || !trackingData) {
        logger.error('❌ Quote not found for tracking ID:', iwishTrackingId);
        return null;
      }

      // Get full quote data using UnifiedDataEngine
      const quote = await unifiedDataEngine.getQuote(trackingData.id);

      if (!quote) {
        logger.error('❌ Failed to fetch full quote data');
        return null;
      }

      logger.debug('✅ Found full quote for customer tracking');
      return quote;
    } catch (error) {
      logger.error('❌ Exception in getTrackingInfo for customer:', error);
      return null;
    }
  }

  /**
   * Mark quote as shipped (common admin action)
   */
  async markAsShipped(
    quoteId: string,
    carrier: string,
    trackingNumber: string,
    estimatedDeliveryDate?: string,
  ): Promise<boolean> {
    logger.business('🚚 Marking quote as shipped:', {
      quoteId,
      carrier,
      trackingNumber,
      estimatedDeliveryDate,
    });

    // Generate tracking ID if it doesn't exist
    const currentInfo = await this.getBasicTrackingInfo(quoteId);

    let iwishTrackingId = currentInfo?.iwish_tracking_id;
    if (!iwishTrackingId) {
      iwishTrackingId = await this.generateTrackingId(quoteId);
      if (!iwishTrackingId) {
        logger.error('❌ Failed to generate tracking ID');
        return false;
      }
    }

    // Update with shipping info
    return await this.updateTrackingStatus(quoteId, {
      tracking_status: 'shipped',
      shipping_carrier: carrier,
      tracking_number: trackingNumber,
      estimated_delivery_date: estimatedDeliveryDate,
    });
  }

  /**
   * Get status display text for UI
   */
  getStatusDisplayText(status: string | null): string {
    switch (status) {
      case 'pending':
        return 'Order Confirmed';
      case 'preparing':
        return 'Preparing for Shipment';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'exception':
        return 'Delivery Issue';
      default:
        return 'Unknown Status';
    }
  }

  /**
   * Get status badge variant for UI styling
   */
  getStatusBadgeVariant(
    status: string | null,
  ): 'default' | 'secondary' | 'success' | 'destructive' {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'preparing':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'success';
      case 'exception':
        return 'destructive';
      default:
        return 'secondary';
    }
  }
}

// Export singleton instance
export const trackingService = new TrackingService();
export default trackingService;
