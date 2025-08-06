/**
 * Tax Debug Header Section
 * Handles the collapsible header and basic information display
 * Extracted from TaxCalculationDebugPanel for better maintainability
 */

import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface TaxDebugHeaderSectionProps {
  quote: UnifiedQuote;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isLoadingLiveData?: boolean;
  className?: string;
}

export const TaxDebugHeaderSection: React.FC<TaxDebugHeaderSectionProps> = ({
  quote,
  isExpanded,
  onToggleExpanded,
  isLoadingLiveData = false,
  className = '',
}) => {
  const breakdown = quote.calculation_data?.breakdown || {};
  const exchangeRate = typeof quote.calculation_data?.exchange_rate === 'number' 
    ? quote.calculation_data.exchange_rate 
    : parseFloat(quote.calculation_data?.exchange_rate?.toString() || '1') || 1;

  const totalTax = breakdown.customs || 0;
  const totalAmount = quote.final_total_usd || 0;

  if (!isExpanded) {
    return (
      <Card className={`border-orange-200 bg-orange-50 ${className}`}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span>Tax Calculation Debug Panel</span>
              <Badge variant="outline" className="text-xs">
                {quote.tax_method || 'Unknown'} Method
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
            >
              <ChevronDown className="w-4 h-4" />
              Show Debug Info
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="w-5 h-5 text-orange-600" />
          <span>Tax Calculation Debug Panel</span>
          <Badge variant="outline" className="text-xs">
            {quote.tax_method || 'Unknown'} Method
          </Badge>
          {isLoadingLiveData && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Loading Live Data...
            </Badge>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
        >
          <ChevronUp className="w-4 h-4" />
          Hide Debug Info
        </Button>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Origin Country</span>
            <Badge variant="outline" className="text-xs">
              {quote.origin_country || 'Unknown'}
            </Badge>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Destination Country</span>
            <Badge variant="outline" className="text-xs">
              {quote.destination_country || 'Unknown'}
            </Badge>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Exchange Rate</span>
            <span className="font-mono text-sm">
              {exchangeRate.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Total Tax</span>
            <span className="font-mono text-sm font-semibold text-orange-600">
              ${totalTax.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Items Summary */}
      {quote.items && quote.items.length > 0 && (
        <div className="mt-4 bg-white rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Items Overview</span>
            <Badge variant="secondary" className="text-xs">
              {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Weight:</span>
              <span className="font-mono ml-2">
                {quote.items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0).toFixed(2)}kg
              </span>
            </div>
            <div>
              <span className="text-gray-600">Items Total:</span>
              <span className="font-mono ml-2">
                ${quote.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Final Total:</span>
              <span className="font-mono ml-2 font-semibold">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tax Method Information */}
      {quote.tax_method && (
        <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-900">
                Tax Method: {quote.tax_method}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {quote.tax_method === 'route_tier' && 'Using route-based tier taxation system'}
                {quote.tax_method === 'hsn_based' && 'Using HSN code-based taxation system'}
                {quote.tax_method === 'fixed' && 'Using fixed percentage taxation'}
                {!['route_tier', 'hsn_based', 'fixed'].includes(quote.tax_method) && 'Custom taxation method applied'}
              </div>
            </div>
          </div>
        </div>
      )}
    </CardHeader>
  );
};