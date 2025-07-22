// ============================================================================
// CUSTOMER SHIPPING SELECTOR - Customer-Facing Shipping Method Selection
// Allows customers to choose between shipping methods with clear pricing
// Shows handling charges and delivery times in customer-friendly format
// ============================================================================

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Clock, DollarSign, Zap, CheckCircle, Package } from 'lucide-react';
import type { UnifiedQuote, ShippingOption, RouteHandlingCharge } from '@/types/unified-quote';
import { currencyService } from '@/services/CurrencyService';
import { formatDeliveryDays, isExpressDelivery, getDeliveryDaysForSorting } from '@/lib/deliveryFormatUtils';

interface CustomerShippingSelectorProps {
  quote: UnifiedQuote;
  shippingOptions: ShippingOption[];
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
  showHandlingCharges?: boolean;
  isLoading?: boolean;
}

export const CustomerShippingSelector: React.FC<CustomerShippingSelectorProps> = ({
  quote,
  shippingOptions,
  selectedOptionId,
  onSelectOption,
  showHandlingCharges = true,
  isLoading = false,
}) => {
  const currencySymbol = currencyService.getCurrencySymbol(quote.currency);

  // Calculate items total for handling calculation
  const itemsTotal =
    quote.items?.reduce((sum, item) => sum + item.price_usd * item.quantity, 0) || 0;

  // Calculate handling charge for an option
  const calculateHandlingCharge = (option: ShippingOption): number => {
    const routeHandlingConfig: RouteHandlingCharge | undefined = option.handling_charge;

    if (!routeHandlingConfig) {
      // Legacy fallback
      return Math.max(5, itemsTotal * 0.02);
    }

    const baseHandling = routeHandlingConfig.base_fee || 0;
    const percentageHandling = routeHandlingConfig.percentage_of_value
      ? (itemsTotal * routeHandlingConfig.percentage_of_value) / 100
      : 0;
    const totalHandling = baseHandling + percentageHandling;

    // Apply min/max bounds
    const minFee = routeHandlingConfig.min_fee || 0;
    const maxFee = routeHandlingConfig.max_fee || Infinity;

    return Math.max(minFee, Math.min(maxFee, totalHandling));
  };

  // Get total cost including shipping and handling
  const getTotalCost = (option: ShippingOption): number => {
    const handlingCharge = showHandlingCharges ? calculateHandlingCharge(option) : 0;
    return option.cost_usd + handlingCharge;
  };

  // Get delivery time display using utility
  const getDeliveryDisplay = (option: ShippingOption): string => {
    return formatDeliveryDays(option.days, 'customer');
  };

  // Get shipping method priority badge using utility
  const getPriorityBadge = (option: ShippingOption) => {
    const minDays = getDeliveryDaysForSorting(option.days);

    if (minDays <= 3) {
      return (
        <Badge variant="destructive" className="text-xs">
          Express
        </Badge>
      );
    } else if (minDays <= 7) {
      return (
        <Badge variant="default" className="text-xs">
          Standard
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-xs">
          Economy
        </Badge>
      );
    }
  };

  if (shippingOptions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Truck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>No shipping options available</p>
      </div>
    );
  }

  return (
    <div className="customer-shipping-selector space-y-3">
      <div className="flex items-center space-x-2 mb-4">
        <Truck className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">Choose Delivery Method</h3>
      </div>

      {shippingOptions.map((option) => {
        const isSelected = selectedOptionId === option.id;
        const totalCost = getTotalCost(option);
        const handlingCharge = showHandlingCharges ? calculateHandlingCharge(option) : 0;

        return (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'ring-2 ring-blue-500 border-blue-300 shadow-md'
                : 'hover:border-gray-300 hover:shadow-sm'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isLoading && onSelectOption(option.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left Section: Carrier Info */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    {isSelected ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{option.carrier}</span>
                      {getPriorityBadge(option)}
                      {option.name !== 'Standard' && (
                        <Badge variant="outline" className="text-xs">
                          {option.name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {getDeliveryDisplay(option)}
                      </div>

                      {option.tracking && (
                        <div className="flex items-center text-green-600">
                          <span className="text-xs">✓ Tracking included</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Pricing */}
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1 mb-1">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <span className="text-lg font-semibold text-gray-900">
                      {currencySymbol}
                      {totalCost.toFixed(2)}
                    </span>
                  </div>

                  {/* Cost Breakdown */}
                  {showHandlingCharges && handlingCharge > 0 && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>
                        Shipping: {currencySymbol}
                        {option.cost_usd.toFixed(2)}
                      </div>
                      <div className="flex items-center">
                        <Package className="w-3 h-3 mr-1" />
                        Handling: {currencySymbol}
                        {handlingCharge.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {!showHandlingCharges && (
                    <div className="text-xs text-gray-500">All-inclusive pricing</div>
                  )}
                </div>
              </div>

              {/* Additional Info for Selected Option */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-blue-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span>Selected delivery method</span>
                    </div>

                    <div className="text-gray-600">
                      Confidence: {(option.confidence * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Route-based handling info */}
                  {showHandlingCharges && option.handling_charge && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="font-medium mb-1">Handling Service Details:</div>
                      <div>
                        Base fee: {currencySymbol}
                        {option.handling_charge.base_fee.toFixed(2)}
                      </div>
                      {option.handling_charge.percentage_of_value > 0 && (
                        <div>
                          Value-based: {option.handling_charge.percentage_of_value}% of item value
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-1"></div>
          Updating shipping options...
        </div>
      )}
    </div>
  );
};
