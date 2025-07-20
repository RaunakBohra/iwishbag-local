// ============================================================================
// SMART CALCULATION BREAKDOWN - Enhanced Cost Display with Optimizations
// Features: Real-time calculations, smart insights, optimization suggestions
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Info,
  ExternalLink,
  Zap
} from 'lucide-react';
import type { UnifiedQuote, ShippingOption } from '@/types/unified-quote';

interface SmartCalculationBreakdownProps {
  quote: UnifiedQuote;
  shippingOptions: ShippingOption[];
  isCalculating: boolean;
}

export const SmartCalculationBreakdown: React.FC<SmartCalculationBreakdownProps> = ({
  quote,
  shippingOptions,
  isCalculating,
}) => {
  const breakdown = quote.calculation_data.breakdown;
  const exchangeRate = quote.calculation_data.exchange_rate;
  
  // Calculate percentages for insights
  const totalCost = quote.final_total_usd;
  const getPercentage = (amount: number) => ((amount / totalCost) * 100).toFixed(1);
  
  // Get selected shipping option details
  const selectedShippingOption = shippingOptions.find(
    opt => opt.id === quote.operational_data.shipping.selected_option
  );

  // Breakdown items with smart insights
  const breakdownItems = [
    {
      label: 'Items Total',
      amount: breakdown.items_total,
      percentage: getPercentage(breakdown.items_total),
      icon: <DollarSign className="w-4 h-4" />,
      color: 'text-blue-600',
      insight: `${quote.items.length} items`,
    },
    {
      label: 'International Shipping',
      amount: breakdown.shipping,
      percentage: getPercentage(breakdown.shipping),
      icon: <ExternalLink className="w-4 h-4" />,
      color: 'text-green-600',
      insight: selectedShippingOption 
        ? `${selectedShippingOption.carrier} ${selectedShippingOption.name}` 
        : 'Standard shipping',
    },
    {
      label: 'Customs & Duties',
      amount: breakdown.customs,
      percentage: getPercentage(breakdown.customs),
      icon: <Info className="w-4 h-4" />,
      color: 'text-purple-600',
      insight: 'Customs duty applied',
    },
    {
      label: 'Taxes & VAT',
      amount: breakdown.taxes,
      percentage: getPercentage(breakdown.taxes),
      icon: <Calculator className="w-4 h-4" />,
      color: 'text-orange-600',
      insight: 'Local taxes applied',
    },
    {
      label: 'Processing Fees',
      amount: breakdown.fees,
      percentage: getPercentage(breakdown.fees),
      icon: <Zap className="w-4 h-4" />,
      color: 'text-gray-600',
      insight: 'Handling + Gateway + Insurance',
    },
  ];

  if (breakdown.discount > 0) {
    breakdownItems.push({
      label: 'Discount',
      amount: -breakdown.discount,
      percentage: getPercentage(breakdown.discount),
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-red-600',
      insight: 'Applied discount',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Cost Breakdown
          </div>
          {isCalculating && (
            <Badge variant="secondary" className="animate-pulse">
              Calculating...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exchange Rate Info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Exchange Rate</span>
            <Badge variant="outline" className="text-xs">
              {exchangeRate.source === 'shipping_route' ? 'Route-specific' : 'Standard'}
            </Badge>
          </div>
          <div className="text-sm font-medium">
            1 USD = {exchangeRate.rate.toFixed(4)} {quote.currency}
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="space-y-3">
          {breakdownItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`${item.color}`}>
                  {item.icon}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.insight}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {item.amount < 0 ? '-' : ''}${Math.abs(item.amount).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">{item.percentage}%</div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between py-2">
          <div className="text-lg font-semibold text-gray-900">Final Total</div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              ${totalCost.toFixed(2)}
            </div>
            {quote.currency !== 'USD' && (
              <div className="text-sm text-gray-500">
                ≈ {(totalCost * exchangeRate.rate).toFixed(2)} {quote.currency}
              </div>
            )}
          </div>
        </div>

        {/* Smart Insights */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-gray-600">Shipping Cost</div>
            <div className="text-lg font-semibold text-green-600">
              {getPercentage(breakdown.shipping)}%
            </div>
            <div className="text-xs text-gray-500">of total</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Optimization Score</div>
            <div className="text-lg font-semibold text-blue-600">
              {quote.optimization_score.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">efficiency</div>
          </div>
        </div>

        {/* Alternative Options Preview */}
        {shippingOptions.length > 1 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">
              Alternative Options Available
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-blue-600">Cheapest: </span>
                <span className="font-medium">
                  ${Math.min(...shippingOptions.map(o => o.cost_usd)).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-blue-600">Fastest: </span>
                <span className="font-medium">
                  {Math.min(...shippingOptions.map(o => parseInt(o.days.split('-')[0])))} days
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};