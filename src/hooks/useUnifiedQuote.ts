// ============================================================================
// UNIFIED QUOTE HOOK - Single Hook for All Quote Operations
// Replaces 10+ separate hooks with unified smart operations
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import type { 
  UnifiedQuote, 
  ShippingOption, 
  ShippingRecommendation,
  SmartSuggestion 
} from '@/types/unified-quote';

interface UseUnifiedQuoteOptions {
  quoteId: string;
  autoCalculate?: boolean;
  cacheTimeout?: number;
}

interface UseUnifiedQuoteReturn {
  // Core data
  quote: UnifiedQuote | null;
  isLoading: boolean;
  error: string | null;
  
  // Smart features
  shippingOptions: ShippingOption[];
  shippingRecommendations: ShippingRecommendation[];
  smartSuggestions: SmartSuggestion[];
  optimizationScore: number;
  
  // Calculation state
  isCalculating: boolean;
  lastCalculated: Date | null;
  
  // Actions
  refreshQuote: () => Promise<void>;
  calculateSmartFeatures: () => Promise<void>;
  updateQuote: (updates: Partial<UnifiedQuote>) => Promise<boolean>;
  selectShippingOption: (optionId: string) => Promise<boolean>;
  applySuggestion: (suggestion: SmartSuggestion) => Promise<boolean>;
  
  // Item operations
  addItem: (item: any) => Promise<boolean>;
  updateItem: (itemId: string, updates: any) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  
  // Status operations
  updateStatus: (newStatus: string) => Promise<boolean>;
  
  // Analytics
  getQuoteMetrics: () => {
    totalItems: number;
    totalWeight: number;
    avgWeightConfidence: number;
    shippingPercentage: number;
    customsPercentage: number;
  };
}

export const useUnifiedQuote = ({
  quoteId,
  autoCalculate = true,
  cacheTimeout = 5 * 60 * 1000, // 5 minutes
}: UseUnifiedQuoteOptions): UseUnifiedQuoteReturn => {
  const { toast } = useToast();
  
  // Core state
  const [quote, setQuote] = useState<UnifiedQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Smart features state
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingRecommendations, setShippingRecommendations] = useState<ShippingRecommendation[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(0);
  
  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);

  // Load quote data
  const refreshQuote = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const quoteData = await unifiedDataEngine.getQuote(quoteId);
      
      if (!quoteData) {
        setError('Quote not found');
        return;
      }
      
      setQuote(quoteData);
      
      // Auto-calculate smart features if enabled
      if (autoCalculate && quoteData.items.length > 0) {
        await calculateSmartFeaturesInternal(quoteData);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quote';
      setError(errorMessage);
      console.error('Error loading quote:', err);
    } finally {
      setIsLoading(false);
    }
  }, [quoteId, autoCalculate]);

  // Calculate smart features
  const calculateSmartFeaturesInternal = async (quoteData: UnifiedQuote) => {
    try {
      setIsCalculating(true);
      
      const result = await smartCalculationEngine.calculateWithShippingOptions({
        quote: quoteData,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: true,
        },
      });

      if (result.success) {
        setQuote(result.updated_quote);
        setShippingOptions(result.shipping_options);
        setShippingRecommendations(result.smart_recommendations);
        setSmartSuggestions(result.optimization_suggestions);
        setOptimizationScore(result.updated_quote.optimization_score);
        setLastCalculated(new Date());
      } else {
        throw new Error(result.error || 'Calculation failed');
      }
    } catch (err) {
      console.error('Error calculating smart features:', err);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate smart features. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateSmartFeatures = useCallback(async () => {
    if (!quote) return;
    await calculateSmartFeaturesInternal(quote);
  }, [quote]);

  // Update quote
  const updateQuote = useCallback(async (updates: Partial<UnifiedQuote>): Promise<boolean> => {
    if (!quote) return false;
    
    try {
      const success = await unifiedDataEngine.updateQuote(quote.id, updates);
      
      if (success) {
        await refreshQuote();
        toast({
          title: 'Quote updated',
          description: 'Quote has been successfully updated.',
        });
      }
      
      return success;
    } catch (err) {
      console.error('Error updating quote:', err);
      toast({
        title: 'Update failed',
        description: 'Failed to update quote. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [quote, refreshQuote, toast]);

  // Select shipping option
  const selectShippingOption = useCallback(async (optionId: string): Promise<boolean> => {
    if (!quote) return false;

    const updatedOperationalData = {
      ...quote.operational_data,
      shipping: {
        ...quote.operational_data.shipping,
        selected_option: optionId,
      },
    };

    const success = await updateQuote({
      operational_data: updatedOperationalData,
    });

    if (success) {
      toast({
        title: 'Shipping updated',
        description: 'Quote recalculated with new shipping option.',
      });
    }

    return success;
  }, [quote, updateQuote, toast]);

  // Apply suggestion
  const applySuggestion = useCallback(async (suggestion: SmartSuggestion): Promise<boolean> => {
    if (!quote) return false;

    try {
      // Handle different suggestion types
      if (suggestion.type === 'shipping' && suggestion.action === 'switch_shipping') {
        // Find recommended option from shipping recommendations
        const recommendedOption = shippingRecommendations.find(rec => 
          suggestion.message.includes(rec.reason)
        );
        
        if (recommendedOption) {
          const success = await selectShippingOption(recommendedOption.option_id);
          if (success) {
            // Remove applied suggestion
            setSmartSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            return true;
          }
        }
      }

      // Handle other suggestion types here...
      
      return false;
    } catch (err) {
      console.error('Error applying suggestion:', err);
      toast({
        title: 'Failed to apply suggestion',
        description: 'Could not apply the suggestion. Please try manually.',
        variant: 'destructive',
      });
      return false;
    }
  }, [quote, shippingRecommendations, selectShippingOption, toast]);

  // Item operations
  const addItem = useCallback(async (item: any): Promise<boolean> => {
    if (!quote) return false;
    
    try {
      const success = await unifiedDataEngine.addItem(quote.id, item);
      if (success) {
        await refreshQuote();
        toast({
          title: 'Item added',
          description: 'Item has been added to the quote.',
        });
      }
      return success;
    } catch (err) {
      console.error('Error adding item:', err);
      return false;
    }
  }, [quote, refreshQuote, toast]);

  const updateItem = useCallback(async (itemId: string, updates: any): Promise<boolean> => {
    if (!quote) return false;
    
    try {
      const success = await unifiedDataEngine.updateItem(quote.id, itemId, updates);
      if (success) {
        await refreshQuote();
        toast({
          title: 'Item updated',
          description: 'Item has been updated.',
        });
      }
      return success;
    } catch (err) {
      console.error('Error updating item:', err);
      return false;
    }
  }, [quote, refreshQuote, toast]);

  const removeItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!quote) return false;
    
    try {
      const success = await unifiedDataEngine.removeItem(quote.id, itemId);
      if (success) {
        await refreshQuote();
        toast({
          title: 'Item removed',
          description: 'Item has been removed from the quote.',
        });
      }
      return success;
    } catch (err) {
      console.error('Error removing item:', err);
      return false;
    }
  }, [quote, refreshQuote, toast]);

  // Status operations
  const updateStatus = useCallback(async (newStatus: string): Promise<boolean> => {
    if (!quote) return false;
    
    try {
      const success = await updateQuote({ status: newStatus });
      if (success) {
        toast({
          title: 'Status updated',
          description: `Quote status changed to ${newStatus}.`,
        });
      }
      return success;
    } catch (err) {
      console.error('Error updating status:', err);
      return false;
    }
  }, [quote, updateQuote, toast]);

  // Analytics
  const getQuoteMetrics = useCallback(() => {
    if (!quote) {
      return {
        totalItems: 0,
        totalWeight: 0,
        avgWeightConfidence: 0,
        shippingPercentage: 0,
        customsPercentage: 0,
      };
    }

    const breakdown = quote.calculation_data.breakdown;
    const totalItems = quote.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = quote.items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0);
    const avgWeightConfidence = quote.items.reduce((sum, item) => sum + (item.smart_data?.weight_confidence || 0), 0) / quote.items.length;

    return {
      totalItems,
      totalWeight,
      avgWeightConfidence,
      shippingPercentage: (breakdown.shipping / quote.final_total_usd) * 100,
      customsPercentage: (breakdown.customs / quote.final_total_usd) * 100,
    };
  }, [quote]);

  // Initial load
  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  return {
    // Core data
    quote,
    isLoading,
    error,
    
    // Smart features
    shippingOptions,
    shippingRecommendations,
    smartSuggestions,
    optimizationScore,
    
    // Calculation state
    isCalculating,
    lastCalculated,
    
    // Actions
    refreshQuote,
    calculateSmartFeatures,
    updateQuote,
    selectShippingOption,
    applySuggestion,
    
    // Item operations
    addItem,
    updateItem,
    removeItem,
    
    // Status operations
    updateStatus,
    
    // Analytics
    getQuoteMetrics,
  };
};