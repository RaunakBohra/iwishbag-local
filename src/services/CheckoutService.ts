/**
 * Checkout Service - Handles checkout flow business logic
 * 
 * RESPONSIBILITIES:
 * - Order creation and processing
 * - Cart validation and item availability checks
 * - Order summary calculations
 * - Integration with payment systems
 * - Order status management
 * - Error handling and recovery
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';
import { PaymentActionsService } from '@/services/payment-management/PaymentActionsService';
import { trackingService } from '@/services/TrackingService';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';
import type { CartItem } from '@/types/cart';

export interface OrderSummary {
  itemsTotal: number;
  shippingTotal: number;
  taxesTotal: number;
  serviceFeesTotal: number;
  finalTotal: number;
  currency: string;
  savings?: number;
}

export interface CreateOrderRequest {
  items: CartItem[];
  address: any;
  paymentMethod: string;
  orderSummary: OrderSummary;
  userId: string;
}

export interface OrderResult {
  id: string;
  orderNumber: string;
  status: string;
  trackingId?: string;
  paymentRequired: boolean;
  paymentInstructions?: any;
}

export class CheckoutService {
  private static instance: CheckoutService;
  private paymentService: PaymentActionsService;

  private constructor() {
    this.paymentService = PaymentActionsService.getInstance();
    logger.info('CheckoutService initialized');
  }

  static getInstance(): CheckoutService {
    if (!CheckoutService.instance) {
      CheckoutService.instance = new CheckoutService();
    }
    return CheckoutService.instance;
  }

  /**
   * Validate cart items are still available and approved
   */
  async validateCartItems(items: CartItem[]): Promise<boolean> {
    try {
      logger.info(`Validating ${items.length} cart items`);

      if (items.length === 0) {
        return false;
      }

      // Check each quote is still approved and available
      for (const item of items) {
        const { data: quote, error } = await supabase
          .from('quotes_v2')
          .select('id, status, final_total_origincurrency, customer_currency')
          .eq('id', item.quote.id)
          .single();

        if (error || !quote) {
          logger.warn(`Quote ${item.quote.id} not found during validation`);
          return false;
        }

        if (quote.status !== 'approved') {
          logger.warn(`Quote ${item.quote.id} is no longer approved (status: ${quote.status})`);
          return false;
        }

        // Verify pricing hasn't changed significantly (within 1% tolerance)
        const currentTotal = quote.final_total_origincurrency || 0;
        const expectedTotal = item.quote.final_total_origincurrency || 0;
        const priceDifference = Math.abs(currentTotal - expectedTotal) / expectedTotal;
        
        if (priceDifference > 0.01) { // 1% tolerance
          logger.warn(`Quote ${item.quote.id} price changed significantly: ${expectedTotal} -> ${currentTotal}`);
          return false;
        }
      }

      logger.info('All cart items validated successfully');
      return true;

    } catch (error) {
      logger.error('Cart validation failed:', error);
      return false;
    }
  }

  /**
   * Calculate comprehensive order summary
   */
  async calculateOrderSummary(items: CartItem[], destinationCountry: string): Promise<OrderSummary> {
    try {
      console.log(`[CHECKOUT SERVICE] Calculating order summary for ${items.length} items, destination: ${destinationCountry}`);
      logger.info(`Calculating order summary for ${items.length} items, destination: ${destinationCountry}`);

      let itemsTotal = 0;
      let shippingTotal = 0;
      let taxesTotal = 0;
      let serviceFeesTotal = 0;
      let savings = 0;

      // Get user's preferred currency
      console.log(`[CHECKOUT SERVICE] Getting currency for destination: ${destinationCountry}`);
      const userCurrency = await currencyService.getCurrencyForCountry(destinationCountry);
      console.log(`[CHECKOUT SERVICE] User currency: ${userCurrency}`);

      // Process each cart item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const quote = item.quote;
        const quoteCalculation = quote.calculation_data?.calculation_steps || {};

        console.log(`[CHECKOUT SERVICE] Processing item ${i + 1}:`, {
          quoteId: quote.id,
          display_id: quote.display_id,
          customer_currency: quote.customer_currency,
          origin_country: quote.origin_country,
          destination_country: quote.destination_country,
          total_quote_origincurrency: quote.total_quote_origincurrency,
          final_total_origin: quote.final_total_origin,
          calculation_data: !!quote.calculation_data
        });

        // Convert amounts to user currency if needed
        const originCurrency = quote.customer_currency || 
          (quote.origin_country ? getOriginCurrency(quote.origin_country) : null) ||
          (quote.destination_country ? getDestinationCurrency(quote.destination_country) : 'USD');
        
        console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Origin currency: ${originCurrency}, User currency: ${userCurrency}`);
        
        let conversionRate = 1;
        
        // Only convert if we have valid currencies and they're different
        if (originCurrency && userCurrency && originCurrency !== userCurrency) {
          try {
            console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Getting exchange rate: ${originCurrency} -> ${userCurrency}`);
            // Use currency-based conversion method for better compatibility
            conversionRate = await currencyService.getExchangeRateByCurrency(originCurrency, userCurrency);
            console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Exchange rate: ${conversionRate}`);
          } catch (error) {
            console.warn(`[CHECKOUT SERVICE] Item ${i + 1} - Failed to get exchange rate, using 1:1`, { originCurrency, userCurrency, error });
            logger.warn('Failed to get exchange rate, using 1:1', { originCurrency, userCurrency, error });
            conversionRate = 1;
          }
        } else {
          console.log(`[CHECKOUT SERVICE] Item ${i + 1} - No conversion needed (same currency or missing currency info)`);
        }

        // Items subtotal
        const itemSubtotal = (quoteCalculation.discounted_items_subtotal || quoteCalculation.items_subtotal || 0) * conversionRate;
        console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Item subtotal: ${itemSubtotal} ${userCurrency}`);
        itemsTotal += itemSubtotal;

        // Shipping costs
        const shippingCost = (
          (quoteCalculation.discounted_shipping_cost || quoteCalculation.shipping_cost || 0) +
          (quoteCalculation.insurance_amount || 0) +
          (quoteCalculation.discounted_delivery || quoteCalculation.domestic_delivery || 0)
        ) * conversionRate;
        console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Shipping cost: ${shippingCost} ${userCurrency}`);
        shippingTotal += shippingCost;

        // Taxes and duties
        const taxesCost = (
          (quoteCalculation.discounted_customs_duty || quoteCalculation.customs_duty || 0) +
          (quoteCalculation.discounted_tax_amount || quoteCalculation.local_tax_amount || 0)
        ) * conversionRate;
        console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Taxes cost: ${taxesCost} ${userCurrency}`);
        taxesTotal += taxesCost;

        // Service fees
        const serviceFeeCost = (
          (quoteCalculation.discounted_handling_fee || quoteCalculation.handling_fee || 0) +
          (quoteCalculation.payment_gateway_fee || 0)
        ) * conversionRate;
        console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Service fees: ${serviceFeeCost} ${userCurrency}`);
        serviceFeesTotal += serviceFeeCost;

        // Total savings
        const quoteSavings = (quoteCalculation.total_savings || 0) * conversionRate;
        console.log(`[CHECKOUT SERVICE] Item ${i + 1} - Savings: ${quoteSavings} ${userCurrency}`);
        savings += quoteSavings;
      }

      const finalTotal = itemsTotal + shippingTotal + taxesTotal + serviceFeesTotal;

      console.log(`[CHECKOUT SERVICE] Order summary totals:`, {
        itemsTotal,
        shippingTotal,
        taxesTotal,
        serviceFeesTotal,
        finalTotal,
        currency: userCurrency,
        savings
      });

      const summary: OrderSummary = {
        itemsTotal,
        shippingTotal,
        taxesTotal,
        serviceFeesTotal,
        finalTotal,
        currency: userCurrency,
        savings: savings > 0 ? savings : undefined
      };

      logger.info('Order summary calculated:', {
        itemsTotal,
        shippingTotal,
        taxesTotal,
        serviceFeesTotal,
        finalTotal,
        currency: userCurrency,
        savings
      });

      return summary;

    } catch (error) {
      console.error(`[CHECKOUT SERVICE] Failed to calculate order summary:`, error);
      logger.error('Failed to calculate order summary:', error);
      throw new Error('Unable to calculate order total. Please try again.');
    }
  }

  /**
   * Create order from checkout data
   */
  async createOrder(request: CreateOrderRequest): Promise<OrderResult> {
    try {
      logger.info(`Creating order for user ${request.userId} with ${request.items.length} items`);

      // Start a transaction-like process
      const orderData = await this.processOrderCreation(request);

      logger.info(`Order created successfully: ${orderData.orderNumber}`);
      return orderData;

    } catch (error) {
      logger.error('Order creation failed:', error);
      throw new Error('Failed to create order. Please try again.');
    }
  }

  /**
   * Process order creation with all necessary steps
   */
  private async processOrderCreation(request: CreateOrderRequest): Promise<OrderResult> {
    // Generate order number and tracking ID
    const orderNumber = await this.generateOrderNumber();
    const trackingId = await trackingService.generateTrackingId();

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: request.userId,
        status: 'pending_payment',
        total_amount: request.orderSummary.finalTotal,
        currency: request.orderSummary.currency,
        payment_method: request.paymentMethod,
        delivery_address: request.address,
        tracking_id: trackingId,
        order_data: {
          items: request.items.map(item => ({
            quoteId: item.quote.id,
            quoteName: `Quote #${item.quote.display_id || item.quote.id.slice(0, 8)}`,
            amount: item.quote.final_total_origincurrency || 0,
            currency: item.quote.customer_currency || 
              (item.quote.origin_country ? getOriginCurrency(item.quote.origin_country) : null) ||
              (item.quote.destination_country ? getDestinationCurrency(item.quote.destination_country) : 'USD')
          })),
          summary: request.orderSummary,
          checkout_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Failed to create order record');
    }

    // Update quotes status to 'ordered'
    for (const item of request.items) {
      await supabase
        .from('quotes_v2')
        .update({ 
          status: 'ordered',
          in_cart: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.quote.id);
    }

    // Create order items records
    const orderItems = request.items.map(item => ({
      order_id: order.id,
      quote_id: item.quote.id,
      quantity: 1,
      unit_price: item.quote.final_total_origincurrency || 0,
      currency: item.quote.customer_currency || 
        (item.quote.origin_country ? getOriginCurrency(item.quote.origin_country) : null) ||
        (item.quote.destination_country ? getDestinationCurrency(item.quote.destination_country) : 'USD'),
      item_data: {
        quote_display_id: item.quote.display_id,
        origin_country: item.quote.origin_country,
        destination_country: item.quote.destination_country
      }
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.warn('Failed to create order items:', itemsError);
      // Don't fail the order for this, but log the issue
    }

    // Handle payment setup based on method
    const paymentInstructions = await this.setupPaymentForOrder(order, request.paymentMethod);

    return {
      id: order.id,
      orderNumber,
      status: 'pending_payment',
      trackingId,
      paymentRequired: request.paymentMethod !== 'bank_transfer',
      paymentInstructions
    };
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `IWB${year}${timestamp.toString().slice(-6)}${random}`;
  }

  /**
   * Setup payment processing for the order
   */
  private async setupPaymentForOrder(order: any, paymentMethod: string): Promise<any> {
    try {
      switch (paymentMethod) {
        case 'bank_transfer':
          return {
            type: 'bank_transfer',
            message: 'Bank transfer instructions will be sent via email',
            requiresManualVerification: true
          };

        case 'stripe':
          return {
            type: 'stripe',
            message: 'Stripe payment processing will be initiated',
            requiresRedirect: true
          };

        case 'payu':
          return {
            type: 'payu',
            message: 'PayU payment processing will be initiated',
            requiresRedirect: true
          };

        default:
          return {
            type: 'manual',
            message: 'Payment instructions will be provided separately'
          };
      }
    } catch (error) {
      logger.error('Failed to setup payment:', error);
      return {
        type: 'manual',
        message: 'Payment setup encountered an issue. Please contact support.'
      };
    }
  }

  /**
   * Get order by ID with full details
   */
  async getOrderById(orderId: string): Promise<any> {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            quotes_v2 (id, display_id, status, customer_email)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error || !order) {
        throw new Error('Order not found');
      }

      return order;

    } catch (error) {
      logger.error('Failed to get order:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(notes && { admin_notes: notes })
        })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      logger.info(`Order ${orderId} status updated to ${status}`);
      return true;

    } catch (error) {
      logger.error('Failed to update order status:', error);
      return false;
    }
  }

  /**
   * Get orders for user
   */
  async getUserOrders(userId: string, limit = 50): Promise<any[]> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          currency,
          created_at,
          tracking_id,
          order_items (
            quantity,
            quotes_v2 (display_id, origin_country, destination_country)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return orders || [];

    } catch (error) {
      logger.error('Failed to get user orders:', error);
      return [];
    }
  }

  /**
   * Cancel order if possible
   */
  async cancelOrder(orderId: string, reason: string): Promise<boolean> {
    try {
      // Check if order can be cancelled
      const order = await this.getOrderById(orderId);
      
      if (!['pending_payment', 'payment_pending', 'confirmed'].includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          admin_notes: `Cancelled: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      // Revert quote statuses back to approved
      if (order.order_items) {
        for (const item of order.order_items) {
          await supabase
            .from('quotes_v2')
            .update({ 
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.quote_id);
        }
      }

      logger.info(`Order ${orderId} cancelled: ${reason}`);
      return true;

    } catch (error) {
      logger.error('Failed to cancel order:', error);
      return false;
    }
  }

  /**
   * Clear cache and dispose resources
   */
  dispose(): void {
    logger.info('CheckoutService disposed');
  }
}

export default CheckoutService;