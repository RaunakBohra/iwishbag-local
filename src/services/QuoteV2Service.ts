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

  /**
   * Get paginated quotes for admin dashboard with filtering and sorting
   */
  async getQuotesPaginated(filters?: {
    search?: string;
    status?: string | string[];
    origin_country?: string;
    destination_country?: string;
    date_range?: { start: string; end: string };
  }, page: number = 1, pageSize: number = 25): Promise<{
    data: QuoteV2[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const offset = (page - 1) * pageSize;
      
      console.log('📋 Fetching paginated quotes:', { filters, page, pageSize });
      console.log('📋 Database query details:', { 
        offset, 
        range: `${offset} to ${offset + pageSize - 1}`,
        table: 'quotes_v2'
      });

      // Build base query with count - sort by creation date (newest first)
      let query = supabase
        .from('quotes_v2')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply filters
      if (filters) {
        // Search filter
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          query = query.or(`id.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,quote_number.ilike.%${searchTerm}%`);
        }

        // Status filter
        if (filters.status) {
          if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
          } else {
            query = query.eq('status', filters.status);
          }
        }

        // Country filters
        if (filters.origin_country) {
          query = query.eq('origin_country', filters.origin_country);
        }

        if (filters.destination_country) {
          query = query.eq('destination_country', filters.destination_country);
        }

        // Date range filter
        if (filters.date_range) {
          query = query
            .gte('created_at', filters.date_range.start)
            .lte('created_at', filters.date_range.end);
        }
      }

      const { data, error, count } = await query;

      console.log('📋 Database response:', { 
        count, 
        dataLength: data?.length || 0, 
        error: error?.message || 'none',
        errorCode: error?.code || 'none'
      });

      if (error) {
        console.error('❌ Error fetching paginated quotes:', error);
        throw error;
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Map V2 quotes to include enhanced display data
      const enhancedQuotes = (data || []).map(quote => this.enhanceQuoteForDisplay(quote));

      const result = {
        data: enhancedQuotes,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
          hasNext,
          hasPrev,
        },
      };

      console.log(`✅ Fetched ${enhancedQuotes.length} quotes (page ${page}/${totalPages}, total: ${total})`);
      return result;
    } catch (error) {
      console.error('❌ Exception in getQuotesPaginated:', error);
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  /**
   * Enhance quote with display data (expiry status, etc.)
   */
  private enhanceQuoteForDisplay(quote: any) {
    // Calculate expiry status
    const getExpiryStatus = (expiresAt: string | null) => {
      if (!expiresAt) return null;
      
      const now = new Date();
      const expiry = new Date(expiresAt);
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) {
        return { status: 'expired', text: 'Expired', variant: 'destructive' };
      } else if (daysLeft <= 1) {
        return { status: 'expiring', text: 'Expires today', variant: 'destructive' };
      } else if (daysLeft <= 3) {
        return { status: 'expiring-soon', text: `${daysLeft} days left`, variant: 'secondary' };
      } else {
        return { status: 'valid', text: `${daysLeft} days left`, variant: 'outline' };
      }
    };

    return {
      ...quote,
      final_total_origincurrency: quote.total_quote_origincurrency || 0,
      costprice_total_quote_origincurrency: quote.items?.reduce((sum: number, item: any) => 
        sum + (item.costprice_origin || 0) * (item.quantity || 1), 0) || 0,
      customer_data: {
        info: {
          name: quote.customer_name,
          email: quote.customer_email,
          phone: quote.customer_phone,
        }
      },
      // Add expiry info for display
      expiry_status: getExpiryStatus(quote.expires_at),
      has_share_token: !!quote.share_token,
      email_sent: quote.email_sent || false,
    };
  }

  /**
   * Get paginated quotes for customer dashboard (user-facing)
   */
  async getCustomerQuotesPaginated(filters?: {
    search?: string;
    status?: string | string[];
  }, page: number = 1, pageSize: number = 20): Promise<{
    data: QuoteV2[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const offset = (page - 1) * pageSize;
      
      console.log('📋 Fetching customer paginated quotes:', { filters, page, pageSize });

      // Build base query with count - RLS will automatically filter to user's quotes
      let query = supabase
        .from('quotes_v2')
        .select('*', { count: 'exact' })
        // For customers, prioritize active quotes first, then by most recent activity
        .order('updated_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply filters
      if (filters) {
        // Search filter - customer can search by quote number and customer name
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          query = query.or(`quote_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,destination_country.ilike.%${searchTerm}%`);
        }

        // Status filter
        if (filters.status && filters.status !== 'all') {
          if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
          } else {
            query = query.eq('status', filters.status);
          }
        }
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching customer paginated quotes:', error);
        throw error;
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Map V2 quotes to include enhanced display data
      const enhancedQuotes = (data || []).map(quote => this.enhanceQuoteForDisplay(quote));

      const result = {
        data: enhancedQuotes,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
          hasNext,
          hasPrev,
        },
      };

      console.log(`✅ Fetched ${enhancedQuotes.length} customer quotes (page ${page}/${totalPages}, total: ${total})`);
      return result;
    } catch (error) {
      console.error('❌ Exception in getCustomerQuotesPaginated:', error);
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  /**
   * Get quote by ID
   */
  async getQuoteById(quoteId: string): Promise<QuoteV2 | null> {
    try {
      console.log('🔍 Fetching quote by ID:', quoteId);

      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('❌ Error fetching quote:', error);
        return null;
      }

      const enhancedQuote = this.enhanceQuoteForDisplay(data);
      console.log('✅ Quote fetched successfully:', quoteId);
      return enhancedQuote as QuoteV2;
    } catch (error) {
      console.error('❌ Exception in getQuoteById:', error);
      return null;
    }
  }

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