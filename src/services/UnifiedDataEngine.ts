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
}

// Export singleton instance
export const unifiedDataEngine = UnifiedDataEngine.getInstance();
