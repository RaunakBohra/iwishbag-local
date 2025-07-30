import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { currencyService } from '@/services/CurrencyService';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import type { EnhancedCalculationResult } from '@/services/SmartCalculationEngine';

// Type definitions for better type safety
export interface QuoteItem {
  id?: string;
  name: string;
  url?: string;
  image_url?: string;
  quantity: number;
  costprice_origin: number;
  weight: number;
  hsn_code?: string;
  category?: string;
  tax_method?: 'hsn' | 'manual' | 'route_based';
  tax_options?: any;
  actual_price?: number;
  minimum_valuation_usd?: number;
  seller?: string;
  sku?: string;
  customer_notes?: string;
}

export interface QuoteCalculationData {
  breakdown?: {
    subtotal: number;
    shipping: number;
    insurance: number;
    handling: number;
    customs: number;
    sales_tax: number;
    destination_tax: number;
    discount: number;
  };
  totals?: {
    items_total: number;
    shipping_total: number;
    customs_total: number;
    tax_total: number;
    final_total: number;
  };
  tax_calculation?: {
    method: 'manual' | 'hsn_only' | 'route_based';
    valuation_method?: string;
    customs_rate?: number;
    sales_tax_rate?: number;
    destination_tax_rate?: number;
  };
  item_breakdowns?: Array<{
    item_id: string;
    customs: number;
    sales_tax: number;
    destination_tax: number;
    customs_value: number;
  }>;
  exchange_rate?: number;
  last_calculated?: string;
}

export interface AdminQuoteDetails extends Tables<'quotes'> {
  items: QuoteItem[];
  calculation_data: QuoteCalculationData;
  customer_profile?: Tables<'profiles'>;
  destination_currency?: {
    code: string;
    symbol: string;
  };
}

export interface UseAdminQuoteDetailsReturn {
  quote: AdminQuoteDetails | null;
  isLoading: boolean;
  error: Error | null;
  updateQuote: (updates: Partial<AdminQuoteDetails>) => Promise<void>;
  isUpdating: boolean;
  calculationResult: EnhancedCalculationResult | null;
  recalculate: () => Promise<void>;
  isRecalculating: boolean;
  refreshQuote: () => void;
}

export function useAdminQuoteDetails(quoteId: string | undefined): UseAdminQuoteDetailsReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculationResult, setCalculationResult] = useState<EnhancedCalculationResult | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Fetch quote with all related data
  const {
    data: quote,
    isLoading,
    error,
    refetch: refreshQuote
  } = useQuery({
    queryKey: ['admin-quote-details', quoteId],
    queryFn: async () => {
      if (!quoteId) throw new Error('No quote ID provided');

      // Check admin access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (!isAdmin) throw new Error('Admin access required');

      // Fetch quote - try both ID and tracking ID
      let quoteData = null;
      
      // Try by UUID first
      const { data: quoteById, error: errorById } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (!errorById && quoteById) {
        quoteData = quoteById;
      } else {
        // Try by tracking ID
        const { data: quoteByTracking, error: errorByTracking } = await supabase
          .from('quotes')
          .select('*')
          .eq('iwish_tracking_id', quoteId)
          .single();

        if (!errorByTracking && quoteByTracking) {
          quoteData = quoteByTracking;
        }
      }

      if (!quoteData) {
        throw new Error('Quote not found');
      }

      // Fetch customer profile if available
      let customerProfile = null;
      if (quoteData.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', quoteData.user_id)
          .single();
        customerProfile = profile;
      }

      // Get destination currency
      let destinationCurrency = null;
      try {
        const currencyCode = await currencyService.getCurrencyForCountry(
          quoteData.destination_country
        );
        destinationCurrency = {
          code: currencyCode,
          symbol: currencyService.getCurrencySymbol(currencyCode)
        };
      } catch (error) {
        console.error('Error getting currency:', error);
        destinationCurrency = { code: 'USD', symbol: '$' };
      }

      // Parse and validate JSONB fields
      const items = Array.isArray(quoteData.items) ? quoteData.items : [];
      const calculationData = quoteData.calculation_data || {};

      return {
        ...quoteData,
        items,
        calculation_data: calculationData,
        customer_profile: customerProfile,
        destination_currency: destinationCurrency
      } as AdminQuoteDetails;
    },
    enabled: Boolean(quoteId),
    retry: 1
  });

  // Calculate pricing when quote loads or changes
  useEffect(() => {
    if (quote && !isRecalculating) {
      performCalculation();
    }
  }, [quote?.id, quote?.items?.length]); // Only recalc on quote change

  // Perform calculation
  const performCalculation = useCallback(async () => {
    if (!quote) return;

    try {
      const calculationInput = {
        quote: {
          id: quote.id,
          items: quote.items.map((item, index) => ({
            id: item.id || `item-${index}`,
            name: item.name,
            url: item.url || '',
            image: item.image_url || '',
            quantity: item.quantity || 1,
            costprice_origin: item.costprice_origin || 0,
            weight: item.weight || 0,
            hsn_code: item.hsn_code || '',
            category: item.category || '',
            tax_method: item.tax_method || 'hsn',
            tax_options: item.tax_options,
            actual_price: item.actual_price || item.costprice_origin || 0,
            valuation_method: item.valuation_method || 'actual_price',
            minimum_valuation_usd: item.minimum_valuation_usd || 0,
            customer_notes: item.customer_notes || ''
          })),
          destination_country: quote.destination_country,
          origin_country: quote.origin_country,
          status: quote.status,
          calculation_data: quote.calculation_data || {},
          operational_data: quote.operational_data || {},
          customer_data: quote.customer_data || {}
        },
        preferences: {
          speed_priority: 'medium' as const,
          cost_priority: 'medium' as const,
          show_all_options: true
        },
        tax_calculation_preferences: {
          calculation_method_preference: quote.calculation_data?.tax_calculation?.method || 'hsn_only',
          valuation_method_preference: quote.valuation_method_preference || 'higher_of_both',
          admin_id: 'admin-quote-details'
        }
      };

      const result = await smartCalculationEngine.calculateWithShippingOptions(calculationInput);
      setCalculationResult(result);
    } catch (error) {
      console.error('Calculation error:', error);
    }
  }, [quote]);

  // Recalculate manually
  const recalculate = useCallback(async () => {
    setIsRecalculating(true);
    try {
      await performCalculation();
      toast({
        title: 'Recalculated',
        description: 'Quote has been recalculated successfully.'
      });
    } catch (error) {
      toast({
        title: 'Calculation Failed',
        description: 'Failed to recalculate quote. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRecalculating(false);
    }
  }, [performCalculation, toast]);

  // Update quote mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<AdminQuoteDetails>) => {
      if (!quoteId || !quote) throw new Error('No quote to update');

      // Prepare database updates
      const dbUpdates: any = {};

      // Handle direct field updates
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.admin_notes !== undefined) dbUpdates.admin_notes = updates.admin_notes;
      if (updates.internal_notes !== undefined) dbUpdates.internal_notes = updates.internal_notes;

      // Handle items update
      if (updates.items) {
        dbUpdates.items = updates.items;
      }

      // Handle calculation data updates
      if (updates.calculation_data) {
        dbUpdates.calculation_data = {
          ...quote.calculation_data,
          ...updates.calculation_data
        };
      }

      // Handle operational data updates
      if (updates.operational_data) {
        dbUpdates.operational_data = {
          ...quote.operational_data,
          ...updates.operational_data
        };
      }

      // Update the quote
      const { data, error } = await supabase
        .from('quotes')
        .update(dbUpdates)
        .eq('id', quote.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quote-details', quoteId] });
      toast({
        title: 'Quote Updated',
        description: 'Quote has been updated successfully.'
      });
    },
    onError: (error) => {
      console.error('Failed to update quote:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update quote. Please try again.',
        variant: 'destructive'
      });
    }
  });

  return {
    quote,
    isLoading,
    error: error as Error | null,
    updateQuote: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    calculationResult,
    recalculate,
    isRecalculating,
    refreshQuote
  };
}