// ============================================================================
// COMPACT CALCULATION BREAKDOWN - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Ultra-compact cost display, smart insights, collapsible details
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Info,
  ExternalLink,
  Zap,
  ChevronDown,
  ChevronUp,
  PieChart,
  Tags,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnifiedQuote, ShippingOption } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import { getAdminFeeBreakdown } from '@/utils/feeGroupingUtils';

interface CompactCalculationBreakdownProps {
  quote: UnifiedQuote;
  shippingOptions: ShippingOption[];
  isCalculating: boolean;
  compact?: boolean;
}

export const CompactCalculationBreakdown: React.FC<CompactCalculationBreakdownProps> = ({
  quote,
  shippingOptions,
  isCalculating,
  compact = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('breakdown');

  // Get standardized currency display info
  const currencyDisplay = useAdminQuoteCurrency(quote);
  const isDualCurrency = currencyDisplay.originCurrency !== currencyDisplay.destinationCurrency;

  // Reset active tab to breakdown if invalid tab
  React.useEffect(() => {
    if (activeTab === 'exchange') {
      setActiveTab('breakdown');
    }
  }, [activeTab]);

  const breakdown = quote.calculation_data?.breakdown || {};
  const exchangeRate = currencyDisplay.exchangeRate;
  const totalCost = quote.final_total_usd || 0;

  // Check if );

  // Helper functions for shipping breakdown calculations
  const getTotalWeight = () => {
    return quote.items?.reduce((sum, item) => sum + item.weight * item.quantity, 0) || 0;
  };

  const getTotalValue = () => {
    return quote.items?.reduce((sum, item) => sum + item.costprice_origin * item.quantity, 0) || 0;
  };

  // ✅ FIXED: Show actual calculated shipping cost instead of estimates
  const getActualShippingCost = () => {
    // Use the actual calculated shipping cost from breakdown
    return breakdown.shipping || 0;
  };

  const getShippingDisplayInfo = () => {
    // Return simplified display info based on actual data
    const totalWeight = getTotalWeight();
    const totalShipping = breakdown.shipping || 0;

    return {
      totalCost: totalShipping,
      weight: totalWeight,
      note: 'Based on route configuration and selected carrier',
    };
  };

  // Use standardized fee breakdown system
  const feeBreakdown = getAdminFeeBreakdown(quote);

  // Calculate total taxes (combining all tax types)
  const totalTaxes =
    (breakdown.taxes || quote.calculation_data?.sales_tax_price || 0) +
    (breakdown.destination_tax || 0) +
    (hsnCalculationData?.total_hsn_local_taxes || 0);

  // Debug logging
  console.log(`[BREAKDOWN DEBUG] Calculation breakdown analysis:`, {
    id: quote.id,
    method: quote.calculation_method_preference,
    breakdown: breakdown,
    final_total: totalCost,
    taxes: breakdown.taxes,
    customs: breakdown.customs,
    ishsnCalculationData,
  });

  // 🔍 [DEBUG] Enhanced logging for quote bbfc6b7f-c630-41be-a688-ab3bb7087520
  if (quote.id === 'bbfc6b7f-c630-41be-a688-ab3bb7087520') {
    const feeBreakdownPreview = getAdminFeeBreakdown(quote);
    console.log(`[DEBUG] Special quote tax and fee breakdown analysis:`, {
      // Tax breakdown
      breakdown_customs: breakdown.customs,
      breakdown_taxes: breakdown.taxes, // Legacy sales tax
      breakdown_destination_tax: breakdown.destination_tax,
      sales_tax_price: quote.calculation_data?.sales_tax_price,
      hsn_local_taxes: hsnCalculationData?.total_hsn_local_taxes,
      total_taxes_calculated: totalTaxes,

      // Fee breakdown
      breakdown_shipping: breakdown.shipping,
      breakdown_handling: breakdown.handling,
      breakdown_insurance: breakdown.insurance,
      breakdown_fees: breakdown.fees,
      operational_handling: quote.operational_data?.handling_charge,
      operational_insurance: quote.operational_data?.insurance_amount,
      fee_breakdown_preview: feeBreakdownPreview,
    });
  }

  // Key cost components for compact view
  const allComponents = [
    { label: 'Items', amount: breakdown.items_total || 0, color: 'text-blue-600' },
    { label: 'Shipping', amount: breakdown.shipping || 0, color: 'text-green-600' },
    { label: 'Customs', amount: breakdown.customs || 0, color: 'text-purple-600' },
    { label: 'Taxes', amount: totalTaxes, color: 'text-orange-600' },
    {
      label: feeBreakdown.compactDisplay.label,
      amount: feeBreakdown.compactDisplay.total,
      color: 'text-gray-600',
    },
  ];

  const keyComponents = allComponents.filter((component) => component.amount > 0);

  // Compact header view
  const CompactHeader = () => (
    <div className="p-4">
      {}
          {isHSNCalculation && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
              <div className="flex items-center space-x-2">
                <Tags className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  HSN Tax Calculation Active
                </span>
              </div>
              <div className="text-xs text-purple-700 mt-1">
                Customs and taxes calculated using HSN codes for{' '}
                {hsnCalculationData?.total_items || 0} items
              </div>
            </div>
          )}

          {}
          {hasHSNItems &&
            !isHSNCalculation &&
            quote.calculation_method_preference !== 'route_based' &&
            quote.calculation_method_preference !== 'manual' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    HSN codes available but not used
                  </span>
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  Consider switching to HSN calculation method for more accurate taxes
                </div>
              </div>
            )}

          {}
                {quote.calculation_data?.valuation_applied && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <div className="flex justify-between items-center text-xs">
                      <span>Product Total:</span>
                      <span className="font-mono">
                        {currencyDisplay.formatSingleAmount(
                          quote.calculation_data.valuation_applied.original_items_total,
                          'origin'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span>Customs Basis:</span>
                      <span className="font-mono">
                        {currencyDisplay.formatSingleAmount(
                          quote.calculation_data.valuation_applied.customs_calculation_base || 
                          quote.calculation_data.valuation_applied.original_items_total,
                          'origin'
                        )}
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {quote.calculation_data.valuation_applied.basis_explanation || 
                       (quote.calculation_data.valuation_applied.adjustment_applied
                        ? 'Customs calculated on adjusted valuation basis'
                        : 'Customs calculated on actual product value')}
                    </div>
                  </div>
                )}
                
                {hsnCalculationData?.items_with_minimum_valuation &&
                  hsnCalculationData.items_with_minimum_valuation > 0 && (
                    <span className="block mt-1 font-medium">
                      {hsnCalculationData.items_with_minimum_valuation} items using minimum
                      valuation
                    </span>
                  )}
              </div>
            </div>
          )}

          {}
            {(breakdown.taxes || quote.calculation_data?.sales_tax_price) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">Sales Tax</span>
                  <Badge
                    variant="outline"
                    className="text-xs h-4 px-1 text-orange-600 border-orange-300"
                  >
                    Origin
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatSingleAmount(
                      Number(breakdown.taxes || quote.calculation_data?.sales_tax_price || 0),
                      'origin',
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(
                      Number(breakdown.taxes || quote.calculation_data?.sales_tax_price || 0),
                      'destination',
                    )}
                  </div>
                </div>
              </div>
            )}

            {}
            {isHSNCalculation && hsnCalculationData && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Tags className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">HSN Local Taxes</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className="text-xs h-4 px-1 text-purple-600 border-purple-300"
                      >
                        <Tags className="w-3 h-3 mr-1" />
                        HSN
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <p>Calculated using HSN codes</p>
                        <p>
                          Local taxes:{' '}
                          {currencyDisplay.formatSingleAmount(
                            hsnCalculationData.total_hsn_local_taxes,
                            'origin',
                          )}
                        </p>
                        <p>Method: {quote.calculation_method_preference || 'auto'}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatSingleAmount(
                      hsnCalculationData.total_hsn_local_taxes || 0,
                      'origin',
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(
                      hsnCalculationData.total_hsn_local_taxes || 0,
                      'destination',
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Standardized Fee Components */}
            {feeBreakdown.expandedDisplay.map((feeComponent, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  {feeComponent.category === 'service' ? (
                    <Zap className="w-4 h-4 text-orange-600" />
                  ) : (
                    <DollarSign className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-gray-700">{feeComponent.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatSingleAmount(feeComponent.amount, 'origin')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(feeComponent.amount, 'destination')}
                  </div>
                </div>
              </div>
            ))}

            {/* Discount */}
            {(breakdown.discount || 0) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <span className="text-gray-700">Discount</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-red-600">
                    -{currencyDisplay.formatSingleAmount(Number(breakdown.discount || 0), 'origin')}
                  </div>
                  <div className="text-xs text-gray-500">
                    -
                    {currencyDisplay.formatSingleAmount(
                      Number(breakdown.discount || 0),
                      'destination',
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span className="text-gray-900">Final Total</span>
                <div className="text-right">
                  <div className="text-blue-600">
                    {currencyDisplay.formatSingleAmount(totalCost, 'origin')}
                  </div>
                  {isDualCurrency && (
                    <div className="text-sm text-gray-500 font-normal">
                      ≈ {currencyDisplay.formatSingleAmount(totalCost)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="p-4 pt-3 space-y-3">
          {/* Smart Insights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Shipping Cost</div>
              <div className="text-lg font-bold text-green-600">
                {currencyDisplay.formatSingleAmount(Number(breakdown.shipping || 0), 'destination')}
              </div>
              <div className="text-xs text-gray-500">
                {currencyDisplay.formatSingleAmount(Number(breakdown.shipping || 0), 'origin')}
              </div>
            </div>
            <div className="text-center bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Optimization Score</div>
              <div className="text-2xl font-bold text-blue-600">
                {quote.optimization_score?.toFixed(0) || '0'}%
              </div>
              <div className="text-xs text-gray-500">efficiency</div>
            </div>
          </div>

          {/* Cost Analysis */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Cost Analysis</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Item cost ratio:</span>
                <span className="font-medium">{getPercentage(breakdown.items_total || 0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping efficiency:</span>
                <span
                  className={`font-medium ${
                    parseFloat(getPercentage(breakdown.shipping || 0)) < 20
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}
                >
                  {parseFloat(getPercentage(breakdown.shipping || 0)) < 20 ? 'Excellent' : 'High'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total overhead:</span>
                <span className="font-medium">
                  {getPercentage(totalCost - (breakdown.items_total || 0))}%
                </span>
              </div>
            </div>
          </div>

          {/* Smart Recommendations */}
          {quote.operational_data?.customs?.smart_tier && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center text-sm text-blue-800 mb-1">
                <Zap className="w-3 h-3 mr-1" />
                <span className="font-medium">Smart Optimization Applied</span>
              </div>
              <div className="text-xs text-blue-700">
                Customs rate optimized using AI:{' '}
                {quote.operational_data?.customs?.smart_tier?.tier_name || 'Default tier'}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <TooltipProvider>
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CompactHeader />
        {isExpanded && <ExpandedDetails />}
      </Card>
    </TooltipProvider>
  );
};
