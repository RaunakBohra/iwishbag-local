// ============================================================================
// TAX CALCULATION DEBUGGER - Debug component for comparing tax methods
// Shows step-by-step calculation values for Manual, HSN, and Country methods
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';

interface TaxCalculationDebuggerProps {
  quote: UnifiedQuote;
  onMethodChange?: (method: 'manual' | 'hsn_only' | 'route_based') => void;
}

export const TaxCalculationDebugger: React.FC<TaxCalculationDebuggerProps> = ({
  quote,
  onMethodChange,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const currencyDisplay = useAdminQuoteCurrency(quote);

  // Calculate basic values
  const itemsTotal = quote.items?.reduce((sum, item) => sum + item.costprice_origin * item.quantity, 0) || 0;
  const totalWeight = quote.items?.reduce((sum, item) => sum + item.weight * item.quantity, 0) || 0;

  // Get operational data values
  const operationalData = quote.operational_data || {};
  const breakdown = quote.calculation_data?.breakdown || {};

  // Form input values (CIF components)
  const shippingCost = breakdown.shipping || 0;
  const insuranceAmount = operationalData.insurance_amount || 0;
  const handlingCharge = operationalData.handling_charge || 0;
  const domesticShipping = operationalData.domestic_shipping || 0;

  // Calculate CIF values
  const cifTotal = itemsTotal + shippingCost + insuranceAmount + handlingCharge;
  const landedCost = cifTotal + (breakdown.customs || 0) + handlingCharge;

  // Get tax rates for each method
  const manualCustomsRate = operationalData.customs?.percentage || 10;
  const smartTierRate = operationalData.customs?.smart_tier?.percentage || 10;
  
  // HSN data if available
  const hsnCalculation = quote.calculation_data?.hsn_calculation;

  // Method-specific calculations
  const calculations = {
    manual: {
      method: 'Manual Input',
      customsRate: manualCustomsRate,
      customsAmount: cifTotal * (manualCustomsRate / 100),
      taxBasis: 'CIF Value',
      description: 'Uses customs rate from admin input box'
    },
    hsn_only: {
      method: 'HSN Classification',
      customsAmount: hsnCalculation?.total_hsn_customs || 0,
      localTaxes: hsnCalculation?.total_hsn_local_taxes || 0,
      taxBasis: 'Per-item HSN codes',
      description: 'Uses HSN-specific rates for each item'
    },
    route_based: {
      method: 'Route Tier',
      customsRate: smartTierRate,
      customsAmount: cifTotal * (smartTierRate / 100),
      taxBasis: 'Country tier system',
      description: 'Uses country-based tier calculation'
    }
  };

  const currentMethod = quote.calculation_method_preference || 'hsn_only';

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-white shadow-lg"
        >
          <Eye className="w-4 h-4 mr-2" />
          Show Tax Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] overflow-y-auto">
      <Card className="shadow-xl border-2 border-blue-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm">Tax Calculation Debugger</CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <EyeOff className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-gray-600">Quote: {quote.id?.slice(-8)}</div>
        </CardHeader>

        <CardContent className="text-xs space-y-3">
          {/* Input Values Section */}
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-medium text-gray-900 mb-1">📝 Form Input Values</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Items Total: <span className="font-mono">{currencyDisplay.formatSingleAmount(itemsTotal, 'origin')}</span></div>
              <div>Total Weight: <span className="font-mono">{totalWeight.toFixed(2)} kg</span></div>
              <div>Shipping: <span className="font-mono">{currencyDisplay.formatSingleAmount(shippingCost, 'origin')}</span></div>
              <div>Insurance: <span className="font-mono">{currencyDisplay.formatSingleAmount(insuranceAmount, 'origin')}</span></div>
              <div>Handling: <span className="font-mono">{currencyDisplay.formatSingleAmount(handlingCharge, 'origin')}</span></div>
              <div>Domestic: <span className="font-mono">{currencyDisplay.formatSingleAmount(domesticShipping, 'origin')}</span></div>
            </div>
          </div>

          {/* CIF Calculation */}
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-medium text-blue-900 mb-1">🚢 CIF Calculation</div>
            <div className="text-xs space-y-1">
              <div>Items + Shipping + Insurance + Handling</div>
              <div className="font-mono">
                {currencyDisplay.formatSingleAmount(itemsTotal, 'origin')} + {currencyDisplay.formatSingleAmount(shippingCost, 'origin')} + {currencyDisplay.formatSingleAmount(insuranceAmount, 'origin')} + {currencyDisplay.formatSingleAmount(handlingCharge, 'origin')}
              </div>
              <div className="font-bold text-blue-700">
                CIF Total: {currencyDisplay.formatSingleAmount(cifTotal, 'origin')}
              </div>
            </div>
          </div>

          {/* Current Method */}
          <div className="bg-green-50 p-2 rounded">
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium text-green-900">✅ Current Method</div>
              <Badge variant="outline" className="text-xs">
                {currentMethod.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="text-xs">
              <div>Final Total: <span className="font-bold">{currencyDisplay.formatSingleAmount(quote.final_total_usd || 0, 'origin')}</span></div>
              <div>Customs: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.customs || 0, 'origin')}</span></div>
              <div>Taxes: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.taxes || 0, 'origin')}</span></div>
            </div>
          </div>

          {/* Method Comparison */}
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-6 text-xs">
              <TabsTrigger value="manual" className="text-xs">Manual</TabsTrigger>
              <TabsTrigger value="hsn" className="text-xs">HSN</TabsTrigger>
              <TabsTrigger value="country" className="text-xs">Country</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-2 space-y-2">
              <div className="bg-orange-50 p-2 rounded">
                <div className="font-medium text-orange-900 mb-1">🔧 Manual Method</div>
                <div className="text-xs space-y-1">
                  <div>Source: Admin input box</div>
                  <div>Customs Rate: <span className="font-mono">{calculations.manual.customsRate}%</span></div>
                  <div>CIF Basis: <span className="font-mono">{currencyDisplay.formatSingleAmount(cifTotal, 'origin')}</span></div>
                  <div>Customs Amount: <span className="font-mono">{currencyDisplay.formatSingleAmount(calculations.manual.customsAmount, 'origin')}</span></div>
                  <div className="text-xs text-orange-700 mt-1">{calculations.manual.description}</div>
                </div>
                {onMethodChange && (
                  <Button
                    size="sm"
                    variant={currentMethod === 'manual' ? 'default' : 'outline'}
                    onClick={() => onMethodChange('manual')}
                    className="w-full mt-2 h-6 text-xs"
                  >
                    {currentMethod === 'manual' ? 'Active' : 'Switch to Manual'}
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="hsn" className="mt-2 space-y-2">
              <div className="bg-purple-50 p-2 rounded">
                <div className="font-medium text-purple-900 mb-1">🏷️ HSN Method</div>
                <div className="text-xs space-y-1">
                  <div>Source: HSN classification codes</div>
                  <div>Items with HSN: <span className="font-mono">{quote.items?.filter(item => item.hsn_code).length || 0}</span></div>
                  <div>Customs Total: <span className="font-mono">{currencyDisplay.formatSingleAmount(calculations.hsn_only.customsAmount, 'origin')}</span></div>
                  <div>Local Taxes: <span className="font-mono">{currencyDisplay.formatSingleAmount(calculations.hsn_only.localTaxes, 'origin')}</span></div>
                  <div className="text-xs text-purple-700 mt-1">{calculations.hsn_only.description}</div>
                </div>
                {onMethodChange && (
                  <Button
                    size="sm"
                    variant={currentMethod === 'hsn_only' ? 'default' : 'outline'}
                    onClick={() => onMethodChange('hsn_only')}
                    className="w-full mt-2 h-6 text-xs"
                  >
                    {currentMethod === 'hsn_only' ? 'Active' : 'Switch to HSN'}
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="country" className="mt-2 space-y-2">
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-900 mb-1">🌍 Country Method</div>
                <div className="text-xs space-y-1">
                  <div>Source: Country tier system</div>
                  <div>Tier Rate: <span className="font-mono">{calculations.route_based.customsRate}%</span></div>
                  <div>CIF Basis: <span className="font-mono">{currencyDisplay.formatSingleAmount(cifTotal, 'origin')}</span></div>
                  <div>Customs Amount: <span className="font-mono">{currencyDisplay.formatSingleAmount(calculations.route_based.customsAmount, 'origin')}</span></div>
                  <div className="text-xs text-green-700 mt-1">{calculations.route_based.description}</div>
                </div>
                {onMethodChange && (
                  <Button
                    size="sm"
                    variant={currentMethod === 'route_based' ? 'default' : 'outline'}
                    onClick={() => onMethodChange('route_based')}
                    className="w-full mt-2 h-6 text-xs"
                  >
                    {currentMethod === 'route_based' ? 'Active' : 'Switch to Route'}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Tax Breakdown Verification */}
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-medium text-gray-900 mb-1">📊 Tax Breakdown Verification</div>
            <div className="text-xs space-y-1">
              <div>Customs: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.customs || 0, 'origin')}</span></div>
              <div>Sales Tax: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.taxes || quote.calculation_data?.sales_tax_price || 0, 'origin')}</span></div>
              <div>Destination Tax: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.destination_tax || 0, 'origin')}</span></div>
              <div>HSN Local Taxes: <span className="font-mono">{currencyDisplay.formatSingleAmount(hsnCalculation?.total_hsn_local_taxes || 0, 'origin')}</span></div>
            </div>
          </div>

          {/* Fee Breakdown Verification */}
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-medium text-gray-900 mb-1">💰 Fee Breakdown Verification</div>
            <div className="text-xs space-y-1">
              <div>Breakdown Shipping: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.shipping || 0, 'origin')}</span></div>
              <div>Breakdown Handling: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.handling || 0, 'origin')}</span></div>
              <div>Breakdown Insurance: <span className="font-mono">{currencyDisplay.formatSingleAmount(breakdown.insurance || 0, 'origin')}</span></div>
              <div>Operational Handling: <span className="font-mono">{currencyDisplay.formatSingleAmount(operationalData.handling_charge || 0, 'origin')}</span></div>
              <div>Operational Insurance: <span className="font-mono">{currencyDisplay.formatSingleAmount(operationalData.insurance_amount || 0, 'origin')}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};