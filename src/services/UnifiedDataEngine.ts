// ============================================================================
// UNIFIED DATA ENGINE - JSONB Orchestration Service
// Replaces 20+ separate hooks and components with unified data operations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  UnifiedQuote,
  UnifiedQuoteRow,
  QuoteItem,
  CalculationData,
  CustomerData,
  OperationalData,
  SmartSuggestion,
  QuoteCalculationInput,
  QuoteCalculationResult,
} from '@/types/unified-quote';

/**
 * Unified Data Engine - Single source of truth for all quote operations
 * Handles JSONB data transformation, validation, and smart operations
 */
export class UnifiedDataEngine {
  private static instance: UnifiedDataEngine;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): UnifiedDataEngine {
    if (!UnifiedDataEngine.instance) {
      UnifiedDataEngine.instance = new UnifiedDataEngine();
    }
    return UnifiedDataEngine.instance;
  }

  /**
   * Transform database row to typed UnifiedQuote
   */
  transformFromDB(row: UnifiedQuoteRow): UnifiedQuote {
    return {
      id: row.id,
      display_id: row.display_id,
      user_id: row.user_id || undefined,
      status: row.status,
      origin_country: row.origin_country,
      destination_country: row.destination_country,
      items: Array.isArray(row.items) ? row.items : [],
      base_total_usd: row.base_total_usd,
      final_total_usd: row.final_total_usd,
      calculation_data: row.calculation_data || this.getDefaultCalculationData(),
      customer_data: row.customer_data || this.getDefaultCustomerData(),
      operational_data: row.operational_data || this.getDefaultOperationalData(),
      currency: row.currency,
      in_cart: row.in_cart,
      created_at: row.created_at,
      updated_at: row.updated_at,
      smart_suggestions: Array.isArray(row.smart_suggestions) ? row.smart_suggestions : [],
      weight_confidence: row.weight_confidence,
      optimization_score: row.optimization_score,
      expires_at: row.expires_at || undefined,
      share_token: row.share_token || undefined,
      is_anonymous: row.is_anonymous,
      internal_notes: row.internal_notes || undefined,
      admin_notes: row.admin_notes || undefined,
      quote_source: row.quote_source,
    };
  }

  /**
   * Transform old database structure to UnifiedQuote
   */
  transformFromOldStructure(oldQuote: any): UnifiedQuote {
    // Transform quote_items array to items JSONB
    const items: QuoteItem[] = (oldQuote.quote_items || []).map((item: any) => ({
      id: item.id || `item_${Date.now()}_${Math.random()}`,
      name: item.product_name || item.name || 'Unknown Product',
      quantity: item.quantity || 1,
      price_usd: item.price_usd || item.price || 0,
      weight_kg: item.weight_kg || item.weight || 0.5,
      url: item.product_url || item.url || '',
      image_url: item.image_url || '',
      options: item.options || '',
      smart_data: {
        weight_confidence: 0.5, // Default confidence for old data
        category_detected: 'general',
        optimization_hints: [],
        customs_suggestions: [],
      },
    }));

    // Build calculation data from old fields
    const calculation_data: CalculationData = {
      base_total: oldQuote.item_price || 0,
      breakdown: {
        items: oldQuote.item_price || 0,
        shipping: (oldQuote.international_shipping || 0) + (oldQuote.domestic_shipping || 0),
        customs: oldQuote.customs_and_ecs || 0,
        fees: oldQuote.handling_charge || 0,
        tax: oldQuote.sales_tax_price || 0,
        insurance: oldQuote.insurance_amount || 0,
        discount: oldQuote.discount || 0,
      },
      exchange_rate: oldQuote.exchange_rate || 1,
      last_calculated: oldQuote.updated_at || oldQuote.created_at,
    };

    // Build customer data
    const customer_data: CustomerData = {
      info: {
        name: oldQuote.customer_name || '',
        email: oldQuote.customer_email || '',
        phone: oldQuote.customer_phone || '',
        social_handle: oldQuote.customer_social_handle || '',
      },
      shipping_address: oldQuote.shipping_address || {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal: '',
        country: oldQuote.destination_country || '',
        locked: false,
      },
    };

    // Build operational data
    const operational_data: OperationalData = {
      customs: {
        category: 'general',
        percentage: oldQuote.customs_percentage || 10,
        tier_suggestions: [],
      },
      shipping: {
        carrier: oldQuote.shipping_carrier || 'DHL',
        service: 'standard',
        tracking_number: oldQuote.tracking_number || '',
        estimated_delivery: undefined,
      },
      payment: {
        method: oldQuote.payment_method || 'bank_transfer',
        status: oldQuote.payment_status || 'unpaid',
        gateway_fee: oldQuote.payment_gateway_fee || 0,
      },
      timeline: [
        {
          timestamp: oldQuote.created_at,
          event: 'created',
          description: 'Quote created',
          actor: 'system',
        },
      ],
      admin: {
        notes: oldQuote.internal_notes || '',
        tags: [],
        priority: 'normal',
        assigned_to: undefined,
      },
    };

    return {
      id: oldQuote.id,
      display_id: oldQuote.display_id || oldQuote.id,
      user_id: oldQuote.user_id,
      status: oldQuote.status || 'pending',
      origin_country: oldQuote.origin_country || 'US',
      destination_country: oldQuote.destination_country || 'US',
      items,
      base_total_usd: oldQuote.item_price || 0,
      final_total_usd: oldQuote.final_total_usd || 0,
      currency: oldQuote.currency || oldQuote.destination_currency || 'USD',
      calculation_data,
      customer_data,
      operational_data,
      is_anonymous: !oldQuote.user_id,
      quote_source: oldQuote.quote_source || 'website',
      optimization_score: 0.7, // Default score for old quotes
      created_at: oldQuote.created_at,
      updated_at: oldQuote.updated_at,
    };
  }

  /**
   * Get quote by ID with smart caching
   */
  async getQuote(id: string): Promise<UnifiedQuote | null> {
    const cacheKey = `quote_${id}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Query the unified structure (quotes table with JSONB fields)
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quoteData) {
      console.error('Error fetching quote:', quoteError);
      return null;
    }

    // Transform to unified format
    const quote = this.transformFromDB(quoteData);
    this.setCache(cacheKey, quote);
    return quote;
  }

  /**
   * Get quotes with smart filtering and pagination
   */
  async getQuotes(options: {
    user_id?: string;
    status?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ quotes: UnifiedQuote[]; total: number }> {
    let query = supabase.from('quotes').select('*', { count: 'exact' });

    // Smart filtering
    if (options.user_id) {
      query = query.eq('user_id', options.user_id);
    }

    if (options.status && options.status.length > 0) {
      query = query.in('status', options.status);
    }

    if (options.search) {
      // Smart search across items, customer data, and notes
      query = query.or(`
        display_id.ilike.%${options.search}%,
        customer_data->'info'->>'name'.ilike.%${options.search}%,
        customer_data->'info'->>'email'.ilike.%${options.search}%,
        items::text.ilike.%${options.search}%
      `);
    }

    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1);
    }

    // Order by latest first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      return { quotes: [], total: 0 };
    }

    const quotes = (data || []).map(row => this.transformFromDB(row));
    return { quotes, total: count || 0 };
  }

  /**
   * Create new quote with smart defaults
   */
  async createQuote(input: QuoteCalculationInput): Promise<QuoteCalculationResult> {
    try {
      // Generate smart suggestions for new quote
      const smartSuggestions = await this.generateSmartSuggestions(input.items);

      // Create quote data
      const quoteData = {
        status: 'pending',
        origin_country: input.origin_country,
        destination_country: input.destination_country,
        items: input.items.map(item => ({
          id: crypto.randomUUID(),
          ...item,
          smart_data: {
            weight_confidence: 0.5, // Default for manual input
            price_confidence: 0.8,
            category_detected: 'general',
            customs_suggestions: [],
            optimization_hints: [],
          },
        })),
        base_total_usd: input.items.reduce((sum, item) => sum + (item.price_usd * item.quantity), 0),
        final_total_usd: 0, // Will be calculated
        calculation_data: this.getDefaultCalculationData(),
        customer_data: input.customer_data || this.getDefaultCustomerData(),
        operational_data: this.getDefaultOperationalData(),
        currency: 'USD',
        smart_suggestions: smartSuggestions,
        weight_confidence: 0.5,
        optimization_score: 0,
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (error) throw error;

      const quote = this.transformFromDB(data);
      
      return {
        success: true,
        quote,
        smart_suggestions: smartSuggestions,
        shipping_options: [], // Will be populated by SmartCalculationEngine
      };
    } catch (error) {
      console.error('Error creating quote:', error);
      return {
        success: false,
        quote: {} as UnifiedQuote,
        smart_suggestions: [],
        shipping_options: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update quote with smart validation
   */
  async updateQuote(id: string, updates: Partial<UnifiedQuote>): Promise<boolean> {
    console.log('💾 [DEBUG] UnifiedDataEngine.updateQuote called:', {
      quoteId: id,
      updates,
      operationalDataUpdate: updates.operational_data
    });

    try {
      // Transform updates for database
      const dbUpdates: any = { updated_at: new Date().toISOString() };

      if (updates.items) dbUpdates.items = updates.items;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.calculation_data) dbUpdates.calculation_data = updates.calculation_data;
      if (updates.customer_data) dbUpdates.customer_data = updates.customer_data;
      if (updates.operational_data) dbUpdates.operational_data = updates.operational_data;
      if (updates.smart_suggestions) dbUpdates.smart_suggestions = updates.smart_suggestions;
      if (updates.weight_confidence !== undefined) dbUpdates.weight_confidence = updates.weight_confidence;
      if (updates.optimization_score !== undefined) dbUpdates.optimization_score = updates.optimization_score;

      console.log('💾 [DEBUG] Final database update payload:', dbUpdates);

      const { error } = await supabase
        .from('quotes')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('❌ [DEBUG] Database update failed:', error);
        throw error;
      }

      console.log('✅ [DEBUG] Database update successful');

      // Clear cache
      this.clearCache(`quote_${id}`);
      return true;
    } catch (error) {
      console.error('❌ [DEBUG] Failed to update quote:', error);
      return false;
    }
  }

  /**
   * Smart item operations
   */
  async addItem(quoteId: string, item: Omit<QuoteItem, 'id'>): Promise<boolean> {
    const quote = await this.getQuote(quoteId);
    if (!quote) return false;

    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      ...item,
    };

    const updatedItems = [...quote.items, newItem];
    const newBaseTotal = updatedItems.reduce((sum, item) => sum + (item.price_usd * item.quantity), 0);

    return this.updateQuote(quoteId, {
      items: updatedItems,
      base_total_usd: newBaseTotal,
    });
  }

  async updateItem(quoteId: string, itemId: string, updates: Partial<QuoteItem>): Promise<boolean> {
    const quote = await this.getQuote(quoteId);
    if (!quote) return false;

    const updatedItems = quote.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    const newBaseTotal = updatedItems.reduce((sum, item) => sum + (item.price_usd * item.quantity), 0);

    return this.updateQuote(quoteId, {
      items: updatedItems,
      base_total_usd: newBaseTotal,
    });
  }

  async removeItem(quoteId: string, itemId: string): Promise<boolean> {
    const quote = await this.getQuote(quoteId);
    if (!quote) return false;

    const updatedItems = quote.items.filter(item => item.id !== itemId);
    if (updatedItems.length === 0) return false; // Don't allow empty quotes

    const newBaseTotal = updatedItems.reduce((sum, item) => sum + (item.price_usd * item.quantity), 0);

    return this.updateQuote(quoteId, {
      items: updatedItems,
      base_total_usd: newBaseTotal,
    });
  }

  /**
   * Smart suggestions generation
   */
  private async generateSmartSuggestions(items: any[]): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Weight validation suggestions
    for (const item of items) {
      if (item.weight_kg < 0.1) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'weight',
          message: `Weight for "${item.name}" seems unusually low. Consider verifying.`,
          confidence: 0.8,
          potential_impact: {
            accuracy_improvement: 0.3,
          },
        });
      }
    }

    // Price validation suggestions
    const totalValue = items.reduce((sum, item) => sum + (item.price_usd * item.quantity), 0);
    if (totalValue > 1000) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'customs',
        message: 'High-value shipment may require additional customs documentation.',
        confidence: 0.9,
        potential_impact: {
          time_change: 'additional 2-3 days for customs clearance',
        },
      });
    }

    return suggestions;
  }

  /**
   * Default data structures
   */
  private getDefaultCalculationData(): CalculationData {
    return {
      breakdown: {
        items_total: 0,
        shipping: 0,
        customs: 0,
        taxes: 0,
        fees: 0,
        discount: 0,
      },
      exchange_rate: {
        rate: 1,
        source: 'country_settings',
        confidence: 1,
      },
      smart_optimizations: [],
    };
  }

  private getDefaultCustomerData(): CustomerData {
    return {
      info: {},
      shipping_address: {
        line1: '',
        city: '',
        state: '',
        postal: '',
        country: '',
        locked: false,
      },
    };
  }

  private getDefaultOperationalData(): OperationalData {
    return {
      customs: {
        percentage: 0,
        tier_suggestions: [],
      },
      shipping: {
        method: 'country_settings',
        available_options: [],
        smart_recommendations: [],
      },
      payment: {
        amount_paid: 0,
        reminders_sent: 0,
        status: 'unpaid',
      },
      timeline: [],
      admin: {
        priority: 'normal',
        flags: [],
      },
    };
  }

  /**
   * Cache management
   */
  private getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Bulk operations for efficiency
   */
  async bulkUpdateStatus(quoteIds: string[], status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', quoteIds);

      if (error) throw error;

      // Clear cache for updated quotes
      quoteIds.forEach(id => this.clearCache(`quote_${id}`));
      return true;
    } catch (error) {
      console.error('Error bulk updating status:', error);
      return false;
    }
  }

  /**
   * Analytics and reporting
   */
  async getQuoteAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    total_quotes: number;
    total_value: number;
    avg_optimization_score: number;
    status_breakdown: Record<string, number>;
    top_destinations: Array<{ country: string; count: number }>;
  }> {
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeRange];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('quotes')
      .select('status, final_total_usd, optimization_score, destination_country')
      .gte('created_at', since);

    if (error || !data) {
      return {
        total_quotes: 0,
        total_value: 0,
        avg_optimization_score: 0,
        status_breakdown: {},
        top_destinations: [],
      };
    }

    const statusBreakdown: Record<string, number> = {};
    const destinationCounts: Record<string, number> = {};
    let totalValue = 0;
    let totalOptimization = 0;

    data.forEach(quote => {
      statusBreakdown[quote.status] = (statusBreakdown[quote.status] || 0) + 1;
      destinationCounts[quote.destination_country] = (destinationCounts[quote.destination_country] || 0) + 1;
      totalValue += quote.final_total_usd || 0;
      totalOptimization += quote.optimization_score || 0;
    });

    const topDestinations = Object.entries(destinationCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_quotes: data.length,
      total_value: totalValue,
      avg_optimization_score: data.length > 0 ? totalOptimization / data.length : 0,
      status_breakdown: statusBreakdown,
      top_destinations: topDestinations,
    };
  }
}

// Export singleton instance
export const unifiedDataEngine = UnifiedDataEngine.getInstance();