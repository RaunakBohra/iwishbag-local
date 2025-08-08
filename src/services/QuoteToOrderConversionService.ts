import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
type CustomerDeliveryPreferences = Database['public']['Tables']['customer_delivery_preferences']['Insert'];

interface QuoteData {
  id: string;
  customer_id: string;
  total_amount: number;
  currency: string;
  items: QuoteItem[];
  delivery_address?: any;
  calculation_data?: any;
}

interface QuoteItem {
  id: string;
  product_name: string;
  product_url?: string;
  quantity: number;
  price_usd: number;
  weight_kg?: number;
  seller_platform?: string;
  origin_country?: string;
  destination_country?: string;
}

interface OrderCreationOptions {
  payment_method: 'cod' | 'bank_transfer' | 'stripe' | 'paypal' | 'payu' | 'esewa' | 'khalti' | 'fonepay';
  delivery_preferences?: {
    delivery_method: 'direct_delivery' | 'warehouse_consolidation';
    consolidation_preference?: 'ship_as_ready' | 'wait_for_all' | 'partial_groups';
    max_wait_days?: number;
    quality_check_level?: 'minimal' | 'standard' | 'thorough';
    photo_documentation_required?: boolean;
    priority?: 'fastest' | 'cheapest' | 'balanced' | 'quality_first';
  };
  warehouse_assignment?: 'auto' | 'india_warehouse' | 'china_warehouse' | 'us_warehouse' | 'myus_3pl';
  automation_enabled?: boolean;
  admin_notes?: string;
  customer_notes?: string;
}

interface OrderConversionResult {
  success: boolean;
  order_id?: string;
  order_number?: string;
  error?: string;
  warnings?: string[];
}

class QuoteToOrderConversionService {
  private static instance: QuoteToOrderConversionService;

  public static getInstance(): QuoteToOrderConversionService {
    if (!QuoteToOrderConversionService.instance) {
      QuoteToOrderConversionService.instance = new QuoteToOrderConversionService();
    }
    return QuoteToOrderConversionService.instance;
  }

  /**
   * Convert an approved quote to a comprehensive order
   */
  async convertQuoteToOrder(
    quoteId: string,
    options: OrderCreationOptions
  ): Promise<OrderConversionResult> {
    try {
      console.log(`Converting quote ${quoteId} to order with options:`, options);

      // 1. Fetch quote data with items
      const quoteData = await this.fetchQuoteWithItems(quoteId);
      if (!quoteData) {
        return { success: false, error: 'Quote not found or inaccessible' };
      }

      // 2. Validate quote is approved and payable
      const validationResult = await this.validateQuoteForConversion(quoteData);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      // 3. Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // 4. Determine primary warehouse based on items and preferences
      const primaryWarehouse = await this.determinePrimaryWarehouse(
        quoteData.items, 
        options.warehouse_assignment
      );

      // 5. Create order record
      const orderData: OrderInsert = {
        order_number: orderNumber,
        user_id: quoteData.customer_id,
        customer_id: quoteData.customer_id,
        quote_id: quoteId,
        status: options.payment_method === 'cod' ? 'payment_pending' : 'pending_payment',
        overall_status: 'payment_pending',
        payment_method: options.payment_method,
        payment_status: options.payment_method === 'cod' ? 'cod_pending' : 'pending',
        total_amount: quoteData.total_amount,
        currency: quoteData.currency,
        original_quote_total: quoteData.total_amount,
        current_order_total: quoteData.total_amount,
        total_items: quoteData.items.length,
        active_items: quoteData.items.length,
        primary_warehouse: primaryWarehouse,
        consolidation_preference: options.delivery_preferences?.consolidation_preference || 'wait_for_all',
        max_consolidation_wait_days: options.delivery_preferences?.max_wait_days || 14,
        delivery_preference: options.delivery_preferences?.delivery_method || 'warehouse_consolidation',
        quality_check_requested: options.delivery_preferences?.quality_check_level !== 'minimal',
        photo_documentation_required: options.delivery_preferences?.photo_documentation_required || false,
        automation_enabled: options.automation_enabled !== false,
        delivery_address: quoteData.delivery_address,
        original_quote_data: quoteData.calculation_data,
        admin_notes: options.admin_notes,
        customer_notes: options.customer_notes,
      };

      // 6. Create order in transaction
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('*')
        .single();

      if (orderError || !order) {
        console.error('Error creating order:', orderError);
        return { success: false, error: 'Failed to create order record' };
      }

      console.log(`Order created with ID: ${order.id}, Number: ${order.order_number}`);

      // 7. Create order items with automation setup
      const itemResults = await this.createOrderItems(order.id, quoteData.items, primaryWarehouse);
      if (!itemResults.success) {
        // Rollback order creation
        await supabase.from('orders').delete().eq('id', order.id);
        return { success: false, error: itemResults.error };
      }

      // 8. Create customer delivery preferences
      if (options.delivery_preferences) {
        await this.createDeliveryPreferences(order.id, quoteData.customer_id, options.delivery_preferences);
      }

      // 9. Queue automation tasks if enabled
      if (options.automation_enabled !== false) {
        await this.queueAutomationTasks(order.id, quoteData.items);
      }

      // 10. Update quote status to converted
      await this.markQuoteAsConverted(quoteId, order.id);

      return {
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        warnings: itemResults.warnings,
      };
    } catch (error) {
      console.error('Error in quote-to-order conversion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error',
      };
    }
  }

  /**
   * Fetch quote data with all items
   */
  private async fetchQuoteWithItems(quoteId: string): Promise<QuoteData | null> {
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes_v2')
        .select(`
          id,
          customer_id,
          total_amount,
          currency,
          delivery_address,
          calculation_data,
          status,
          quote_items_v2 (
            id,
            product_name,
            product_url,
            quantity,
            price_usd,
            weight_kg,
            seller_platform,
            origin_country,
            destination_country
          )
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        console.error('Error fetching quote:', quoteError);
        return null;
      }

      return {
        id: quote.id,
        customer_id: quote.customer_id,
        total_amount: quote.total_amount,
        currency: quote.currency || 'USD',
        items: quote.quote_items_v2 || [],
        delivery_address: quote.delivery_address,
        calculation_data: quote.calculation_data,
      };
    } catch (error) {
      console.error('Error in fetchQuoteWithItems:', error);
      return null;
    }
  }

  /**
   * Validate quote can be converted to order
   */
  private async validateQuoteForConversion(quoteData: QuoteData): Promise<{valid: boolean; error?: string}> {
    // Check if quote has items
    if (!quoteData.items || quoteData.items.length === 0) {
      return { valid: false, error: 'Quote has no items to convert' };
    }

    // Check if total amount is valid
    if (quoteData.total_amount <= 0) {
      return { valid: false, error: 'Quote total amount must be greater than 0' };
    }

    // Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', quoteData.customer_id)
      .single();

    if (customerError || !customer) {
      return { valid: false, error: 'Customer not found' };
    }

    // Check if quote is already converted
    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('quote_id', quoteData.id)
      .single();

    if (existingOrder) {
      return { valid: false, error: 'Quote has already been converted to an order' };
    }

    return { valid: true };
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get count of orders for this month
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', `${year}-${month}-01T00:00:00.000Z`)
      .lt('created_at', `${year}-${Number(month) + 1 > 12 ? '01' : String(Number(month) + 1).padStart(2, '0')}-01T00:00:00.000Z`);

    const sequence = (orders?.length || 0) + 1;
    return `ORD-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Determine best warehouse for order
   */
  private async determinePrimaryWarehouse(
    items: QuoteItem[], 
    preference?: string
  ): Promise<string> {
    if (preference && preference !== 'auto') {
      return preference;
    }

    // Logic to determine warehouse based on items origin countries
    const originCountries = items.map(item => item.origin_country).filter(Boolean);
    const countryCount = originCountries.reduce((acc, country) => {
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Simple logic - most common origin country determines warehouse
    const mostCommonCountry = Object.keys(countryCount).reduce((a, b) => 
      countryCount[a] > countryCount[b] ? a : b
    );

    switch (mostCommonCountry) {
      case 'IN': return 'india_warehouse';
      case 'CN': return 'china_warehouse';
      case 'US': return 'us_warehouse';
      default: return 'india_warehouse';
    }
  }

  /**
   * Create order items with automation setup
   */
  private async createOrderItems(
    orderId: string, 
    items: QuoteItem[], 
    primaryWarehouse: string
  ): Promise<{success: boolean; error?: string; warnings?: string[]}> {
    const warnings: string[] = [];
    
    try {
      const orderItems: OrderItemInsert[] = items.map(item => ({
        order_id: orderId,
        quote_item_id: item.id,
        product_name: item.product_name,
        product_url: item.product_url,
        seller_platform: item.seller_platform || 'other',
        origin_country: item.origin_country || 'IN',
        destination_country: item.destination_country || 'IN',
        quantity: item.quantity,
        original_price: item.price_usd,
        current_price: item.price_usd,
        original_weight: item.weight_kg,
        current_weight: item.weight_kg,
        item_status: 'pending_order_placement',
        order_automation_status: 'pending',
        quality_check_requested: true,
        assigned_warehouse: primaryWarehouse,
        auto_approval_threshold_amount: 25.00,
        auto_approval_threshold_percentage: 5.00,
      }));

      const { data: createdItems, error: itemError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select('*');

      if (itemError) {
        console.error('Error creating order items:', itemError);
        return { success: false, error: 'Failed to create order items' };
      }

      console.log(`Created ${createdItems?.length || 0} order items`);
      return { success: true, warnings };
    } catch (error) {
      console.error('Error in createOrderItems:', error);
      return { success: false, error: 'Failed to create order items' };
    }
  }

  /**
   * Create customer delivery preferences
   */
  private async createDeliveryPreferences(
    orderId: string,
    customerId: string,
    preferences: NonNullable<OrderCreationOptions['delivery_preferences']>
  ): Promise<void> {
    const deliveryPrefs: CustomerDeliveryPreferences = {
      order_id: orderId,
      customer_id: customerId,
      delivery_method: preferences.delivery_method,
      consolidation_preference: preferences.consolidation_preference,
      max_wait_days: preferences.max_wait_days || 14,
      quality_check_level: preferences.quality_check_level || 'standard',
      photo_documentation_required: preferences.photo_documentation_required || false,
      priority: preferences.priority || 'balanced',
    };

    const { error } = await supabase
      .from('customer_delivery_preferences')
      .insert(deliveryPrefs);

    if (error) {
      console.error('Error creating delivery preferences:', error);
    }
  }

  /**
   * Queue automation tasks for order items
   */
  private async queueAutomationTasks(orderId: string, items: QuoteItem[]): Promise<void> {
    try {
      // Get created order items to link automation
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, seller_platform')
        .eq('order_id', orderId);

      if (!orderItems) return;

      const automationTasks = orderItems.map(item => ({
        order_item_id: item.id,
        automation_type: 'order_placement' as const,
        automation_status: 'queued' as const,
        seller_platform: item.seller_platform,
        automation_config: {
          priority: 'normal',
          auto_retry: true,
          max_retries: 3,
        },
        retry_delay_minutes: 30,
      }));

      const { error } = await supabase
        .from('seller_order_automation')
        .insert(automationTasks);

      if (error) {
        console.error('Error queuing automation tasks:', error);
      } else {
        console.log(`Queued ${automationTasks.length} automation tasks`);
      }
    } catch (error) {
      console.error('Error in queueAutomationTasks:', error);
    }
  }

  /**
   * Mark quote as converted
   */
  private async markQuoteAsConverted(quoteId: string, orderId: string): Promise<void> {
    const { error } = await supabase
      .from('quotes_v2')
      .update({
        status: 'converted_to_order',
        order_id: orderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (error) {
      console.error('Error marking quote as converted:', error);
    }
  }

  /**
   * Get order with all related data
   */
  async getOrderWithDetails(orderId: string): Promise<any> {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        customer_delivery_preferences (*),
        order_shipments (*),
        profiles!customer_id (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching order details:', error);
      return null;
    }

    return order;
  }
}

export default QuoteToOrderConversionService;