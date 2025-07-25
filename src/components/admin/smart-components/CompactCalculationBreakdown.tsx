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

  // Check if HSN calculation was used
  const isHSNCalculation = quote.calculation_data?.hsn_calculation?.method === 'per_item_hsn';
  const hsnCalculationData = quote.calculation_data?.hsn_calculation;
  const hasHSNItems = quote.items?.some((item) => item.hsn_code) || false;

  // Calculate percentages for insights
  const getPercentage = (amount: number) => ((amount / totalCost) * 100).toFixed(1);

  // Get selected shipping option details
  const selectedShippingOption = shippingOptions.find(
    (opt) => opt.id === quote.operational_data?.shipping?.selected_option,
  );

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
    isHSNCalculation,
    hsnCalculationData,
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
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900 text-sm">Cost Breakdown</span>
          {isCalculating && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Calculating...
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-lg font-bold text-blue-600">
            {currencyDisplay.formatSingleAmount(totalCost, 'origin')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Compact Cost Grid */}
      <div
        className={`grid gap-2 text-xs ${keyComponents.length <= 2 ? 'grid-cols-2' : keyComponents.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}
      >
        {keyComponents.map((component, index) => (
          <div key={index} className="text-center">
            <div className={`font-semibold ${component.color}`}>
              {currencyDisplay.formatSingleAmount(component.amount, 'origin')}
            </div>
            <div className="text-gray-500 text-xs">{component.label}</div>
            <div className="text-gray-400 text-xs">
              {currencyDisplay.formatSingleAmount(component.amount, 'destination')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Expandable detail tabs
  const ExpandedDetails = () => (
    <div className="border-t border-gray-100">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full h-8 text-xs grid-cols-2">
          <TabsTrigger value="breakdown" className="text-xs">
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="p-4 pt-3 space-y-3">
          {/* HSN Calculation Indicator */}
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

          {/* Warning if HSN items exist but calculation didn't use HSN */}
          {hasHSNItems &&
            !isHSNCalculation &&
            quote.calculation_method_preference !== 'country_based' &&
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

          {/* Valuation Method Indicator */}
          {quote.valuation_method_preference && (
            <div
              className={`rounded-lg p-3 mb-3 ${
                quote.valuation_method_preference === 'minimum_valuation'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calculator
                  className={`w-4 h-4 ${
                    quote.valuation_method_preference === 'minimum_valuation'
                      ? 'text-amber-600'
                      : 'text-blue-600'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    quote.valuation_method_preference === 'minimum_valuation'
                      ? 'text-amber-800'
                      : 'text-blue-800'
                  }`}
                >
                  {quote.valuation_method_preference === 'minimum_valuation'
                    ? 'Minimum Valuation Method'
                    : 'Product Value Method'}
                </span>
              </div>
              <div
                className={`text-xs mt-1 ${
                  quote.valuation_method_preference === 'minimum_valuation'
                    ? 'text-amber-700'
                    : 'text-blue-700'
                }`}
              >
                {quote.valuation_method_preference === 'minimum_valuation'
                  ? 'Using higher of minimum customs valuation vs actual product cost'
                  : 'Using actual product cost for customs calculation basis'}
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

          {/* Detailed Breakdown */}
          <div className="space-y-3">
            {/* Items Total */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Items Total</span>
                <Badge variant="outline" className="text-xs h-4 px-1">
                  {quote.items?.length || 0} items
                </Badge>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {currencyDisplay.formatSingleAmount(Number(breakdown.items_total || 0), 'origin')}
                </div>
                <div className="text-xs text-gray-500">
                  {currencyDisplay.formatSingleAmount(
                    Number(breakdown.items_total || 0),
                    'destination',
                  )}
                </div>
              </div>
            </div>

            {/* Shipping - Enhanced with Detailed Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">International Shipping</span>
                  {selectedShippingOption?.carrier && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      {selectedShippingOption.carrier}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatSingleAmount(Number(breakdown.shipping || 0), 'origin')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(
                      Number(breakdown.shipping || 0),
                      'destination',
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Calculation Breakdown - FIXED: Show actual data */}
            </div>

            {/* Customs & Duties */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">Customs & Duties</span>
                {isHSNCalculation ? (
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
                        {hsnCalculationData && (
                          <>
                            <p>{hsnCalculationData.total_items} items with HSN</p>
                            <p>
                              Total:{' '}
                              {currencyDisplay.formatSingleAmount(
                                hsnCalculationData.total_hsn_customs,
                                'origin',
                              )}
                            </p>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : quote.operational_data?.customs?.smart_tier ? (
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    Smart
                  </Badge>
                ) : null}
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {currencyDisplay.formatSingleAmount(Number(breakdown.customs || 0), 'origin')}
                </div>
                <div className="text-xs text-gray-500">
                  {currencyDisplay.formatSingleAmount(
                    Number(breakdown.customs || 0),
                    'destination',
                  )}
                </div>
              </div>
            </div>

            {/* Sales Tax (Local/Origin) */}
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

            {/* Destination Tax (VAT/GST) */}
            {breakdown.destination_tax && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Destination Tax</span>
                  <Badge
                    variant="outline"
                    className="text-xs h-4 px-1 text-green-600 border-green-300"
                  >
                    VAT/GST
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatSingleAmount(
                      Number(breakdown.destination_tax),
                      'origin',
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(
                      Number(breakdown.destination_tax),
                      'destination',
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Legacy Combined Taxes (for HSN calculations) */}
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
