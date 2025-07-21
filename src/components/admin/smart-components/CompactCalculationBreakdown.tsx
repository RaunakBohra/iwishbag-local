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

  // Reset active tab to breakdown if Exchange tab is not available
  React.useEffect(() => {
    if (activeTab === 'exchange' && quote.currency === 'USD') {
      setActiveTab('breakdown');
    }
  }, [activeTab, quote.currency]);

  const breakdown = quote.calculation_data?.breakdown || {};
  const exchangeRate = quote.calculation_data?.exchange_rate || { rate: 1, source: 'standard' };
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

  // Estimate shipping breakdown based on common patterns
  const getShippingBaseRate = (option: ShippingOption) => {
    // For database routes, this would typically be base_shipping_cost
    // For now, estimate based on total shipping cost and weight
    const totalShipping = breakdown.shipping || 0;
    const weight = getTotalWeight();
    const perKgRate = getShippingPerKgRate(option);
    const weightCost = weight * perKgRate;
    return Math.max(0, totalShipping - weightCost - getShippingValueCost(option));
  };

  const getShippingPerKgRate = (option: ShippingOption) => {
    // Standard rate estimation based on carrier type
    const rateMap: Record<string, number> = {
      DHL: 8.5,
      FedEx: 9.0,
      UPS: 7.5,
      Standard: 5.0,
      Express: 7.0,
      Economy: 4.0,
    };
    return rateMap[option?.carrier] || 6.0;
  };

  const getShippingWeightCost = (option: ShippingOption) => {
    return getTotalWeight() * getShippingPerKgRate(option);
  };

  const getShippingValueCost = (option: ShippingOption) => {
    // Some carriers charge a percentage of item value
    const valuePercentage = getShippingValuePercentage(option);
    return (getTotalValue() * valuePercentage) / 100;
  };

  const getShippingValuePercentage = (option: ShippingOption) => {
    // Express carriers sometimes charge value-based fees
    if (option?.carrier === 'DHL' || option?.carrier === 'FedEx') {
      return 0.5; // 0.5% of value
    }
    return 0;
  };

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
          <span className="text-lg font-bold text-blue-600">${totalCost.toFixed(2)}</span>
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
            <div className={`font-semibold ${component.color}`}>${component.amount.toFixed(0)}</div>
            <div className="text-gray-500 text-xs">{component.label}</div>
            <div className="text-gray-400 text-xs">{getPercentage(component.amount)}%</div>
          </div>
        ))}
      </div>

      {/* Exchange Rate (if not USD) */}
      {quote.currency !== 'USD' && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
          <span>Exchange Rate:</span>
          <div className="flex items-center space-x-1">
            <span>
              1 USD = {exchangeRate.rate.toFixed(4)} {quote.currency}
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
          className={`grid w-full h-8 text-xs ${quote.currency === 'USD' ? 'grid-cols-2' : 'grid-cols-3'}`}
        >
          <TabsTrigger value="breakdown" className="text-xs">
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">
            Insights
          </TabsTrigger>
          {quote.currency !== 'USD' && (
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
                <div className="font-medium">${Number(breakdown.items_total || 0).toFixed(2)}</div>
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
                  <div className="font-medium">${Number(breakdown.shipping || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">
                    {getPercentage(Number(breakdown.shipping || 0))}%
                  </div>
                </div>
              </div>

              {/* Shipping Calculation Breakdown */}
              {selectedShippingOption?.carrier && (
                <div className="ml-6 space-y-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-700 mb-2">Shipping Rate Calculation:</div>
                  <div className="flex justify-between">
                    <span>• Base Rate:</span>
                    <span>${getShippingBaseRate(selectedShippingOption).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      • Weight ({getTotalWeight()}kg × $
                      {getShippingPerKgRate(selectedShippingOption).toFixed(2)}/kg):
                    </span>
                    <span>${getShippingWeightCost(selectedShippingOption).toFixed(2)}</span>
                  </div>
                  {getShippingValueCost(selectedShippingOption) > 0 && (
                    <div className="flex justify-between">
                      <span>
                        • Value-based ({getShippingValuePercentage(selectedShippingOption)}%):
                      </span>
                      <span>${getShippingValueCost(selectedShippingOption).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-gray-800 border-t border-gray-200 pt-1 mt-1">
                    <span>Total Shipping:</span>
                    <span>${Number(breakdown.shipping || 0).toFixed(2)}</span>
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
                <div className="font-medium">${Number(breakdown.customs || 0).toFixed(2)}</div>
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
                <div className="font-medium">${Number(breakdown.taxes || 0).toFixed(2)}</div>
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
                <div className="font-medium">${Number(breakdown.fees || 0).toFixed(2)}</div>
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
                    -${Number(breakdown.discount || 0).toFixed(2)}
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
                  <div className="text-blue-600">${totalCost.toFixed(2)}</div>
                  {quote.currency !== 'USD' && (
                    <div className="text-sm text-gray-500 font-normal">
                      ≈ {(totalCost * exchangeRate.rate).toFixed(2)} {quote.currency}
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

        {quote.currency !== 'USD' && (
          <TabsContent value="exchange" className="p-4 pt-3 space-y-3">
            {/* Currency Conversion Calculator */}
            <div className="space-y-3">
              {/* Main Conversion Display */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Total Amount Conversion</div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">${totalCost.toFixed(2)}</div>
                      <div className="text-xs text-gray-600">USD (Base)</div>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {(totalCost * exchangeRate.rate).toFixed(2)} {quote.currency}
                      </div>
                      <div className="text-xs text-gray-600">Customer Currency</div>
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
                        {((breakdown.items_total || 0) * exchangeRate.rate).toFixed(2)}{' '}
                        {quote.currency}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${Number(breakdown.items_total || 0).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping Total:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {((breakdown.shipping || 0) * exchangeRate.rate).toFixed(2)}{' '}
                        {quote.currency}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${Number(breakdown.shipping || 0).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customs & Duties:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {((breakdown.customs || 0) * exchangeRate.rate).toFixed(2)} {quote.currency}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${Number(breakdown.customs || 0).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Fees:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {((breakdown.fees || 0) * exchangeRate.rate).toFixed(2)} {quote.currency}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${Number(breakdown.fees || 0).toFixed(2)} USD
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
                      1 USD = {exchangeRate.rate.toFixed(4)} {quote.currency}
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
