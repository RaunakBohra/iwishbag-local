// ============================================================================
// UNIFIED DATA ENGINE - JSONB Orchestration Service
// Replaces 20+ separate hooks and components with unified data operations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import CurrencyConversionService from '@/services/CurrencyConversionService';
import { autoProductClassifier } from '@/services/AutoProductClassifier';
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

// HSN Master Record interface
export interface HSNMasterRecord {
  hsn_code: string;
  description: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  minimum_valuation_usd?: number;
  requires_currency_conversion: boolean;
  weight_data: any;
  tax_data: any;
  classification_data: any;
  is_active: boolean;
}

/**
 * Unified Data Engine - Single source of truth for all quote operations
 * Handles JSONB data transformation, validation, and smart operations
 */
export class UnifiedDataEngine {
  private static instance: UnifiedDataEngine;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private currencyService: CurrencyConversionService;

  private constructor() {
    this.currencyService = CurrencyConversionService.getInstance();
  }

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
      // iwishBag Tracking System fields
      iwish_tracking_id: row.iwish_tracking_id || null,
      tracking_status: row.tracking_status || null,
      estimated_delivery_date: row.estimated_delivery_date || null,
      shipping_carrier: row.shipping_carrier || null,
      tracking_number: row.tracking_number || null,
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
  async getQuote(id: string, forceRefresh = false): Promise<UnifiedQuote | null> {
    const cacheKey = `quote_${id}`;

    // Skip cache if force refresh is requested
    if (!forceRefresh) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        console.log(`📋 [DEBUG] Returning cached quote ${id}`);
        return cached;
      }
    } else {
      console.log(`🔄 [DEBUG] Force refreshing quote ${id}, clearing cache`);
      this.clearCache(cacheKey);
    }

    // Query the unified structure (quotes table with JSONB fields) and join with profiles for customer name and avatar
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select(
        `
        *,
        profiles:user_id (
          full_name,
          email,
          avatar_url
        )
      `,
      )
      .eq('id', id)
      .single();

    if (quoteError || !quoteData) {
      console.error('Error fetching quote:', quoteError);
      return null;
    }

    // Extract profile data before transformation
    const profileData = quoteData.profiles;

    // Remove the profiles field to avoid type issues during transformation
    const { profiles, ...cleanQuoteData } = quoteData;

    // Transform to unified format
    const quote = this.transformFromDB(cleanQuoteData as any);

    // Enhance customer data with profile information if available and customer data is empty
    if (profileData && !quote.is_anonymous) {
      // Only update if customer info is empty or missing name
      if (!quote.customer_data.info.name && profileData.full_name) {
        quote.customer_data.info.name = profileData.full_name;
      }
      if (!quote.customer_data.info.email && profileData.email) {
        quote.customer_data.info.email = profileData.email;
      }

      // Add profile data section for avatar and other profile info
      if (!quote.customer_data.profile) {
        quote.customer_data.profile = {};
      }
      if (profileData.avatar_url) {
        quote.customer_data.profile.avatar_url = profileData.avatar_url;
      }

      // Try to get OAuth profile picture from auth.users.user_metadata if no avatar in profiles
      if (!profileData.avatar_url && quote.user_id) {
        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.admin.getUserById(quote.user_id);
          if (!userError && user?.user_metadata) {
            const oauthAvatar = user.user_metadata.avatar_url || user.user_metadata.picture;
            if (oauthAvatar) {
              quote.customer_data.profile.avatar_url = oauthAvatar;
            }
          }
        } catch (error) {
          // Silently fail - OAuth avatar is not critical
          console.debug('Could not fetch OAuth avatar for user:', quote.user_id);
        }
      }
    }

    this.setCache(cacheKey, quote);
    return quote;
  }

  /**
   * Get quotes with smart filtering and pagination
   */
  async getQuotes(
    options: {
      user_id?: string;
      status?: string[];
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ quotes: UnifiedQuote[]; total: number }> {
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
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    // Order by latest first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      return { quotes: [], total: 0 };
    }

    // Transform quotes from DB format
    const quotes = (data || []).map((row) => this.transformFromDB(row));

    // Note: For performance, getQuotes() doesn't enhance with profile data
    // Use getQuote(id) for individual quotes that need complete customer info including avatars
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
        display_id: null, // Let database trigger generate sequential ID (#1001, #1002, etc.)
        status: 'pending',
        origin_country: input.origin_country,
        destination_country: input.destination_country,
        items: input.items.map((item) => ({
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
        base_total_usd: input.items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0),
        final_total_usd: 0, // Will be calculated
        calculation_data: this.getDefaultCalculationData(),
        customer_data: input.customer_data || this.getDefaultCustomerData(),
        operational_data: this.getDefaultOperationalData(),
        currency: 'USD',
        smart_suggestions: smartSuggestions,
        weight_confidence: 0.5,
        optimization_score: 0,
      };

      const { data, error } = await supabase.from('quotes').insert(quoteData).select().single();

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
      operationalDataUpdate: updates.operational_data,
    });

    try {
      // Transform updates for database
      const dbUpdates: any = { updated_at: new Date().toISOString() };

      if (updates.items) dbUpdates.items = updates.items;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.origin_country) dbUpdates.origin_country = updates.origin_country;
      if (updates.destination_country) dbUpdates.destination_country = updates.destination_country;
      if (updates.calculation_data) dbUpdates.calculation_data = updates.calculation_data;
      if (updates.customer_data) dbUpdates.customer_data = updates.customer_data;
      if (updates.operational_data) dbUpdates.operational_data = updates.operational_data;
      if (updates.smart_suggestions) dbUpdates.smart_suggestions = updates.smart_suggestions;
      if (updates.weight_confidence !== undefined)
        dbUpdates.weight_confidence = updates.weight_confidence;
      if (updates.optimization_score !== undefined)
        dbUpdates.optimization_score = updates.optimization_score;

      console.log('💾 [DEBUG] Final database update payload:', dbUpdates);

      const { error } = await supabase.from('quotes').update(dbUpdates).eq('id', id);

      if (error) {
        console.error('❌ [DEBUG] Database update failed:', error);
        throw error;
      }

      console.log('✅ [DEBUG] Database update successful');

      // Clear cache aggressively for status updates
      this.clearCache(`quote_${id}`);

      // Also clear any related cache entries that might be affected
      if (updates.status) {
        console.log('🔄 [DEBUG] Status update detected, clearing all caches for quote', id);
        // Clear all cached entries to ensure fresh data
        this.cache.clear();
      }

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
    const newBaseTotal = updatedItems.reduce(
      (sum, item) => sum + item.price_usd * item.quantity,
      0,
    );

    return this.updateQuote(quoteId, {
      items: updatedItems,
      base_total_usd: newBaseTotal,
    });
  }

  async updateItem(quoteId: string, itemId: string, updates: Partial<QuoteItem>): Promise<boolean> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) {
        console.error(`Quote ${quoteId} not found for item update`);
        return false;
      }

      // Find the item to update
      const existingItem = quote.items.find(item => item.id === itemId);
      if (!existingItem) {
        console.error(`Item ${itemId} not found in quote ${quoteId}`);
        return false;
      }

      // Validate HSN fields if they're being updated
      if (updates.hsn_code !== undefined || updates.category !== undefined) {
        const validationResult = await this.validateHSNFields(updates, existingItem);
        if (!validationResult.isValid) {
          console.error(`HSN validation failed for item ${itemId}:`, validationResult.errors);
          throw new Error(`HSN validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      // Apply updates with proper smart_data handling
      const updatedItems = quote.items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };
          
          // Enhanced smart_data handling for HSN updates
          if (updates.hsn_code || updates.category) {
            updatedItem.smart_data = {
              ...item.smart_data,
              hsn_last_updated: new Date().toISOString(),
              hsn_update_source: 'admin_interface',
              hsn_validation_status: 'validated',
            };
          }
          
          return updatedItem;
        }
        return item;
      });

      // Recalculate totals
      const newBaseTotal = updatedItems.reduce(
        (sum, item) => sum + item.price_usd * item.quantity,
        0,
      );

      // Enhanced operational_data tracking for HSN modifications
      const operationalUpdates: any = {};
      if (updates.hsn_code !== undefined || updates.category !== undefined) {
        const previousHsnCode = existingItem.hsn_code;
        const previousCategory = existingItem.category;
        const newHsnCode = updates.hsn_code ?? existingItem.hsn_code;
        const newCategory = updates.category ?? existingItem.category;
        
        // Determine the type of HSN modification
        let modificationType = 'update';
        if (!previousHsnCode && newHsnCode) {
          modificationType = 'assign';
        } else if (previousHsnCode && !newHsnCode) {
          modificationType = 'clear';
        } else if (previousHsnCode !== newHsnCode) {
          modificationType = 'change';
        }
        
        // Create detailed admin override log entry
        const overrideLogEntry = {
          timestamp: new Date().toISOString(),
          item_id: itemId,
          item_name: existingItem.name,
          modification_type: modificationType,
          previous_hsn_code: previousHsnCode || null,
          new_hsn_code: newHsnCode || null,
          previous_category: previousCategory || null,
          new_category: newCategory || null,
          admin_source: 'unified_quote_interface',
          validation_passed: true,
        };
        
        // Update operational data with enhanced tracking
        const existingOverrides = quote.operational_data?.admin_hsn_overrides || [];
        operationalUpdates.operational_data = {
          ...quote.operational_data,
          last_hsn_modification: new Date().toISOString(),
          hsn_items_count: updatedItems.filter(item => item.hsn_code).length,
          admin_override_count: (quote.operational_data?.admin_override_count || 0) + 1,
          // Enhanced admin override tracking
          admin_hsn_overrides: [...existingOverrides, overrideLogEntry].slice(-50), // Keep last 50 modifications
          last_admin_override: overrideLogEntry,
          admin_modification_summary: {
            total_modifications: (quote.operational_data?.admin_modification_summary?.total_modifications || 0) + 1,
            assignments: (quote.operational_data?.admin_modification_summary?.assignments || 0) + (modificationType === 'assign' ? 1 : 0),
            changes: (quote.operational_data?.admin_modification_summary?.changes || 0) + (modificationType === 'change' ? 1 : 0),
            clears: (quote.operational_data?.admin_modification_summary?.clears || 0) + (modificationType === 'clear' ? 1 : 0),
            last_activity: new Date().toISOString(),
          },
        };

        // Log the admin override for debugging
        console.log(`🔒 [ADMIN-OVERRIDE] HSN modification logged:`, {
          quoteId,
          itemId,
          modificationType,
          from: `${previousHsnCode}/${previousCategory}`,
          to: `${newHsnCode}/${newCategory}`,
          overrideCount: operationalUpdates.operational_data.admin_override_count,
        });
      }

      const success = await this.updateQuote(quoteId, {
        items: updatedItems,
        base_total_usd: newBaseTotal,
        ...operationalUpdates,
      });

      if (success && (updates.hsn_code || updates.category)) {
        console.log(`✅ Item ${itemId} updated with HSN data: ${updates.hsn_code || 'category only'}`);
      }

      return success;
    } catch (error) {
      console.error(`Error updating item ${itemId} in quote ${quoteId}:`, error);
      return false;
    }
  }

  /**
   * Validate HSN fields for data integrity
   */
  private async validateHSNFields(
    updates: Partial<QuoteItem>, 
    existingItem: QuoteItem
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const hsnCode = updates.hsn_code ?? existingItem.hsn_code;
    const category = updates.category ?? existingItem.category;

    // HSN code format validation
    if (hsnCode && !/^\d{2,8}$/.test(hsnCode)) {
      errors.push('HSN code must be 2-8 digits only');
    }

    // Category validation
    const validCategories = ['electronics', 'clothing', 'books', 'toys', 'accessories', 'home_garden'];
    if (category && !validCategories.includes(category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    // Consistency validation - both HSN and category should be provided together
    if ((hsnCode && !category) || (!hsnCode && category)) {
      errors.push('HSN code and category must be provided together');
    }

    // Database validation - check if HSN code exists in hsn_master
    if (hsnCode && category) {
      try {
        const { data: hsnRecord, error } = await supabase
          .from('hsn_master')
          .select('hsn_code, category')
          .eq('hsn_code', hsnCode)
          .eq('is_active', true)
          .single();

        if (error || !hsnRecord) {
          errors.push(`HSN code ${hsnCode} not found in HSN master database`);
        } else if (hsnRecord.category !== category) {
          errors.push(`Category mismatch: HSN ${hsnCode} should be category '${hsnRecord.category}', not '${category}'`);
        }
      } catch (error) {
        errors.push('Failed to validate HSN code against database');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async removeItem(quoteId: string, itemId: string): Promise<boolean> {
    const quote = await this.getQuote(quoteId);
    if (!quote) return false;

    const updatedItems = quote.items.filter((item) => item.id !== itemId);
    if (updatedItems.length === 0) return false; // Don't allow empty quotes

    const newBaseTotal = updatedItems.reduce(
      (sum, item) => sum + item.price_usd * item.quantity,
      0,
    );

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
    const totalValue = items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);
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
        source: 'unified_configuration',
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
        method: 'unified_configuration',
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
      quoteIds.forEach((id) => this.clearCache(`quote_${id}`));
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

    data.forEach((quote) => {
      statusBreakdown[quote.status] = (statusBreakdown[quote.status] || 0) + 1;
      destinationCounts[quote.destination_country] =
        (destinationCounts[quote.destination_country] || 0) + 1;
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

  /**
   * 🆕 NEW: HSN System Integration Methods
   */

  /**
   * Get HSN record by code with caching
   */
  async getHSNRecord(hsnCode: string): Promise<HSNMasterRecord | null> {
    const cacheKey = `hsn_${hsnCode}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('hsn_master')
        .select('*')
        .eq('hsn_code', hsnCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn(`HSN code ${hsnCode} not found in database`);
        return null;
      }

      const record: HSNMasterRecord = {
        hsn_code: data.hsn_code,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory,
        keywords: data.keywords || [],
        minimum_valuation_usd: data.minimum_valuation_usd,
        requires_currency_conversion: data.requires_currency_conversion,
        weight_data: data.weight_data || {},
        tax_data: data.tax_data || {},
        classification_data: data.classification_data || {},
        is_active: data.is_active,
      };

      this.setCache(cacheKey, record);
      return record;
    } catch (error) {
      console.error('Error fetching HSN record:', error);
      return null;
    }
  }

  /**
   * Search HSN records by keywords for classification
   */
  async searchHSNByKeywords(
    keywords: string[],
    category?: string,
    limit: number = 10,
  ): Promise<HSNMasterRecord[]> {
    const cacheKey = `hsn_search_${keywords.join('_')}_${category || 'all'}_${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      let query = supabase.from('hsn_master').select('*').eq('is_active', true);

      // Add category filter if specified
      if (category) {
        query = query.eq('category', category);
      }

      // Use text search on keywords array
      if (keywords.length > 0) {
        const keywordQuery = keywords.map((k) => `"${k}"`).join(' | ');
        query = query.textSearch('keywords', keywordQuery);
      }

      const { data, error } = await query.limit(limit);

      if (error) {
        console.error('Error searching HSN records:', error);
        return [];
      }

      const records: HSNMasterRecord[] = (data || []).map((item) => ({
        hsn_code: item.hsn_code,
        description: item.description,
        category: item.category,
        subcategory: item.subcategory,
        keywords: item.keywords || [],
        minimum_valuation_usd: item.minimum_valuation_usd,
        requires_currency_conversion: item.requires_currency_conversion,
        weight_data: item.weight_data || {},
        tax_data: item.tax_data || {},
        classification_data: item.classification_data || {},
        is_active: item.is_active,
      }));

      this.setCache(cacheKey, records);
      return records;
    } catch (error) {
      console.error('Error searching HSN records:', error);
      return [];
    }
  }

  /**
   * Get HSN records by category
   */
  async getHSNByCategory(category: string, limit: number = 20): Promise<HSNMasterRecord[]> {
    const cacheKey = `hsn_category_${category}_${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('hsn_master')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .limit(limit);

      if (error) {
        console.error('Error fetching HSN records by category:', error);
        return [];
      }

      const records: HSNMasterRecord[] = (data || []).map((item) => ({
        hsn_code: item.hsn_code,
        description: item.description,
        category: item.category,
        subcategory: item.subcategory,
        keywords: item.keywords || [],
        minimum_valuation_usd: item.minimum_valuation_usd,
        requires_currency_conversion: item.requires_currency_conversion,
        weight_data: item.weight_data || {},
        tax_data: item.tax_data || {},
        classification_data: item.classification_data || {},
        is_active: item.is_active,
      }));

      this.setCache(cacheKey, records);
      return records;
    } catch (error) {
      console.error('Error fetching HSN records by category:', error);
      return [];
    }
  }

  /**
   * 🆕 NEW: Currency Conversion Integration Methods
   */

  /**
   * Convert minimum valuation for quote items
   */
  async convertMinimumValuationsForQuote(quote: UnifiedQuote): Promise<{
    conversions: Array<{
      itemId: string;
      itemName: string;
      usdAmount: number;
      convertedAmount: number;
      originCurrency: string;
      exchangeRate: number;
    }>;
    totalConversions: number;
    failedConversions: number;
  }> {
    const conversions: Array<{
      itemId: string;
      itemName: string;
      usdAmount: number;
      convertedAmount: number;
      originCurrency: string;
      exchangeRate: number;
    }> = [];

    let totalConversions = 0;
    let failedConversions = 0;

    for (const item of quote.items) {
      if (!item.hsn_code) continue;

      try {
        // Get HSN record to check if minimum valuation exists
        const hsnRecord = await this.getHSNRecord(item.hsn_code);
        if (
          !hsnRecord ||
          !hsnRecord.minimum_valuation_usd ||
          !hsnRecord.requires_currency_conversion
        ) {
          continue;
        }

        // Convert minimum valuation
        const conversion = await this.currencyService.convertMinimumValuation(
          hsnRecord.minimum_valuation_usd,
          quote.origin_country,
        );

        conversions.push({
          itemId: item.id,
          itemName: item.name,
          usdAmount: hsnRecord.minimum_valuation_usd,
          convertedAmount: conversion.convertedAmount,
          originCurrency: conversion.originCurrency,
          exchangeRate: conversion.exchangeRate,
        });

        totalConversions++;
      } catch (error) {
        console.error(`Failed to convert minimum valuation for item ${item.name}:`, error);
        failedConversions++;
      }
    }

    return {
      conversions,
      totalConversions,
      failedConversions,
    };
  }

  /**
   * Enhance quote items with HSN classification and currency conversion data
   */
  async enhanceQuoteWithHSNData(quote: UnifiedQuote): Promise<UnifiedQuote> {
    console.log('🏷️ [HSN] Enhancing quote with HSN data:', quote.id);

    try {
      const enhancedItems = await Promise.all(
        quote.items.map(async (item) => {
          const enhancedItem = { ...item };

          // Auto-classify HSN code if missing
          if (!item.hsn_code) {
            try {
              const classificationResult = await autoProductClassifier.classifyProduct({
                productName: item.name,
                productUrl: item.url,
                category: item.category,
              });

              if (classificationResult.hsnCode && classificationResult.confidence > 0.6) {
                enhancedItem.hsn_code = classificationResult.hsnCode;
                console.log(
                  `✅ [HSN] Auto-classified ${item.name} as HSN ${classificationResult.hsnCode}`,
                );
              }
            } catch (error) {
              console.error(`❌ [HSN] Classification failed for ${item.name}:`, error);
            }
          }

          // Add HSN metadata if HSN code is available
          if (enhancedItem.hsn_code) {
            const hsnRecord = await this.getHSNRecord(enhancedItem.hsn_code);
            if (hsnRecord) {
              enhancedItem.hsn_data = {
                description: hsnRecord.description,
                category: hsnRecord.category,
                subcategory: hsnRecord.subcategory,
                minimum_valuation_usd: hsnRecord.minimum_valuation_usd,
                requires_currency_conversion: hsnRecord.requires_currency_conversion,
                typical_weight_kg: hsnRecord.weight_data?.typical_weights?.per_unit?.average,
              };

              // Add currency conversion data if applicable
              if (hsnRecord.minimum_valuation_usd && hsnRecord.requires_currency_conversion) {
                try {
                  const conversion = await this.currencyService.convertMinimumValuation(
                    hsnRecord.minimum_valuation_usd,
                    quote.origin_country,
                  );

                  enhancedItem.minimum_valuation_conversion = {
                    usd_amount: conversion.usdAmount,
                    converted_amount: conversion.convertedAmount,
                    origin_currency: conversion.originCurrency,
                    exchange_rate: conversion.exchangeRate,
                    valuation_method:
                      item.price_usd >= conversion.convertedAmount
                        ? 'actual_price'
                        : 'minimum_valuation',
                  };
                } catch (error) {
                  console.error(`❌ [CURRENCY] Conversion failed for ${item.name}:`, error);
                }
              }
            }
          }

          return enhancedItem;
        }),
      );

      const enhancedQuote: UnifiedQuote = {
        ...quote,
        items: enhancedItems,
        operational_data: {
          ...quote.operational_data,
          hsn_enhancement: {
            enhanced_at: new Date().toISOString(),
            items_with_hsn: enhancedItems.filter((item) => item.hsn_code).length,
            items_with_conversion: enhancedItems.filter((item) => item.minimum_valuation_conversion)
              .length,
            auto_classified_items: enhancedItems.filter(
              (item) => item.hsn_code && !quote.items.find((orig) => orig.id === item.id)?.hsn_code,
            ).length,
          },
        },
      };

      console.log('✅ [HSN] Quote enhancement completed:', {
        quoteId: quote.id,
        itemsWithHSN: enhancedItems.filter((item) => item.hsn_code).length,
        itemsWithConversion: enhancedItems.filter((item) => item.minimum_valuation_conversion)
          .length,
      });

      return enhancedQuote;
    } catch (error) {
      console.error('❌ [HSN] Quote enhancement failed:', error);
      return quote; // Return original quote on failure
    }
  }

  /**
   * Get HSN admin override history for a quote
   */
  getHSNAdminOverrideHistory(quote: UnifiedQuote): {
    overrides: Array<any>;
    summary: {
      total_modifications: number;
      assignments: number;
      changes: number;
      clears: number;
      last_activity: string | null;
    };
    recent_activity: Array<any>;
  } {
    const operationalData = quote.operational_data || {};
    const overrides = operationalData.admin_hsn_overrides || [];
    const summary = operationalData.admin_modification_summary || {
      total_modifications: 0,
      assignments: 0,
      changes: 0,
      clears: 0,
      last_activity: null,
    };

    // Get recent activity (last 10 modifications)
    const recentActivity = overrides
      .slice(-10)
      .reverse()
      .map(override => ({
        ...override,
        time_ago: this.getTimeAgo(override.timestamp),
        action_description: this.getOverrideActionDescription(override),
      }));

    return {
      overrides,
      summary,
      recent_activity: recentActivity,
    };
  }

  /**
   * Generate human-readable description for HSN override action
   */
  private getOverrideActionDescription(override: any): string {
    const { modification_type, item_name, previous_hsn_code, new_hsn_code } = override;
    
    switch (modification_type) {
      case 'assign':
        return `Assigned HSN ${new_hsn_code} to "${item_name}"`;
      case 'change':
        return `Changed "${item_name}" from HSN ${previous_hsn_code} to ${new_hsn_code}`;
      case 'clear':
        return `Removed HSN ${previous_hsn_code} from "${item_name}"`;
      default:
        return `Updated HSN for "${item_name}"`;
    }
  }

  /**
   * Calculate time ago from timestamp
   */
  private getTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  /**
   * Clear HSN-related cache entries
   */
  clearHSNCache(): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.startsWith('hsn_')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    console.log(`🧹 Cleared ${keysToDelete.length} HSN cache entries`);
  }
}

// Export singleton instance
export const unifiedDataEngine = UnifiedDataEngine.getInstance();
