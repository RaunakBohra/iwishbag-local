// ============================================================================
// CUSTOMER PRICE BREAKDOWN - Stripe-Inspired Pricing Display
// Correctly maps from UnifiedQuote JSONB structure to customer-friendly view
// Supports currency conversion and transparent tax model
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Shield,
  Calculator,
  DollarSign,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { getCustomerFeeBreakdown } from '@/utils/feeGroupingUtils';
import {
  applyCustomerFriendlyRounding,
  getRoundingExplanation,
  formatAmountWithCustomerRounding,
} from '@/utils/customerFriendlyRounding';

interface CustomerPriceBreakdownProps {
  quote: UnifiedQuote;
  showDetailedBreakdown?: boolean;
  className?: string;
}

export const CustomerPriceBreakdown: React.FC<CustomerPriceBreakdownProps> = ({
  quote,
  showDetailedBreakdown = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get currency conversion for customer display
  const { displayCurrency, formatPrice, exchangeRate } = useQuoteDisplayCurrency(quote);

  // Use standardized fee breakdown system
  const feeBreakdown = getCustomerFeeBreakdown(quote);

  // Extract breakdown from JSONB structure - MATCHING ADMIN IMPLEMENTATION
  const breakdown = quote.calculation_data?.breakdown || {};

  // Calculate totals with exact same logic as admin CompactCalculationBreakdown
  const itemsTotal = Number(breakdown.items_total || 0);
  const shippingCost = Number(breakdown.shipping || 0);
  const customsCost = Number(breakdown.customs || 0);
  const discountAmount = Number(breakdown.discount || 0);

  // ✅ TRANSPARENT TAX MODEL: Exact same logic as admin component
  const purchaseTax = Number(breakdown.purchase_tax || 0);
  const destinationTax = Number(breakdown.destination_tax || 0);
  const legacyTax = Number(breakdown.taxes || 0);

  // Match admin tax calculation logic exactly
  const totalTaxes =
    purchaseTax +
    destinationTax +
    // Fallback to legacy taxes field if new fields don't exist
    (!purchaseTax && !destinationTax ? legacyTax : 0);

  // Final total from database
  const finalTotal = quote.final_total_usd || 0;

  // Apply customer-friendly rounding to final total only
  const roundingResult = applyCustomerFriendlyRounding(finalTotal, displayCurrency);
  const roundingExplanation = getRoundingExplanation(finalTotal, displayCurrency);

  // Use standardized fee breakdown instead of manual calculation

  const allComponents = [
    { label: 'Items', amount: itemsTotal, color: 'text-blue-600', icon: Package },
    { label: 'Shipping', amount: shippingCost, color: 'text-green-600', icon: Truck },
    { label: 'Customs', amount: customsCost, color: 'text-purple-600', icon: Shield },
    { label: 'Taxes', amount: totalTaxes, color: 'text-orange-600', icon: Calculator },
    {
      label: 'Fees',
      amount: feeBreakdown.serviceFees.total + feeBreakdown.paymentFees.total,
      color: 'text-gray-600',
      icon: DollarSign,
    },
  ];

  // Only show components with amounts > 0 - matching admin logic
  // const costComponents = allComponents.filter((component) => component.amount > 0);

  // Main cost display - CUSTOMER SIMPLIFIED VIEW WITH STANDARDIZED FEES
  const MainCostDisplay = () => {
    // Calculate combined customs & duties (customs + taxes + payment gateway fees)
    const combinedCustomsAndDuties = customsCost + totalTaxes + feeBreakdown.paymentFees.total;

    return (
      <div className="space-y-4">
        {/* Product cost */}
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Product cost</span>
          <span className="font-medium text-gray-900">{formatPrice(itemsTotal)}</span>
        </div>

        {/* International shipping */}
        <div className="flex justify-between items-center">
          <span className="text-gray-700">International shipping</span>
          <span className="font-medium text-gray-900">{formatPrice(shippingCost)}</span>
        </div>

        {/* Combined customs and duties (includes customs + taxes + gateway fees) */}
        {combinedCustomsAndDuties > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Customs & duties</span>
            <span className="font-medium text-gray-900">
              {formatPrice(combinedCustomsAndDuties)}
            </span>
          </div>
        )}

        {/* Show service fees or separate fees based on standardized breakdown */}
        {feeBreakdown.showSeparately ? (
          <>
            {/* Service fees (handling + insurance) */}
            {feeBreakdown.serviceFees.total > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{feeBreakdown.serviceFees.label}</span>
                <span className="font-medium text-gray-900">
                  {formatPrice(feeBreakdown.serviceFees.total)}
                </span>
              </div>
            )}
          </>
        ) : (
          /* Combined service fees if both categories don't warrant separate display */
          feeBreakdown.serviceFees.total > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-700">{feeBreakdown.serviceFees.label}</span>
              <span className="font-medium text-gray-900">
                {formatPrice(feeBreakdown.serviceFees.total)}
              </span>
            </div>
          )
        )}

        {/* Discount */}
        {discountAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Discount applied</span>
            <span className="font-medium text-green-600">-{formatPrice(discountAmount)}</span>
          </div>
        )}
      </div>
    );
  };

  // Detailed breakdown for expanded view - MATCHING ADMIN STRUCTURE
  const DetailedBreakdown = () => (
    <div className="space-y-3 text-sm border-t border-gray-200 pt-4">
      {/* Items Total - Match admin display */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Package className="h-3 w-3 text-blue-500" />
          <span className="text-gray-600">Items Total</span>
          <Badge variant="outline" className="text-xs h-4 px-1">
            {quote.items?.length || 0} items
          </Badge>
        </div>
        <span className="text-gray-700">{formatPrice(itemsTotal)}</span>
      </div>

      {/* International Shipping - Match admin display */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-3 w-3 text-green-500" />
          <span className="text-gray-600">International Shipping</span>
        </div>
        <span className="text-gray-700">{formatPrice(shippingCost)}</span>
      </div>

      {/* Customs & Duties - Match admin display */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3 text-purple-500" />
          <span className="text-gray-600">Customs & Duties</span>
        </div>
        <span className="text-gray-700">{formatPrice(customsCost)}</span>
      </div>

      {/* Purchase Tax (Transparent Tax Model) - Match admin */}
      {purchaseTax > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calculator className="h-3 w-3 text-orange-500" />
            <span className="text-gray-600">Purchase Tax</span>
            <Badge variant="outline" className="text-xs h-4 px-1">
              Origin
            </Badge>
          </div>
          <span className="text-gray-700">{formatPrice(purchaseTax)}</span>
        </div>
      )}

      {/* Destination Tax (VAT/GST) - Match admin */}
      {destinationTax > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calculator className="h-3 w-3 text-purple-500" />
            <span className="text-gray-600">Destination Tax (VAT)</span>
            <Badge variant="outline" className="text-xs h-4 px-1">
              Local
            </Badge>
          </div>
          <span className="text-gray-700">{formatPrice(destinationTax)}</span>
        </div>
      )}

      {/* Legacy Taxes (Backward Compatibility) - Only show if new fields don't exist */}
      {legacyTax > 0 && !purchaseTax && !destinationTax && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calculator className="h-3 w-3 text-orange-500" />
            <span className="text-gray-600">Taxes & VAT</span>
            <Badge variant="outline" className="text-xs h-4 px-1">
              Legacy
            </Badge>
          </div>
          <span className="text-gray-700">{formatPrice(legacyTax)}</span>
        </div>
      )}

      {/* Standardized Fee Breakdown - Service Fees */}
      {feeBreakdown.serviceFees.total > 0 && (
        <>
          {feeBreakdown.serviceFees.handling > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-orange-500" />
                <span className="text-gray-600">Handling charge</span>
              </div>
              <span className="text-gray-700">
                {formatPrice(feeBreakdown.serviceFees.handling)}
              </span>
            </div>
          )}

          {feeBreakdown.serviceFees.insurance > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-purple-500" />
                <span className="text-gray-600">Package protection</span>
              </div>
              <span className="text-gray-700">
                {formatPrice(feeBreakdown.serviceFees.insurance)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Payment Processing Fee */}
      {feeBreakdown.paymentFees.total > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-gray-500" />
            <span className="text-gray-600">{feeBreakdown.paymentFees.label}</span>
          </div>
          <span className="text-gray-700">{formatPrice(feeBreakdown.paymentFees.total)}</span>
        </div>
      )}

      {/* Discount - Match admin */}
      {discountAmount > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-xs font-bold">%</span>
            </div>
            <span className="text-gray-600">Discount</span>
          </div>
          <span className="text-green-600 font-medium">-{formatPrice(discountAmount)}</span>
        </div>
      )}

      {/* Exchange Rate Info */}
      {displayCurrency !== 'USD' && exchangeRate && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <Info className="h-3 w-3" />
            <span>
              Exchange rate: 1 USD = {exchangeRate.toFixed(4)} {displayCurrency}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Pricing breakdown</h3>
          {showDetailedBreakdown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-700"
            >
              {isExpanded ? 'Hide' : 'Show'} details
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </Button>
          )}
        </div>

        {/* Main cost display */}
        <MainCostDisplay />

        {/* Detailed breakdown (expandable) */}
        {isExpanded && showDetailedBreakdown && <DetailedBreakdown />}

        {/* Total */}
        <div className="border-t border-gray-200 mt-6 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                {formatPrice(roundingResult.roundedAmount)}
              </div>
              {displayCurrency !== 'USD' && (
                <div className="text-sm text-gray-500">
                  ≈ ${roundingResult.roundedAmount.toFixed(2)} USD
                </div>
              )}
            </div>
          </div>

          {/* Customer-friendly rounding explanation */}
          {roundingExplanation && (
            <div className="mt-2 p-2 bg-green-50 rounded-lg">
              <div className="flex items-center text-sm text-green-700">
                <Info className="h-3 w-3 mr-1" />
                <span>{roundingExplanation}</span>
              </div>
            </div>
          )}

          {/* Quote validity */}
          <div className="mt-2 text-sm text-gray-600">Quote valid for 30 days from creation</div>
        </div>

        {/* Data consistency warning (dev mode) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer">Debug: Data Mapping</summary>
            <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-50 rounded overflow-auto">
              {JSON.stringify(
                {
                  breakdown,
                  finalTotal,
                  displayCurrency,
                  exchangeRate,
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
