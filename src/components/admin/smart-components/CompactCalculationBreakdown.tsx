// ============================================================================
// COMPACT CALCULATION BREAKDOWN - World-Class E-commerce Admin Layout
// Fixed for Origin Currency System - Simplified Structure
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
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency } from '@/utils/originCurrency';

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

  // Get standardized currency display info using new hook
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
  
  // Use origin currency system for total cost
  const totalCost = quote.total_origin_currency || quote.origin_total_amount || quote.final_total_usd || 0;

  // Check HSN calculation data
  const hsnCalculationData = quote.calculation_data?.hsn_calculation || null;
  const isHSNCalculation = quote.calculation_method_preference === 'hsn_only';
  const hasHSNItems = quote.items?.some((item: any) => item.hsn_code) || false;

  // Helper functions for shipping breakdown calculations
  const getTotalWeight = () => {
    return quote.items?.reduce((sum, item) => sum + item.weight * item.quantity, 0) || 0;
  };

  const getTotalValue = () => {
    return quote.items?.reduce((sum, item) => sum + item.costprice_origin * item.quantity, 0) || 0;
  };

  // Show actual calculated shipping cost instead of estimates
  const getActualShippingCost = () => {
    return breakdown.shipping || 0;
  };

  const getShippingDisplayInfo = () => {
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
    hsnCalculationData,
  });

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
      {/* HSN Calculation Status */}
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

      {/* HSN Available but Not Used Warning */}
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

      {/* Main Total Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calculator className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Total Cost</h3>
            <p className="text-sm text-gray-600">
              {isDualCurrency ? 'Origin → Destination' : 'Single Currency'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {currencyDisplay.formatOriginAmount(totalCost)}
          </div>
          {isDualCurrency && (
            <div className="text-sm text-gray-600">
              ≈ {currencyDisplay.formatDestinationAmount(totalCost)}
            </div>
          )}
        </div>
      </div>

      {/* Quick Component Overview */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {keyComponents.slice(0, 4).map((component, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className={`text-sm font-medium ${component.color}`}>
              {component.label}
            </span>
            <span className="text-sm font-mono">
              {currencyDisplay.formatOriginAmount(component.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-2" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            Show Details
          </>
        )}
      </Button>
    </div>
  );

  // Expanded details view
  const ExpandedDetails = () => (
    <div className="border-t">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="breakdown" className="p-4 pt-3 space-y-3">
          {/* Detailed Breakdown */}
          <div className="space-y-3">
            {/* Items */}
            {(breakdown.items_total || 0) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">Items Subtotal</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatOriginAmount(breakdown.items_total || 0)}
                  </div>
                  {isDualCurrency && (
                    <div className="text-xs text-gray-500">
                      {currencyDisplay.formatDestinationAmount(breakdown.items_total || 0)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shipping */}
            {(breakdown.shipping || 0) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Shipping</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatOriginAmount(breakdown.shipping || 0)}
                  </div>
                  {isDualCurrency && (
                    <div className="text-xs text-gray-500">
                      {currencyDisplay.formatDestinationAmount(breakdown.shipping || 0)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Customs */}
            {(breakdown.customs || 0) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">Customs Duty</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatOriginAmount(breakdown.customs || 0)}
                  </div>
                  {isDualCurrency && (
                    <div className="text-xs text-gray-500">
                      {currencyDisplay.formatDestinationAmount(breakdown.customs || 0)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sales Tax */}
            {(breakdown.taxes || quote.calculation_data?.sales_tax_price) && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">Sales Tax</span>
                  <Badge variant="outline" className="text-xs h-4 px-1 text-orange-600 border-orange-300">
                    Origin
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatOriginAmount(
                      Number(breakdown.taxes || quote.calculation_data?.sales_tax_price || 0)
                    )}
                  </div>
                  {isDualCurrency && (
                    <div className="text-xs text-gray-500">
                      {currencyDisplay.formatDestinationAmount(
                        Number(breakdown.taxes || quote.calculation_data?.sales_tax_price || 0)
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HSN Local Taxes */}
            {isHSNCalculation && hsnCalculationData && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Tags className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">HSN Local Taxes</span>
                  <Badge variant="outline" className="text-xs h-4 px-1 text-purple-600 border-purple-300">
                    <Tags className="w-3 h-3 mr-1" />
                    HSN
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {currencyDisplay.formatOriginAmount(hsnCalculationData.total_hsn_local_taxes || 0)}
                  </div>
                  {isDualCurrency && (
                    <div className="text-xs text-gray-500">
                      {currencyDisplay.formatDestinationAmount(hsnCalculationData.total_hsn_local_taxes || 0)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fees */}
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
                    {currencyDisplay.formatOriginAmount(feeComponent.amount)}
                  </div>
                  {isDualCurrency && (
                    <div className="text-xs text-gray-500">
                      {currencyDisplay.formatDestinationAmount(feeComponent.amount)}
                    </div>
                  )}
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
                    -{currencyDisplay.formatOriginAmount(Number(breakdown.discount || 0))}
                  </div>
                  {isDualCurrency && (
                    <div className="text-xs text-gray-500">
                      -{currencyDisplay.formatDestinationAmount(Number(breakdown.discount || 0))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Final Total</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {currencyDisplay.formatOriginAmount(totalCost)}
                  </div>
                  {isDualCurrency && (
                    <div className="text-sm text-gray-600">
                      ≈ {currencyDisplay.formatDestinationAmount(totalCost)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="p-4 pt-3 space-y-3">
          {/* Smart Insights */}
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Cost Analysis</span>
              </div>
              <div className="text-xs text-blue-700">
                <p>• Items make up {Math.round(((breakdown.items_total || 0) / totalCost) * 100)}% of total cost</p>
                <p>• Total weight: {getTotalWeight().toFixed(2)}kg</p>
                <p>• Method: {quote.calculation_method_preference || 'auto'}</p>
              </div>
            </div>

            {isHSNCalculation && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Tags className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">HSN Classification</span>
                </div>
                <div className="text-xs text-purple-700">
                  <p>• Using HSN codes for tax calculation</p>
                  <p>• {hsnCalculationData?.total_items || 0} items classified</p>
                  {hsnCalculationData?.items_with_minimum_valuation && (
                    <p>• {hsnCalculationData.items_with_minimum_valuation} items using minimum valuation</p>
                  )}
                </div>
              </div>
            )}
          </div>
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