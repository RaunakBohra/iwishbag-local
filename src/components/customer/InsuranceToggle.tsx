// ============================================================================
// INSURANCE TOGGLE - Customer-Facing Insurance Selection Component
// Allows customers to toggle insurance coverage with real-time cost updates
// Integrates with route-based insurance configuration
// ============================================================================

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Shield, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnifiedQuote, ShippingOption, RouteInsuranceOptions } from '@/types/unified-quote';
import { currencyService } from '@/services/CurrencyService';

interface InsuranceToggleProps {
  quote: UnifiedQuote;
  selectedShippingOption?: ShippingOption;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
}

export const InsuranceToggle: React.FC<InsuranceToggleProps> = ({
  quote,
  selectedShippingOption,
  onToggle,
  isLoading = false,
}) => {
  // Get current insurance preference
  const isInsuranceEnabled = quote.customer_data?.preferences?.insurance_opted_in ?? false;

  // Get route-based insurance configuration
  const routeInsuranceConfig: RouteInsuranceOptions | null =
    selectedShippingOption?.insurance_options || null;

  // Calculate total amount for insurance calculation (match backend exactly)
  // Backend uses v_quote.total_usd, so we use the quote's total value
  const totalAmount = quote.total_usd || 0;

  // Calculate insurance cost (match backend RPC function exactly)
  const calculateInsuranceCost = (): number => {
    if (!routeInsuranceConfig || !routeInsuranceConfig.available) {
      // Fallback to match backend: 1.5% of total, min 2.00
      return Math.max(2, totalAmount * 0.015); // 1.5% like backend
    }

    const coveragePercentage = routeInsuranceConfig.coverage_percentage || 1.5;
    const calculatedCost = totalAmount * (coveragePercentage / 100);
    const minFee = routeInsuranceConfig.min_fee || 2; // Match backend default of 2
    const maxCoverage = routeInsuranceConfig.max_coverage || Infinity;

    return Math.max(minFee, Math.min(maxCoverage, calculatedCost));
  };

  const insuranceCost = calculateInsuranceCost();
  const currencySymbol = currencyService.getCurrencySymbol(quote.currency);

  // Get insurance description
  const getInsuranceDescription = (): string => {
    if (routeInsuranceConfig?.customer_description) {
      return routeInsuranceConfig.customer_description;
    }
    return 'Protect your package against loss, damage, or theft during shipping';
  };

  // Get coverage details
  const getCoverageDetails = (): string => {
    if (!routeInsuranceConfig) {
      return `Covers up to ${currencySymbol}${totalAmount.toFixed(2)} (full order value)`;
    }

    const maxCoverage = routeInsuranceConfig.max_coverage;
    const actualCoverage = Math.min(totalAmount, maxCoverage);

    return `Covers up to ${currencySymbol}${actualCoverage.toFixed(2)}`;
  };

  // Don't show if insurance is not available for this route
  if (routeInsuranceConfig && !routeInsuranceConfig.available) {
    return null;
  }

  return (
    <div className="insurance-toggle-container bg-blue-50 border border-blue-200 rounded-lg p-4 my-3">
      <div className="flex items-start justify-between">
        {/* Insurance Info Section */}
        <div className="flex items-start space-x-3 flex-1">
          <div className="mt-1">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-gray-900">Package Protection</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs space-y-1">
                      <p className="font-medium">What's Covered:</p>
                      <p className="text-sm">• Lost packages</p>
                      <p className="text-sm">• Damaged items</p>
                      <p className="text-sm">• Theft during shipping</p>
                      <p className="text-sm">• Full replacement value</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {routeInsuranceConfig?.default_enabled && (
                <Badge variant="secondary" className="text-xs">
                  Recommended
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-2">{getInsuranceDescription()}</p>

            <div className="text-xs text-gray-500">{getCoverageDetails()}</div>
          </div>
        </div>

        {/* Toggle and Price Section */}
        <div className="flex items-center space-x-3 ml-4">
          <div className="text-right">
            <div className="font-semibold text-gray-900">
              +{currencySymbol}
              {insuranceCost.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              {routeInsuranceConfig
                ? `${routeInsuranceConfig.coverage_percentage}% coverage`
                : '0.5% coverage'}
            </div>
          </div>

          <Switch
            checked={isInsuranceEnabled}
            onCheckedChange={onToggle}
            disabled={isLoading}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>

      {/* Status Indicator */}
      {isInsuranceEnabled && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center text-sm text-blue-700">
            <Shield className="w-4 h-4 mr-2" />
            <span className="font-medium">Package protection active - your order is covered!</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
          Updating insurance coverage...
        </div>
      )}
    </div>
  );
};
