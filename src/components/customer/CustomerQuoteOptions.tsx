// ============================================================================
// CUSTOMER QUOTE OPTIONS - Comprehensive Customer Quote Configuration
// Combines shipping selection, insurance toggle, and real-time price updates
// Provides customer-friendly interface for quote customization
// ============================================================================

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Calculator, TrendingUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { InsuranceToggle } from './InsuranceToggle';
import { CustomerShippingSelector } from './CustomerShippingSelector';
import type { UnifiedQuote, ShippingOption, CustomerPreferences } from '@/types/unified-quote';
import { currencyService } from '@/services/CurrencyService';
import { normalizeShippingOptionId } from '@/utils/shippingOptionUtils';

interface CustomerQuoteOptionsProps {
  quote: UnifiedQuote;
  shippingOptions: ShippingOption[];
  onUpdateQuote: (updates: Partial<UnifiedQuote>) => Promise<boolean>;
  onRecalculate?: () => void;
  showShippingSelector?: boolean;
  showInsuranceToggle?: boolean;
  showHandlingCharges?: boolean;
  isRecalculating?: boolean;
}

export const CustomerQuoteOptions: React.FC<CustomerQuoteOptionsProps> = ({
  quote,
  shippingOptions,
  onUpdateQuote,
  onRecalculate,
  showShippingSelector = true,
  showInsuranceToggle = true,
  showHandlingCharges = true,
  isRecalculating = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const currencySymbol = currencyService.getCurrencySymbol(quote.currency);

  // Get current selections
  const selectedShippingOptionId = quote.operational_data?.shipping?.selected_option;
  const normalizedId = normalizeShippingOptionId(selectedShippingOptionId);
  const selectedShippingOption = shippingOptions.find((opt) => opt.id === normalizedId);
  const currentPreferences = quote.customer_data?.preferences || {};

  // Calculate current totals for display
  const calculateCurrentTotal = (): number => {
    return quote.final_total_usd || 0;
  };

  // Handle insurance toggle
  const handleInsuranceToggle = useCallback(
    async (enabled: boolean) => {
      setIsUpdating(true);

      try {
        const updatedPreferences: CustomerPreferences = {
          ...currentPreferences,
          insurance_opted_in: enabled,
        };

        const updatedQuote: Partial<UnifiedQuote> = {
          customer_data: {
            ...quote.customer_data,
            preferences: updatedPreferences,
          },
        };

        const success = await onUpdateQuote(updatedQuote);

        if (success) {
          toast({
            title: enabled ? 'Insurance Added' : 'Insurance Removed',
            description: enabled
              ? 'Your package is now protected against loss and damage'
              : 'Insurance coverage has been removed from your order',
            duration: 3000,
          });

          // Trigger recalculation if available
          if (onRecalculate) {
            onRecalculate();
          }
        } else {
          throw new Error('Failed to update insurance preference');
        }
      } catch (error) {
        console.error('Failed to update insurance:', error);
        toast({
          title: 'Update Failed',
          description: 'Could not update insurance preference. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [currentPreferences, quote.customer_data, onUpdateQuote, onRecalculate, toast],
  );

  // Handle shipping method selection
  const handleShippingSelection = useCallback(
    async (optionId: string) => {
      setIsUpdating(true);

      try {
        const updatedQuote: Partial<UnifiedQuote> = {
          operational_data: {
            ...quote.operational_data,
            shipping: {
              ...quote.operational_data?.shipping,
              selected_option: optionId,
            },
          },
        };

        const success = await onUpdateQuote(updatedQuote);

        if (success) {
          const selectedOption = shippingOptions.find((opt) => opt.id === optionId);
          toast({
            title: 'Shipping Method Updated',
            description: `Selected ${selectedOption?.carrier} ${selectedOption?.name}`,
            duration: 3000,
          });

          // Trigger recalculation if available
          if (onRecalculate) {
            onRecalculate();
          }
        } else {
          throw new Error('Failed to update shipping method');
        }
      } catch (error) {
        console.error('Failed to update shipping method:', error);
        toast({
          title: 'Update Failed',
          description: 'Could not update shipping method. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [quote.operational_data, onUpdateQuote, onRecalculate, shippingOptions, toast],
  );

  // Check if customer has made any customizations
  const hasCustomizations = (): boolean => {
    return (
      currentPreferences.insurance_opted_in === true ||
      selectedShippingOptionId !== shippingOptions[0]?.id
    );
  };

  // Get savings/additional costs from customizations
  const getCustomizationImpact = (): { savings: number; additional: number } => {
    // This would calculate the difference from the default option
    // For now, return placeholder values
    return { savings: 0, additional: 0 };
  };

  const { savings, additional } = getCustomizationImpact();

  return (
    <div className="customer-quote-options space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <CardTitle className="text-lg">Customize Your Order</CardTitle>
            </div>

            <div className="flex items-center space-x-2">
              {hasCustomizations() && (
                <Badge variant="secondary" className="text-xs">
                  Customized
                </Badge>
              )}

              <div className="text-right">
                <div className="text-sm text-gray-600">Current Total</div>
                <div className="font-semibold text-lg">
                  {currencySymbol}
                  {calculateCurrentTotal().toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Customization Impact */}
          {(savings > 0 || additional > 0) && (
            <div className="mt-2 text-sm">
              {savings > 0 && (
                <div className="text-green-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  You're saving {currencySymbol}
                  {savings.toFixed(2)}
                </div>
              )}
              {additional > 0 && (
                <div className="text-blue-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Additional: {currencySymbol}
                  {additional.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Shipping Method Selection */}
      {showShippingSelector && shippingOptions.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <CustomerShippingSelector
              quote={quote}
              shippingOptions={shippingOptions}
              selectedOptionId={selectedShippingOptionId}
              onSelectOption={handleShippingSelection}
              showHandlingCharges={showHandlingCharges}
              isLoading={isUpdating || isRecalculating}
            />
          </CardContent>
        </Card>
      )}

      {/* Insurance Toggle */}
      {showInsuranceToggle && (
        <InsuranceToggle
          quote={quote}
          selectedShippingOption={selectedShippingOption}
          onToggle={handleInsuranceToggle}
          isLoading={isUpdating || isRecalculating}
        />
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
              <span>Changes will update your total automatically</span>
            </div>

            {onRecalculate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                disabled={isRecalculating}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                <span>Recalculate</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Updates Indicator */}
      {(isUpdating || isRecalculating) && (
        <div className="text-center py-2">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
            <Calculator className="w-4 h-4 animate-pulse" />
            <span>Updating your quote...</span>
          </div>
        </div>
      )}
    </div>
  );
};
