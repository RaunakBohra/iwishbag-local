/**
 * NCM Order Creation Service
 * Automatically creates NCM orders when iwishBag orders are paid for Nepal deliveries
 * Integrates with payment flow and order management system
 */

import { supabase } from '../integrations/supabase/client';
import NCMService, { NCMCreateOrderParams } from './NCMService';
import { ncmBranchMappingService } from './NCMBranchMappingService';
import { ncmOrderTrackingService } from './NCMOrderTrackingService';
import { trackingService } from './TrackingService';
import { logger } from '@/utils/logger';
import type { UnifiedQuote } from '@/types/unified-quote';

export interface NCMOrderCreationRequest {
  iwishbag_order_id: string;
  quote: UnifiedQuote;
  customer_info: {
    name: string;
    phone: string;
    phone2?: string;
    email?: string;
  };
  delivery_address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    district?: string;
    postal?: string;
  };
  service_type: 'Pickup' | 'Collect';
  cod_amount?: number;
  special_instructions?: string;
}

export interface NCMOrderCreationResult {
  success: boolean;
  ncm_order_id?: number;
  tracking_id?: string;
  error?: string;
  warnings?: string[];
}

class NCMOrderCreationService {
  private static instance: NCMOrderCreationService;
  private ncmService: NCMService;

  private constructor() {
    this.ncmService = NCMService.getInstance();
  }

  static getInstance(): NCMOrderCreationService {
    if (!NCMOrderCreationService.instance) {
      NCMOrderCreationService.instance = new NCMOrderCreationService();
    }
    return NCMOrderCreationService.instance;
  }

  /**
   * Main method: Create NCM order from iwishBag order
   */
  async createNCMOrderFromQuote(request: NCMOrderCreationRequest): Promise<NCMOrderCreationResult> {
    logger.business('🚚 [NCM Order] Creating NCM order for iwishBag order:', {
      iwishbag_order_id: request.iwishbag_order_id,
      destination_country: request.quote.destination_country,
      service_type: request.service_type
    });

    try {
      // Validate that this is a Nepal order
      if (request.quote.destination_country !== 'NP') {
        throw new Error('NCM orders are only for Nepal deliveries');
      }

      // Step 1: Validate and format customer phone number
      const formattedPhone = this.validateAndFormatPhone(request.customer_info.phone);
      if (!formattedPhone) {
        throw new Error('Invalid Nepal phone number format');
      }

      // Step 2: Get branch mapping for delivery
      const branchPair = await ncmBranchMappingService.getBranchPair({
        city: request.delivery_address.city,
        district: request.delivery_address.district,
        addressLine1: request.delivery_address.line1,
        addressLine2: request.delivery_address.line2
      });

      if (!branchPair.pickup || !branchPair.destination) {
        throw new Error('Unable to find suitable NCM branches for this delivery');
      }

      logger.debug('✅ [NCM Order] Branch mapping found:', {
        pickup: branchPair.pickup.name,
        destination: branchPair.destination.name,
        confidence: branchPair.mapping?.confidence
      });

      // Step 3: Calculate COD amount (optional - for cash payments)
      const codAmount = request.cod_amount || 0;

      // Step 4: Prepare NCM order parameters
      const ncmOrderParams: NCMCreateOrderParams = {
        name: request.customer_info.name,
        phone: formattedPhone,
        phone2: request.customer_info.phone2 ? this.validateAndFormatPhone(request.customer_info.phone2) || undefined : undefined,
        cod_charge: codAmount.toString(),
        address: this.formatDeliveryAddress(request.delivery_address),
        fbranch: branchPair.pickup.name, // From branch (pickup)
        branch: branchPair.destination.name, // To branch (delivery)
        package: this.generatePackageDescription(request.quote),
        vref_id: request.iwishbag_order_id, // iwishBag reference
        instruction: request.special_instructions || `iwishBag Order: ${request.quote.display_id}`
      };

      logger.debug('🔄 [NCM Order] Creating order with NCM API:', ncmOrderParams);

      // Step 5: Create order via NCM API
      const ncmOrderResponse = await this.ncmService.createOrder(ncmOrderParams);

      if (ncmOrderResponse.Error) {
        const errorMessages = Object.values(ncmOrderResponse.Error).join(', ');
        throw new Error(`NCM API error: ${errorMessages}`);
      }

      if (!ncmOrderResponse.orderid) {
        throw new Error('NCM API did not return order ID');
      }

      logger.business('✅ [NCM Order] Successfully created NCM order:', {
        ncm_order_id: ncmOrderResponse.orderid,
        message: ncmOrderResponse.Message
      });

      // Step 6: Create tracking record
      const trackingRecord = await ncmOrderTrackingService.createTrackingRecord({
        ncm_order_id: ncmOrderResponse.orderid,
        iwishbag_order_id: request.iwishbag_order_id,
        customer_phone: formattedPhone,
        delivery_address: this.formatDeliveryAddress(request.delivery_address),
        pickup_branch: branchPair.pickup.name,
        destination_branch: branchPair.destination.name,
        service_type: request.service_type,
        cod_amount: codAmount > 0 ? codAmount : undefined
      });

      // Step 7: Update iwishBag order with NCM tracking info
      await this.updateIwishBagOrder(request.iwishbag_order_id, {
        ncm_order_id: ncmOrderResponse.orderid,
        tracking_id: trackingRecord.tracking_id,
        pickup_branch: branchPair.pickup.name,
        destination_branch: branchPair.destination.name
      });

      const warnings: string[] = [];
      if (branchPair.mapping?.confidence === 'low') {
        warnings.push('Branch mapping has low confidence - please verify delivery address');
      }

      return {
        success: true,
        ncm_order_id: ncmOrderResponse.orderid,
        tracking_id: trackingRecord.tracking_id,
        warnings
      };

    } catch (error) {
      logger.error('❌ [NCM Order] Failed to create NCM order:', error);
      
      // Log failure for monitoring
      await this.logOrderCreationFailure(request.iwishbag_order_id, error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create NCM order from paid iwishBag order (manual admin action)
   */
  async createFromPaidOrder(iwishbag_order_id: string, options?: {
    service_type?: 'Pickup' | 'Collect';
    special_instructions?: string;
  }): Promise<NCMOrderCreationResult> {
    logger.business('🔄 [NCM Order] Creating NCM order for paid order:', iwishbag_order_id);

    try {
      // Get the paid order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          quotes:quote_id (
            *,
            items:quote_items (*)
          )
        `)
        .eq('id', iwishbag_order_id)
        .single();

      if (orderError || !orderData) {
        throw new Error('Order not found or failed to fetch order details');
      }

      const quote = orderData.quotes as UnifiedQuote;

      // Only create NCM orders for Nepal deliveries
      if (quote.destination_country !== 'NP') {
        throw new Error('NCM orders are only available for Nepal deliveries');
      }

      // Check if NCM order already exists
      const { data: existingNCM } = await supabase
        .from('ncm_order_tracking')
        .select('ncm_order_id, tracking_id')
        .eq('iwishbag_order_id', iwishbag_order_id)
        .single();

      if (existingNCM) {
        return {
          success: false,
          error: `NCM order already exists (Order ID: ${existingNCM.ncm_order_id}, Tracking: ${existingNCM.tracking_id})`
        };
      }

      // Extract customer info from order/quote
      const customerInfo = this.extractCustomerInfo(orderData, quote);
      const deliveryAddress = this.extractDeliveryAddress(quote);

      // Use provided service type or default to Pickup
      const serviceType: 'Pickup' | 'Collect' = options?.service_type || 'Pickup';

      // Calculate COD amount if payment is cash-on-delivery
      const codAmount = orderData.payment_method === 'cod' ? quote.final_total_origincurrency * 133 : 0; // Rough USD to NPR conversion

      const request: NCMOrderCreationRequest = {
        iwishbag_order_id,
        quote,
        customer_info: customerInfo,
        delivery_address: deliveryAddress,
        service_type: serviceType,
        cod_amount: codAmount,
        special_instructions: options?.special_instructions || `Manual creation from iwishBag order ${quote.display_id}`
      };

      return await this.createNCMOrderFromQuote(request);

    } catch (error) {
      logger.error('❌ [NCM Order] Manual creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Manual creation failed'
      };
    }
  }

  /**
   * Validate and format Nepal phone number
   */
  private validateAndFormatPhone(phone: string): string | null {
    if (!phone) return null;
    
    // Use the NCM branch mapping service's phone formatter
    return ncmBranchMappingService.formatNepalPhone(phone);
  }

  /**
   * Format delivery address for NCM
   */
  private formatDeliveryAddress(address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    district?: string;
    postal?: string;
  }): string {
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.district || address.state,
      address.postal
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Generate package description from quote items
   */
  private generatePackageDescription(quote: UnifiedQuote): string {
    if (!quote.items || quote.items.length === 0) {
      return 'International Shopping Package';
    }

    if (quote.items.length === 1) {
      return `1x ${quote.items[0].name}`;
    }

    return `${quote.items.length} items from international shopping`;
  }

  /**
   * Extract customer info from order/quote data
   */
  private extractCustomerInfo(orderData: any, quote: UnifiedQuote): {
    name: string;
    phone: string;
    phone2?: string;
    email?: string;
  } {
    // Try to get customer info from various sources
    const customerData = quote.customer_data?.info || {};
    const shippingAddress = quote.customer_data?.shipping_address || {};

    return {
      name: customerData.name || orderData.customer_name || 'iwishBag Customer',
      phone: customerData.phone || shippingAddress.phone || orderData.customer_phone || '',
      email: customerData.email || orderData.customer_email,
      // phone2 can be extracted from additional customer fields if needed
    };
  }

  /**
   * Extract delivery address from quote
   */
  private extractDeliveryAddress(quote: UnifiedQuote): {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    district?: string;
    postal?: string;
  } {
    const shippingAddress = quote.customer_data?.shipping_address || {};

    return {
      line1: shippingAddress.line1 || '',
      line2: shippingAddress.line2,
      city: shippingAddress.city || '',
      state: shippingAddress.state,
      district: shippingAddress.district,
      postal: shippingAddress.postal
    };
  }

  /**
   * Update iwishBag order with NCM tracking information
   */
  private async updateIwishBagOrder(
    iwishbag_order_id: string, 
    ncmInfo: {
      ncm_order_id: number;
      tracking_id: string;
      pickup_branch: string;
      destination_branch: string;
    }
  ): Promise<void> {
    try {
      // Update the order with NCM tracking info
      const { error } = await supabase
        .from('orders')
        .update({
          ncm_order_id: ncmInfo.ncm_order_id,
          tracking_id: ncmInfo.tracking_id,
          shipping_carrier: 'NCM Nepal Can Move',
          tracking_status: 'preparing',
          updated_at: new Date().toISOString()
        })
        .eq('id', iwishbag_order_id);

      if (error) {
        logger.error('❌ [NCM Order] Failed to update iwishBag order:', error);
        throw error;
      }

      logger.debug('✅ [NCM Order] Updated iwishBag order with NCM info');

    } catch (error) {
      logger.error('❌ [NCM Order] Error updating iwishBag order:', error);
      throw error;
    }
  }

  /**
   * Log order creation failure for monitoring
   */
  private async logOrderCreationFailure(iwishbag_order_id: string, error: string): Promise<void> {
    try {
      await supabase
        .from('ncm_order_creation_failures')
        .insert({
          iwishbag_order_id,
          error_message: error,
          attempted_at: new Date().toISOString()
        });
    } catch (logError) {
      logger.error('❌ [NCM Order] Failed to log creation failure:', logError);
    }
  }

  /**
   * Retry failed NCM order creation
   */
  async retryFailedOrderCreation(iwishbag_order_id: string, options?: {
    service_type?: 'Pickup' | 'Collect';
    special_instructions?: string;
  }): Promise<NCMOrderCreationResult> {
    logger.business('🔄 [NCM Order] Retrying failed NCM order creation:', iwishbag_order_id);
    
    // Update retry count in failure log
    await supabase
      .from('ncm_order_creation_failures')
      .update({ 
        retry_count: supabase.raw('retry_count + 1'),
        attempted_at: new Date().toISOString()
      })
      .eq('iwishbag_order_id', iwishbag_order_id)
      .eq('resolved', false);
    
    // Call manual creation method
    const result = await this.createFromPaidOrder(iwishbag_order_id, options);
    
    // Mark as resolved if successful
    if (result.success) {
      await supabase
        .from('ncm_order_creation_failures')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('iwishbag_order_id', iwishbag_order_id);
    }
    
    return result;
  }

  /**
   * Check if an order is eligible for NCM order creation
   */
  async checkOrderEligibility(iwishbag_order_id: string): Promise<{
    eligible: boolean;
    reason?: string;
    order_info?: {
      quote_id: string;
      destination_country: string;
      status: string;
      customer_name?: string;
      ncm_order_exists: boolean;
    };
  }> {
    try {
      // Get order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          quotes:quote_id (
            id,
            destination_country,
            display_id,
            customer_data
          )
        `)
        .eq('id', iwishbag_order_id)
        .single();

      if (orderError || !orderData) {
        return {
          eligible: false,
          reason: 'Order not found'
        };
      }

      const quote = orderData.quotes as any;

      // Check if NCM order already exists
      const { data: existingNCM } = await supabase
        .from('ncm_order_tracking')
        .select('ncm_order_id, tracking_id')
        .eq('iwishbag_order_id', iwishbag_order_id)
        .single();

      const ncmOrderExists = !!existingNCM;

      const orderInfo = {
        quote_id: quote.id,
        destination_country: quote.destination_country,
        status: orderData.status,
        customer_name: quote.customer_data?.info?.name || orderData.customer_name,
        ncm_order_exists: ncmOrderExists
      };

      // Check eligibility criteria
      if (quote.destination_country !== 'NP') {
        return {
          eligible: false,
          reason: 'Order is not for Nepal delivery',
          order_info: orderInfo
        };
      }

      if (ncmOrderExists) {
        return {
          eligible: false,
          reason: `NCM order already exists (ID: ${existingNCM.ncm_order_id})`,
          order_info: orderInfo
        };
      }

      if (orderData.status !== 'paid' && orderData.status !== 'confirmed') {
        return {
          eligible: false,
          reason: `Order status is ${orderData.status}, must be paid or confirmed`,
          order_info: orderInfo
        };
      }

      return {
        eligible: true,
        order_info: orderInfo
      };

    } catch (error) {
      logger.error('❌ [NCM Order] Error checking eligibility:', error);
      return {
        eligible: false,
        reason: 'Failed to check order eligibility'
      };
    }
  }

  /**
   * Get failed order creation attempts for admin monitoring
   */
  async getFailedCreationAttempts(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ncm_order_creation_failures')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('❌ [NCM Order] Failed to get failure logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [NCM Order] Error getting failure logs:', error);
      return [];
    }
  }
}

export const ncmOrderCreationService = NCMOrderCreationService.getInstance();
export { NCMOrderCreationService };