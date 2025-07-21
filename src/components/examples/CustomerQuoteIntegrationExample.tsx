// ============================================================================
// CUSTOMER QUOTE INTEGRATION EXAMPLE
// Shows how to integrate the new customer components with existing quote system
// This is a reference implementation for updating existing quote pages
// ============================================================================

import React, { useState, useCallback } from 'react';
import { CustomerQuoteOptions } from '@/components/customer/CustomerQuoteOptions';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { useToast } from '@/components/ui/use-toast';
import type { UnifiedQuote, ShippingOption } from '@/types/unified-quote';

interface CustomerQuoteIntegrationExampleProps {
  quote: UnifiedQuote;
  onQuoteUpdated: (updatedQuote: UnifiedQuote) => void;
}

export const CustomerQuoteIntegrationExample: React.FC<CustomerQuoteIntegrationExampleProps> = ({
  quote,
  onQuoteUpdated,
}) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const { toast } = useToast();

  // Initialize shipping options (this would typically be done in a useEffect)
  React.useEffect(() => {
    const loadShippingOptions = async () => {
      try {
        const calculationResult = await smartCalculationEngine.calculateWithShippingOptions({
          quote,
          preferences: {
            speed_priority: 'medium',
            cost_priority: 'medium',
            show_all_options: true,
          },
        });

        if (calculationResult.success) {
          setShippingOptions(calculationResult.shipping_options);
        }
      } catch (error) {
        console.error('Failed to load shipping options:', error);
      }
    };

    loadShippingOptions();
  }, [quote]);

  // Handle quote updates with customer preferences
  const handleQuoteUpdate = useCallback(
    async (updates: Partial<UnifiedQuote>): Promise<boolean> => {
      try {
        const success = await unifiedDataEngine.updateQuote(quote.id, updates);

        if (success) {
          // Reload the updated quote
          const updatedQuote = await unifiedDataEngine.getQuote(quote.id);
          if (updatedQuote) {
            onQuoteUpdated(updatedQuote);
          }

          return true;
        }

        return false;
      } catch (error) {
        console.error('Failed to update quote:', error);
        return false;
      }
    },
    [quote.id, onQuoteUpdated],
  );

  // Handle recalculation with new preferences
  const handleRecalculate = useCallback(async () => {
    setIsRecalculating(true);

    try {
      // Perform live calculation with current quote state
      const calculationResult = smartCalculationEngine.calculateLiveSync({
        quote,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: false,
        },
      });

      if (calculationResult.success) {
        // Update the quote with new calculations
        const success = await unifiedDataEngine.updateQuote(quote.id, {
          final_total_usd: calculationResult.updated_quote.final_total_usd,
          calculation_data: calculationResult.updated_quote.calculation_data,
          operational_data: calculationResult.updated_quote.operational_data,
        });

        if (success) {
          onQuoteUpdated(calculationResult.updated_quote);

          toast({
            title: 'Quote Updated',
            description: 'Your quote has been recalculated with your preferences',
            duration: 3000,
          });
        }
      }

      // Also refresh shipping options
      const newCalculationResult = await smartCalculationEngine.calculateWithShippingOptions({
        quote: calculationResult.updated_quote,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: true,
        },
      });

      if (newCalculationResult.success) {
        setShippingOptions(newCalculationResult.shipping_options);
      }
    } catch (error) {
      console.error('Recalculation failed:', error);
      toast({
        title: 'Recalculation Failed',
        description: 'Could not update your quote. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsRecalculating(false);
    }
  }, [quote, onQuoteUpdated, toast]);

  return (
    <div className="customer-quote-integration space-y-6">
      {/* Customer Quote Options */}
      <CustomerQuoteOptions
        quote={quote}
        shippingOptions={shippingOptions}
        onUpdateQuote={handleQuoteUpdate}
        onRecalculate={handleRecalculate}
        showShippingSelector={true}
        showInsuranceToggle={true}
        showHandlingCharges={true}
        isRecalculating={isRecalculating}
      />

      {/* Example: Additional integration points */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Integration Notes:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Replace your existing quote breakdown with CustomerQuoteOptions</li>
          <li>• Ensure your quote page state updates when onQuoteUpdated is called</li>
          <li>• Add error handling for failed updates</li>
          <li>• Consider adding loading states during recalculation</li>
          <li>• Test with different quote statuses (pending, approved, etc.)</li>
        </ul>
      </div>

      {/* Debug Information (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Debug Info:</h4>
          <div className="text-xs space-y-1">
            <div>Quote ID: {quote.id}</div>
            <div>
              Insurance Opted In:{' '}
              {quote.customer_data?.preferences?.insurance_opted_in ? 'Yes' : 'No'}
            </div>
            <div>
              Selected Shipping: {quote.operational_data?.shipping?.selected_option || 'None'}
            </div>
            <div>Shipping Options: {shippingOptions.length}</div>
            <div>Final Total: ${quote.final_total_usd?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Example usage in existing quote pages:
/*
// In your existing quote component (e.g., QuoteBreakdown.tsx):

import { CustomerQuoteIntegrationExample } from '@/components/examples/CustomerQuoteIntegrationExample';

// Replace your existing quote breakdown section with:
<CustomerQuoteIntegrationExample
  quote={quote}
  onQuoteUpdated={(updatedQuote) => {
    // Update your local state
    setQuote(updatedQuote);
    
    // Invalidate any React Query caches
    queryClient.invalidateQueries(['quote', quote.id]);
    
    // Trigger any other necessary updates
    onQuoteChange?.(updatedQuote);
  }}
/>
*/
