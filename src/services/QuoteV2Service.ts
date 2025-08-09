// ============================================================================
// Quote V2 Service - Enhanced Quote Management
// Handles business logic, sharing, reminders, and version control
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getDestinationCurrency } from '@/utils/originCurrency';
import { QuoteV2, CreateQuoteV2Input, UpdateQuoteV2Input, QuoteShareInfo, ActiveQuote } from '@/types/quotes-v2';

export class QuoteV2Service {
  private static instance: QuoteV2Service;
  private constructor() {}

  static getInstance(): QuoteV2Service {
    if (!QuoteV2Service.instance) {
      QuoteV2Service.instance = new QuoteV2Service();
    }
    return QuoteV2Service.instance;
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  async createQuote(input: CreateQuoteV2Input): Promise<QuoteV2> {
    try {
      // For testing, create a simplified quote
      const quoteData = {
        id: crypto.randomUUID(),
        display_id: `QT${Date.now()}`,
        status: 'pending',
        origin_country: input.origin_country,
        destination_country: input.destination_country,
        items: input.items,
        costprice_total_quote_origincurrency: input.items.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0),
        final_total_origincurrency: input.items.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0) * 1.5, // Simple 50% markup for testing
        calculation_data: {
          breakdown: {
            items_total: input.items.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0),
            shipping: 50,
            customs: 20,
            fees: 10,
            discount: 0
          },
          exchange_rate: { rate: 1, source: 'test', confidence: 1 },
          smart_optimizations: []
        },
        customer_data: input.customer_data,
        operational_data: {
          customs: { percentage: 10, tier_suggestions: [] },
          shipping: { method: 'standard', available_options: [], smart_recommendations: [] },
          payment: { amount_paid: 0, reminders_sent: 0, status: 'pending' },
          timeline: [{ status: 'created', timestamp: new Date().toISOString(), auto: true }],
          admin: { priority: 'normal', flags: [] }
        },
        currency: 'USD',
        in_cart: false,
        smart_suggestions: [],
        weight_confidence: 0.9,
        optimization_score: 0.8,
        is_anonymous: false,
        quote_source: 'manual',
        validity_days: input.validity_days || 7,
        customer_message: input.customer_message || null,
        payment_terms: input.payment_terms || null,
        approval_required_above: input.approval_required_above || null,
        max_discount_allowed: input.max_discount_allowed || null,
        minimum_order_value: input.minimum_order_value || null,
        original_quote_id: input.original_quote_id || null,
        external_reference: input.external_reference || null,
        api_version: input.api_version || '2.0',
        email_sent: false,
        reminder_count: 0,
        version: 1,
        is_latest_version: true,
      };

      // Insert into database
      const { data, error } = await supabase
        .from('quotes_v2')
        .insert(quoteData)
        .select()
        .single();

      if (error) throw error;
      return data as QuoteV2;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw error;
    }
  }

  async updateQuote(quoteId: string, input: UpdateQuoteV2Input): Promise<QuoteV2> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .update(input)
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;
      return data as QuoteV2;
    } catch (error) {
      console.error('Error updating quote:', error);
      throw error;
    }
  }

  async getQuote(quoteId: string): Promise<QuoteV2 | null> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      return data as QuoteV2;
    } catch (error) {
      console.error('Error fetching quote:', error);
      return null;
    }
  }

  async getQuoteByShareToken(token: string): Promise<QuoteV2 | null> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error) throw error;
      
      // Track the view
      if (data) {
        await this.trackView(data.id, token);
      }
      
      return data as QuoteV2;
    } catch (error) {
      console.error('Error fetching quote by token:', error);
      return null;
    }
  }

  // ============================================================================
  // Share Token Management
  // ============================================================================

  async generateShareLink(quoteId: string): Promise<QuoteShareInfo> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) throw new Error('Quote not found');

      // Check if quote is expired
      const { data: expiredCheck } = await supabase
        .rpc('is_quote_expired', { quote_id: quoteId });

      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/quote/view/${quote.share_token}`;

      return {
        quote_id: quoteId,
        share_token: quote.share_token,
        share_url: shareUrl,
        expires_at: quote.expires_at || '',
        is_expired: expiredCheck || false,
      };
    } catch (error) {
      console.error('Error generating share link:', error);
      throw error;
    }
  }

  // ============================================================================
  // Communication & Tracking
  // ============================================================================

  async sendQuote(quoteId: string): Promise<QuoteV2> {
    try {
      const now = new Date().toISOString();
      return await this.updateQuote(quoteId, {
        status: 'sent',
        email_sent: true,
        // sent_at will be set by database trigger
      });
    } catch (error) {
      console.error('Error sending quote:', error);
      throw error;
    }
  }

  async trackView(quoteId: string, token?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('track_quote_view', { 
          quote_id: quoteId,
          token: token || null 
        });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error tracking quote view:', error);
      return false;
    }
  }

  async sendReminder(quoteId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('send_quote_reminder', { quote_id: quoteId });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error sending reminder:', error);
      return false;
    }
  }

  // ============================================================================
  // Version Control
  // ============================================================================

  async createRevision(originalQuoteId: string, reason: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('create_quote_revision', {
          p_original_quote_id: originalQuoteId,
          p_revision_reason: reason,
        });

      if (error) throw error;
      return data as string;
    } catch (error) {
      console.error('Error creating quote revision:', error);
      throw error;
    }
  }

  async getQuoteHistory(quoteId: string): Promise<QuoteV2[]> {
    try {
      // Get the original quote
      const quote = await this.getQuote(quoteId);
      if (!quote) return [];

      const parentId = quote.parent_quote_id || quote.id;

      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .or(`id.eq.${parentId},parent_quote_id.eq.${parentId}`)
        .order('version', { ascending: true });

      if (error) throw error;
      return data as QuoteV2[];
    } catch (error) {
      console.error('Error fetching quote history:', error);
      return [];
    }
  }

  // ============================================================================
  // Quote Status Management
  // ============================================================================

  async getActiveQuotes(customerId?: string): Promise<ActiveQuote[]> {
    try {
      let query = supabase
        .from('active_quotes')
        .select('*')
        .eq('is_active', true);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActiveQuote[];
    } catch (error) {
      console.error('Error fetching active quotes:', error);
      return [];
    }
  }

  async checkExpiredQuotes(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('id')
        .eq('status', 'sent')
        .lt('expires_at', new Date().toISOString())
        .is('converted_to_order_id', null);

      if (error) throw error;

      // Update expired quotes
      const expiredIds = data.map(q => q.id);
      if (expiredIds.length > 0) {
        await supabase
          .from('quotes_v2')
          .update({ status: 'expired' })
          .in('id', expiredIds);
      }

      return expiredIds;
    } catch (error) {
      console.error('Error checking expired quotes:', error);
      return [];
    }
  }

  // ============================================================================
  // Business Rules Validation
  // ============================================================================

  async validateQuoteApproval(quoteId: string): Promise<{
    requiresApproval: boolean;
    reason?: string;
  }> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) throw new Error('Quote not found');

      // Check if approval is required based on amount
      if (quote.approval_required_above && 
          quote.final_total_origincurrency > quote.approval_required_above) {
        return {
          requiresApproval: true,
          reason: `Quote amount exceeds approval threshold of $${quote.approval_required_above}`,
        };
      }

      // Check if discount exceeds allowed limit
      const discountAmount = quote.calculation_data?.breakdown?.discount || 0;
      const discountPercentage = (discountAmount / quote.costprice_total_quote_origincurrency) * 100;
      
      if (quote.max_discount_allowed && 
          discountPercentage > quote.max_discount_allowed) {
        return {
          requiresApproval: true,
          reason: `Discount ${discountPercentage.toFixed(1)}% exceeds maximum allowed ${quote.max_discount_allowed}%`,
        };
      }

      return { requiresApproval: false };
    } catch (error) {
      console.error('Error validating quote approval:', error);
      return { requiresApproval: false };
    }
  }

  // ============================================================================
  // Conversion to Order
  // ============================================================================

  async convertToOrder(quoteId: string): Promise<string> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) throw new Error('Quote not found');

      if (quote.status !== 'approved') {
        throw new Error('Only approved quotes can be converted to orders');
      }

      // Create order in orders table
      const orderId = crypto.randomUUID();
      
      // Create comprehensive order record
      const orderData = {
        id: orderId,
        user_id: quote.customer_id || quote.customer_email, // Handle both authenticated and guest users
        quote_id: quoteId,
        status: 'payment_pending',
        total_amount: quote.calculation_data?.calculation_steps?.total_quote_origincurrency || 0,
        customer_currency_amount: quote.calculation_data?.calculation_steps?.total_quote_origincurrency || 0,
        customer_currency: quote.customer_currency || getDestinationCurrency(quote.destination_country),
        origin_country: quote.origin_country,
        destination_country: quote.destination_country,
        shipping_method: quote.shipping_method || 'standard',
        items: quote.items || [],
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        delivery_address_id: quote.delivery_address_id,
        admin_notes: `Converted from quote ${quoteId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert order into orders table
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        logger.error('Failed to create order from quote', {
          quoteId,
          orderId,
          error: orderError.message
        });
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      // Update quote status to indicate successful conversion
      await this.updateQuote(quoteId, {
        status: 'paid',
        converted_to_order_id: orderId,
      });

      logger.info('Successfully converted quote to order', {
        quoteId,
        orderId: createdOrder.id,
        totalAmount: orderData.total_amount,
        customerCurrency: orderData.customer_currency
      });

      return createdOrder.id;
    } catch (error) {
      logger.error('Error converting quote to order:', error);
      throw error;
    }
  }
}