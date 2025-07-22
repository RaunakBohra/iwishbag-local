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

  // Reset active tab to breakdown if Exchange tab is not available
  React.useEffect(() => {
    if (activeTab === 'exchange' && !isDualCurrency) {
      setActiveTab('breakdown');
    }
  }, [activeTab, isDualCurrency]);

  const breakdown = quote.calculation_data?.breakdown || {};
  const exchangeRate = currencyDisplay.exchangeRate;
  const totalCost = quote.final_total_usd || 0;

  // Calculate percentages for insights
  const getPercentage = (amount: number) => ((amount / totalCost) * 100).toFixed(1);

  // Get selected shipping option details
  const selectedShippingOption = shippingOptions.find(
    (opt) => opt.id === quote.operational_data?.shipping?.selected_option,
  );

  // Debug logging for breakdown component
  console.log('[DEBUG] CompactCalculationBreakdown render:', {
    quoteId: quote.id,
    breakdownShipping: breakdown.shipping,
    totalWeight: quote.items?.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0) || 0,
    itemWeights: quote.items?.map(item => ({ 
      name: item.name, 
      weight_kg: item.weight_kg, 
      quantity: item.quantity, 
      totalWeight: item.weight_kg * item.quantity 
    })),
    selectedShippingOptionId: quote.operational_data?.shipping?.selected_option,
    selectedShippingOption: selectedShippingOption
      ? {
          id: selectedShippingOption.id,
          carrier: selectedShippingOption.carrier,
          cost: selectedShippingOption.cost_usd,
        }
      : null,
    shippingOptionsAvailable: shippingOptions.map((opt) => ({
      id: opt.id,
      carrier: opt.carrier,
      cost: opt.cost_usd,
    })),
    totalCost: quote.final_total_usd,
    calculationData: quote.calculation_data,
  });

  // Helper functions for shipping breakdown calculations
  const getTotalWeight = () => {
    return quote.items?.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0) || 0;
  };

  const getTotalValue = () => {
    return quote.items?.reduce((sum, item) => sum + item.price_usd * item.quantity, 0) || 0;
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
  const keyComponents = [
    { label: 'Items', amount: breakdown.items_total || 0, color: 'text-blue-600' },
    { label: 'Shipping', amount: breakdown.shipping || 0, color: 'text-green-600' },
    { label: 'Customs', amount: breakdown.customs || 0, color: 'text-purple-600' },
    { label: 'Fees', amount: breakdown.fees || 0, color: 'text-gray-600' },
  ];

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
      <div className="grid grid-cols-4 gap-2 text-xs">
        {keyComponents.map((component, index) => (
          <div key={index} className="text-center">
            <div className={`font-semibold ${component.color}`}>{currencyDisplay.formatSingleAmount(component.amount, 'origin')}</div>
            <div className="text-gray-500 text-xs">{component.label}</div>
            <div className="text-gray-400 text-xs">{getPercentage(component.amount)}%</div>
          </div>
        ))}
      </div>

      {/* Exchange Rate (if not USD) */}
      {isDualCurrency && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
          <span>Exchange Rate:</span>
          <div className="flex items-center space-x-1">
            <span>
              1 {currencyDisplay.originCurrency} = {exchangeRate.toFixed(4)} {currencyDisplay.destinationCurrency}
            </span>
            <Badge variant="outline" className="text-xs h-4 px-1">
              {exchangeRate.source === 'shipping_route' ? 'Route' : 'Standard'}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );

  // Expandable detail tabs
  const ExpandedDetails = () => (
    <div className="border-t border-gray-100">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className={`grid w-full h-8 text-xs ${!isDualCurrency ? 'grid-cols-2' : 'grid-cols-3'}`}
        >
          <TabsTrigger value="breakdown" className="text-xs">
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">
            Insights
          </TabsTrigger>
          {isDualCurrency && (
            <TabsTrigger value="exchange" className="text-xs">
              Exchange
            </TabsTrigger>
          )}
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
                  {getPercentage(Number(breakdown.items_total || 0))}%
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
                    {getPercentage(Number(breakdown.shipping || 0))}%
                  </div>
                </div>
              </div>

              {/* Shipping Calculation Breakdown - FIXED: Show actual data */}
              {selectedShippingOption?.carrier && (
                <div className="ml-6 space-y-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-700 mb-2">Actual Shipping Cost:</div>
                  <div className="flex justify-between">
                    <span>• Carrier:</span>
                    <span>{selectedShippingOption.carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Weight:</span>
                    <span>{getTotalWeight()}kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Service:</span>
                    <span>{selectedShippingOption.name || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-800 border-t border-gray-200 pt-1 mt-1">
                    <span>Total Shipping:</span>
                    <span>{currencyDisplay.formatSingleAmount(Number(breakdown.shipping || 0), 'origin')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ✅ Calculated using route configuration (base + weight tiers + carrier premium)
                  </div>
                </div>
              )}
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
                  {getPercentage(Number(breakdown.customs || 0))}%
                </div>
              </div>
            </div>

            {/* Taxes & VAT */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-orange-600" />
                <span className="text-gray-700">Taxes & VAT</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.taxes || 0), 'origin')}</div>
                <div className="text-xs text-gray-500">
                  {getPercentage(Number(breakdown.taxes || 0))}%
                </div>
              </div>
            </div>

            {/* Processing Fees */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">Processing Fees</span>
                <Badge variant="outline" className="text-xs h-4 px-1">
                  Gateway + Handling
                </Badge>
              </div>
              <div className="text-right">
                <div className="font-medium">{currencyDisplay.formatSingleAmount(Number(breakdown.fees || 0), 'origin')}</div>
                <div className="text-xs text-gray-500">
                  {getPercentage(Number(breakdown.fees || 0))}%
                </div>
              </div>
            </div>

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
                    {getPercentage(Number(breakdown.discount || 0))}%
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
              <div className="text-2xl font-bold text-green-600">
                {getPercentage(breakdown.shipping || 0)}%
              </div>
              <div className="text-xs text-gray-500">of total cost</div>
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

        {isDualCurrency && (
          <TabsContent value="exchange" className="p-4 pt-3 space-y-3">
            {/* Currency Conversion Calculator */}
            <div className="space-y-3">
              {/* Main Conversion Display */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Total Amount Conversion</div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {currencyDisplay.formatSingleAmount(totalCost, 'origin')}
                      </div>
                      <div className="text-xs text-gray-600">{currencyDisplay.originCurrency} (Base)</div>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {currencyDisplay.formatSingleAmount(totalCost, 'destination')}
                      </div>
                      <div className="text-xs text-gray-600">Customer Currency ({currencyDisplay.destinationCurrency})</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Component-wise Conversions */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Detailed Conversions</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items Total:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(breakdown.items_total || 0, 'destination')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {currencyDisplay.formatSingleAmount(breakdown.items_total || 0, 'origin')}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping Total:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(breakdown.shipping || 0, 'destination')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {currencyDisplay.formatSingleAmount(breakdown.shipping || 0, 'origin')}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customs & Duties:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(breakdown.customs || 0, 'destination')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {currencyDisplay.formatSingleAmount(breakdown.customs || 0, 'origin')}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Fees:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(breakdown.fees || 0, 'destination')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {currencyDisplay.formatSingleAmount(breakdown.fees || 0, 'origin')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Source Details */}
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="flex items-center space-x-1 mb-1">
                  <Info className="w-3 h-3" />
                  <span className="font-medium">Exchange Rate Details</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span>
                      1 {currencyDisplay.originCurrency} = {exchangeRate.toFixed(4)} {currencyDisplay.destinationCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span>
                      {exchangeRate.source === 'shipping_route'
                        ? 'Route-specific'
                        : 'Standard market'}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {exchangeRate.source === 'shipping_route'
                      ? 'Using shipping route specific rate for enhanced accuracy on this route'
                      : 'Using standard market exchange rate from our currency service'}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        )}
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
