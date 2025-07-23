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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UnifiedQuote, ShippingOption } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';

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

  const breakdown = React.useMemo(() => {
    console.log('🔄 [CompactCalculationBreakdown] Breakdown data changed:', {
      quoteId: quote.id,
      newBreakdown: quote.calculation_data?.breakdown,
      hasShipping: !!quote.calculation_data?.breakdown?.shipping,
      shippingAmount: quote.calculation_data?.breakdown?.shipping,
      timestamp: new Date().toISOString()
    });
    return quote.calculation_data?.breakdown || {};
  }, [quote.calculation_data]);
  
  const exchangeRate = currencyDisplay.exchangeRate;
  const totalCost = quote.final_total_usd || 0;

  // 🔍 DEBUG: Log breakdown data to trace destination_tax issue
  console.log('🔍 [CompactCalculationBreakdown] DEBUG:', {
    quoteId: quote.id,
    hasCalculationData: !!quote.calculation_data,
    hasBreakdown: !!quote.calculation_data?.breakdown,
    breakdown: breakdown,
    destination_tax: breakdown.destination_tax,
    destination_tax_type: typeof breakdown.destination_tax,
    destination_tax_number: Number(breakdown.destination_tax),
    destination_tax_condition: !!(breakdown.destination_tax && Number(breakdown.destination_tax) > 0),
  });

  // Calculate percentages for insights
  const getPercentage = (amount: number) => ((amount / totalCost) * 100).toFixed(1);

  // Get selected shipping option details
  const selectedShippingOption = shippingOptions.find(
    (opt) => opt.id === quote.operational_data?.shipping?.selected_option,
  );

  // Debug logging for breakdown component (removed for production)

  // Helper functions for shipping breakdown calculations
  const getTotalWeight = () => {
    return quote.items?.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0) || 0;
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
      note: 'Based on route configuration and selected carrier'
    };
  };

  // ✅ REMOVED: Misleading estimate functions replaced with actual data display

  // Key cost components for compact view
  const totalFees = (breakdown.fees || 0) + (breakdown.handling || 0) + (breakdown.insurance || 0);
  
  // ✅ TRANSPARENT TAX MODEL: Include both purchase tax and destination tax
  const totalTaxes = (breakdown.purchase_tax || 0) + (breakdown.destination_tax || 0) + 
                     // Fallback to legacy taxes field if new fields don't exist
                     (!breakdown.purchase_tax && !breakdown.destination_tax ? (breakdown.taxes || 0) : 0);
  
  const allComponents = [
    { label: 'Items', amount: breakdown.items_total || 0, color: 'text-blue-600' },
    { label: 'Shipping', amount: breakdown.shipping || 0, color: 'text-green-600' },
    { label: 'Customs', amount: breakdown.customs || 0, color: 'text-purple-600' },
    { label: 'Taxes', amount: totalTaxes, color: 'text-orange-600' },
    { label: 'Fees', amount: totalFees, color: 'text-gray-600' },
  ];
  
  const keyComponents = allComponents.filter(component => component.amount > 0);

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
          <span className="text-lg font-bold text-blue-600">{currencyDisplay.formatSingleAmount(totalCost, 'origin')}</span>
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
      <div className={`grid gap-2 text-xs ${keyComponents.length <= 2 ? 'grid-cols-2' : keyComponents.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {keyComponents.map((component, index) => (
          <div key={index} className="text-center">
            <div className={`font-semibold ${component.color}`}>{currencyDisplay.formatSingleAmount(component.amount, 'origin')}</div>
            <div className="text-gray-500 text-xs">{component.label}</div>
            <div className="text-gray-400 text-xs">{currencyDisplay.formatSingleAmount(component.amount, 'destination')}</div>
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
                <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.items_total || 0), 'origin')}</div>
                <div className="text-xs text-gray-500">
                  {currencyDisplay.formatSingleAmount(Number(breakdown.items_total || 0), 'destination')}
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
                  <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.shipping || 0), 'origin')}</div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(Number(breakdown.shipping || 0), 'destination')}
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
                {quote.operational_data?.customs?.smart_tier && (
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    Smart
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.customs || 0), 'origin')}</div>
                <div className="text-xs text-gray-500">
                  {currencyDisplay.formatSingleAmount(Number(breakdown.customs || 0), 'destination')}
                </div>
              </div>
            </div>

            {/* Purchase Tax (Transparent Tax Model) */}
            {!!(breakdown.purchase_tax && Number(breakdown.purchase_tax) > 0) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">Purchase Tax</span>
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    Origin
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.purchase_tax || 0), 'origin')}</div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(Number(breakdown.purchase_tax || 0), 'destination')}
                  </div>
                </div>
              </div>
            )}

            {/* Destination Tax (VAT/GST) - New Transparent Model */}
            {!!(breakdown.destination_tax && Number(breakdown.destination_tax) > 0) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">Destination Tax (VAT)</span>
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    Local
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.destination_tax || 0), 'origin')}</div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(Number(breakdown.destination_tax || 0), 'destination')}
                  </div>
                </div>
              </div>
            )}

            {/* Legacy Taxes (Backward Compatibility) - Only show if new fields don't exist */}
            {!!(breakdown.taxes && Number(breakdown.taxes) > 0 && !breakdown.purchase_tax && !breakdown.destination_tax) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">Taxes & VAT</span>
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    Legacy
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.taxes || 0), 'origin')}</div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(Number(breakdown.taxes || 0), 'destination')}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Gateway Fee */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">Payment Gateway Fee</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.fees || 0), 'origin')}</div>
                <div className="text-xs text-gray-500">
                  {currencyDisplay.formatSingleAmount(Number(breakdown.fees || 0), 'destination')}
                </div>
              </div>
            </div>

            {/* Handling Charge (if separate) */}
            {!!(breakdown.handling && Number(breakdown.handling) > 0) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">Handling Charge</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.handling || 0), 'origin')}</div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(Number(breakdown.handling || 0), 'destination')}
                  </div>
                </div>
              </div>
            )}

            {/* Insurance (if separate) */}
            {!!(breakdown.insurance && Number(breakdown.insurance) > 0) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">Package Protection</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.insurance || 0), 'origin')}</div>
                  <div className="text-xs text-gray-500">
                    {currencyDisplay.formatSingleAmount(Number(breakdown.insurance || 0), 'destination')}
                  </div>
                </div>
              </div>
            )}

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
                    -{currencyDisplay.formatSingleAmount(Number(breakdown.discount || 0), 'destination')}
                  </div>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span className="text-gray-900">Final Total</span>
                <div className="text-right">
                  <div className="text-blue-600">{currencyDisplay.formatSingleAmount(totalCost, 'origin')}</div>
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
    <Card className="shadow-sm border-gray-200 overflow-hidden">
      <CompactHeader />
      {isExpanded && <ExpandedDetails />}
    </Card>
  );
};
