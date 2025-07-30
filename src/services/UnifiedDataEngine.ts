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

class UnifiedDataEngine {
  private static instance: UnifiedDataEngine;
  private cache: Map<string, any> = new Map();
  private currencyService = CurrencyConversionService.getInstance();

  private constructor() {}

  static getInstance(): UnifiedDataEngine {
    if (!UnifiedDataEngine.instance) {
      UnifiedDataEngine.instance = new UnifiedDataEngine();
    }
    return UnifiedDataEngine.instance;
  }

  private getCached(key: string): any {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  private async generateSmartSuggestions(items: any[]): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Weight validation suggestions
    for (const item of items) {
      if (item.weight < 0.1) {
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
    const totalValue = items.reduce((sum, item) => sum + item.costprice_origin * item.quantity, 0);
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
      return null;
    }
  }

  
  async getAllHSNRecords(limit: number = 100): Promise<HSNMasterRecord[]> {
    const cacheKey = `hsn_all_${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('hsn_master')
        .select('*')
        .eq('is_active', true)
        .order('hsn_code')
        .limit(limit);

      if (error) throw error;
      
      const records = data || [];
      this.setCache(cacheKey, records);
      return records;
    } catch (error) {
      console.error('Failed to fetch all HSN records:', error);
      return [];
    }
  }

  

  
  async enhanceQuoteWithHSNData(quote: UnifiedQuote): Promise<UnifiedQuote> {
    try {
      const enhancedItems = await Promise.all(
        quote.items.map(async (item) => {
          const enhancedItem = { ...item };

          // Auto-classify product using product classifier
          try {
            const classificationResult = await autoProductClassifier.classifyProduct({
              name: item.name,
              productUrl: item.url,
              category: item.category,
            });

            if (classificationResult.hsnCode && classificationResult.confidence > 0.6) {
              enhancedItem.hsn_code = classificationResult.hsnCode;
            }
          } catch (error) {
            console.warn('Classification failed for item:', item.name, error);
          }

          // Add HSN data if available
          if (enhancedItem.hsn_code) {
            const hsnRecord = await this.getHSNRecord(enhancedItem.hsn_code);
            if (hsnRecord) {
              enhancedItem.hsn_data = {
                category: hsnRecord.category,
                subcategory: hsnRecord.subcategory,
                minimum_valuation_usd: hsnRecord.minimum_valuation_usd,
                requires_currency_conversion: hsnRecord.requires_currency_conversion,
                typical_weight: hsnRecord.weight_data?.typical_weights?.per_unit?.average,
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
                      item.costprice_origin >= conversion.convertedAmount
                        ? 'actual_price'
                        : 'minimum_valuation',
                  };
                } catch (error) {}
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

      return enhancedQuote;
    } catch (error) {
      return quote; // Return original quote on failure
    }
  }

  
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
      .map((override) => ({
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

  
  clearHSNCache(): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.startsWith('hsn_')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // Core CRUD methods for quotes
  async getQuote(quoteId: string): Promise<UnifiedQuote | null> {
    const cacheKey = `quote_${quoteId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error || !data) return null;

      // Transform database row to UnifiedQuote
      const quote: UnifiedQuote = {
        id: data.id,
        display_id: data.display_id || '',
        user_id: data.user_id,
        status: data.status,
        origin_country: data.origin_country,
        destination_country: data.destination_country,
        items: (data.items as QuoteItem[]) || [],
        calculation_data: (data.calculation_data as CalculationData) || {},
        customer_data: (data.customer_data as CustomerData) || {},
        operational_data: (data.operational_data as OperationalData) || {},
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      this.setCache(cacheKey, quote);
      return quote;
    } catch (error) {
      console.error('Failed to get quote:', error);
      return null;
    }
  }

  async updateQuote(quoteId: string, updates: Partial<UnifiedQuote>): Promise<boolean> {
    try {
      // Transform UnifiedQuote updates to database format
      const dbUpdates: any = {};
      
      if (updates.user_id !== undefined) dbUpdates.user_id = updates.user_id;
      if (updates.display_id !== undefined) dbUpdates.display_id = updates.display_id;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.origin_country !== undefined) dbUpdates.origin_country = updates.origin_country;
      if (updates.destination_country !== undefined) dbUpdates.destination_country = updates.destination_country;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      if (updates.calculation_data !== undefined) dbUpdates.calculation_data = updates.calculation_data;
      if (updates.customer_data !== undefined) dbUpdates.customer_data = updates.customer_data;
      if (updates.operational_data !== undefined) dbUpdates.operational_data = updates.operational_data;
      
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('quotes')
        .update(dbUpdates)
        .eq('id', quoteId);

      if (error) {
        console.error('Failed to update quote:', error);
        return false;
      }

      // Clear cache for this quote
      this.cache.delete(`quote_${quoteId}`);
      return true;
    } catch (error) {
      console.error('Failed to update quote:', error);
      return false;
    }
  }

  async addItem(quoteId: string, item: QuoteItem): Promise<boolean> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) return false;

      const newItems = [...quote.items, { ...item, id: crypto.randomUUID() }];
      
      return await this.updateQuote(quoteId, { items: newItems });
    } catch (error) {
      console.error('Failed to add item:', error);
      return false;
    }
  }

  async updateItem(quoteId: string, itemId: string, updates: Partial<QuoteItem>): Promise<boolean> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) return false;

      const itemIndex = quote.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return false;

      const newItems = [...quote.items];
      newItems[itemIndex] = { ...newItems[itemIndex], ...updates };

      return await this.updateQuote(quoteId, { items: newItems });
    } catch (error) {
      console.error('Failed to update item:', error);
      return false;
    }
  }

  async removeItem(quoteId: string, itemId: string): Promise<boolean> {
    try {
      const quote = await this.getQuote(quoteId);
      if (!quote) return false;

      const newItems = quote.items.filter(item => item.id !== itemId);
      
      return await this.updateQuote(quoteId, { items: newItems });
    } catch (error) {
      console.error('Failed to remove item:', error);
      return false;
    }
  }

  private getOverrideActionDescription(override: any): string {
    switch (override.action) {
      case 'assign':
        return `Assigned HSN ${override.new_hsn_code}`;
      case 'change':
        return `Changed HSN from ${override.old_hsn_code} to ${override.new_hsn_code}`;
      case 'clear':
        return `Cleared HSN ${override.old_hsn_code}`;
      default:
        return 'Unknown action';
    }
  }
}

// Export singleton instance
export const unifiedDataEngine = UnifiedDataEngine.getInstance();
