// ============================================================================
// ENHANCED SMART TAX BREAKDOWN - Merged Price Summary + Tax Breakdown
// Combines all financial display features in one component
// Features: Tax breakdown, Save button, Margin analysis, Dual currency
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Calculator,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Info,
  Package,
  Plane,
  Building2,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Receipt,
  Globe,
  RefreshCw,
  Zap,
  Clock,
  Save,
  BarChart3,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';

interface EnhancedSmartTaxBreakdownProps {
  quote: UnifiedQuote;
  showEducation?: boolean;
  compact?: boolean;
  title?: string;
  onSave?: () => void;
  isSaving?: boolean;
  orderMode?: boolean;
  className?: string;
}

export const EnhancedSmartTaxBreakdown: React.FC<EnhancedSmartTaxBreakdownProps> = ({
  quote,
  showEducation = true,
  compact = false,
  title = 'Price Summary',
  onSave,
  isSaving = false,
  orderMode = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const { toast } = useToast();
  
  // Get standardized currency display info
  const currencyDisplay = useAdminQuoteCurrency(quote);
  const isDualCurrency = currencyDisplay.originCurrency !== currencyDisplay.destinationCurrency;
  
  // Extract breakdown data with correct transparent tax model structure
  const breakdown = quote.calculation_data?.breakdown || {};
  const operationalData = quote.operational_data || {};
  
  // Step 1: Base amounts
  const itemsTotal = breakdown.items_total || 0;
  const purchaseTax = breakdown.purchase_tax || operationalData.purchase_tax_amount || 0;
  const actualItemCost = itemsTotal + purchaseTax; // Items + origin country purchase tax
  
  // Step 2: Shipping and related costs
  const shipping = breakdown.shipping || 0;
  const insurance = breakdown.insurance || operationalData.insurance_amount || 0;
  const handling = breakdown.handling || operationalData.handling_charge || 0;
  
  // Step 3: Customs calculation (on CIF basis)
  const customs = breakdown.customs || 0;
  const salesTax = breakdown.sales_tax || 0;
  
  // Step 4: Pre-gateway subtotal (includes all taxes except destination tax)
  const preGatewaySubtotal = actualItemCost + shipping + insurance + handling + customs + salesTax;
  
  // Step 5: Payment gateway fees (calculated before destination tax)
  const paymentGatewayFee = breakdown.fees || operationalData.payment_gateway_fee || 0;
  
  // Step 6: Destination tax (calculated on subtotal including gateway fees)
  const destinationTax = breakdown.destination_tax || 0;
  
  // Step 7: Final total
  const discount = breakdown.discount || 0;
  const finalTotal = preGatewaySubtotal + paymentGatewayFee + destinationTax - discount;
  
  // Tax rates for display
  const purchaseTaxRate = operationalData.purchase_tax_rate || 0;
  const customsRate = operationalData.customs?.percentage || quote.tax_rates?.customs || 0;
  const salesTaxRate = quote.tax_rates?.sales_tax || 0;
  const destinationTaxRate = quote.tax_rates?.destination_tax || 0;
  
  // Calculation method display
  const calculationMethod = quote.calculation_method_preference || 'route_based';
  const methodLabels = {
    hsn_only: 'route_based: 'Shipping Route',
    manual: 'Manual Entry'
  };

  // Helper functions for formatting
  const formatDualAmount = (amount: number) => {
    if (!isDualCurrency) {
      return currencyDisplay.formatSingleAmount(amount, 'origin');
    }
    const { origin, destination, short } = currencyDisplay.formatDualAmount(amount);
    return compact ? short : `${origin} / ${destination}`;
  };

  const formatSingleAmount = (amount: number, currency: 'origin' | 'destination' = 'origin') => {
    return currencyDisplay.formatSingleAmount(amount, currency);
  };

  const formatTaxPercentage = (rate: number): string => {
    if (rate >= 1) return `${rate.toFixed(1)}`;
    return `${(rate * 100).toFixed(1)}`;
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      toast({
        title: "Quote Saved",
        description: "All changes have been saved successfully."
      });
    }
  };

  const TaxBreakdownRow = ({ 
    icon: Icon, 
    label, 
    amount, 
    rate, 
    description, 
    isSubtotal = false,
    isTotal = false,
    isNegative = false 
  }: {
    icon: any;
    label: string;
    amount: number;
    rate?: number;
    description?: string;
    isSubtotal?: boolean;
    isTotal?: boolean;
    isNegative?: boolean;
  }) => (
    <div className={`flex items-center justify-between py-2 ${isSubtotal ? 'border-t border-gray-200 pt-3' : ''} ${isTotal ? 'border-t-2 border-gray-300 pt-3 font-semibold' : ''}`}>
      <div className="flex items-center space-x-3">
        <Icon className={`h-4 w-4 ${isTotal ? 'text-primary' : 'text-gray-500'}`} />
        <div>
          <span className={`text-sm ${isTotal ? 'font-semibold' : 'font-medium'}`}>
            {label}
            {rate !== undefined && rate > 0 && (
              <span className="text-xs text-gray-500 ml-2">({formatTaxPercentage(rate)}%)</span>
            )}
          </span>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <span className={`text-sm font-mono ${isNegative ? 'text-red-600' : isTotal ? 'font-semibold text-primary' : 'text-gray-900'}`}>
          {isNegative && '-'}
          {formatDualAmount(Math.abs(amount))}
        </span>
      </div>
    </div>
  );

  // Simplified view for compact mode
  if (compact && !isExpanded) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{title}</span>
              <Badge variant="outline" className="text-xs">
                {methodLabels[calculationMethod as keyof typeof methodLabels]}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono font-semibold">
                {formatDualAmount(finalTotal)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`border-gray-200 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Calculator className="h-5 w-5" />
              <span>{orderMode ? 'Order Summary' : title}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {isDualCurrency && (
                <Badge variant="outline" className="text-xs">
                  {currencyDisplay.originCurrency}/{currencyDisplay.destinationCurrency}
                  {currencyDisplay.exchangeRate && currencyDisplay.exchangeRate !== 1 && (
                    <span className="ml-1 font-normal">
                      (1:{currencyDisplay.exchangeRate.toFixed(2)})
                    </span>
                  )}
                </Badge>
              )}
              {compact && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Simple Summary Section */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatDualAmount(itemsTotal)}</span>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              {shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatDualAmount(shipping)}</span>
                </div>
              )}
              {customs > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Customs ({formatTaxPercentage(customsRate)}%)
                  </span>
                  <span>{formatDualAmount(customs)}</span>
                </div>
              )}
              {salesTax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Sales Tax ({formatTaxPercentage(salesTaxRate)}%)
                  </span>
                  <span>{formatDualAmount(salesTax)}</span>
                </div>
              )}
              {destinationTax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    VAT/GST ({formatTaxPercentage(destinationTaxRate)}%)
                  </span>
                  <span>{formatDualAmount(destinationTax)}</span>
                </div>
              )}
              {handling > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Handling</span>
                  <span>{formatDualAmount(handling)}</span>
                </div>
              )}
              {insurance > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance</span>
                  <span>{formatDualAmount(insurance)}</span>
                </div>
              )}
              {paymentGatewayFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Fee</span>
                  <span>{formatDualAmount(paymentGatewayFee)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatDualAmount(finalTotal)}</span>
            </div>
          </div>

          {/* Margin Analysis for Orders */}
          {orderMode && quote.margin && (
            <>
              <Separator className="my-4" />
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Margin Analysis
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selling Price</span>
                    <span className="font-medium">${quote.margin.selling_price || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchase Cost</span>
                    <span className="text-red-600">-${quote.margin.actual_purchase || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">All Expenses</span>
                    <span className="text-red-600">-${quote.margin.other_expenses || 0}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-medium">
                    <span>Gross Margin</span>
                    <span className="text-green-600">${quote.margin.gross_margin || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margin %</span>
                    <span className="font-medium">{quote.margin.margin_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CS Score</span>
                    <span className="font-medium text-blue-600">${quote.margin.cs_score || 0}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Section */}
          <div className="mt-6 space-y-3">
            {/* Save Button */}
            {onSave && (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Quote'}
              </Button>
            )}

          </div>

          {/* Expandable Detailed Breakdown */}
          {showEducation && (
            <>
              <Separator className="my-4" />
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Detailed Tax Breakdown
                </summary>
                <div className="mt-3 space-y-1">
                  {/* Detailed breakdown rows */}
                  <TaxBreakdownRow
                    icon={Package}
                    label="Product Cost"
                    amount={itemsTotal}
                    description="Base product prices before taxes"
                  />
                  
                  {purchaseTax > 0 && (
                    <TaxBreakdownRow
                      icon={Receipt}
                      label="Purchase Tax"
                      amount={purchaseTax}
                      rate={purchaseTaxRate}
                      description={`${currencyDisplay.originCountry} origin sales tax`}
                    />
                  )}
                  
                  <TaxBreakdownRow
                    icon={Plane}
                    label="International Shipping"
                    amount={shipping}
                    description="Cross-border freight charges"
                  />
                  
                  {insurance > 0 && (
                    <TaxBreakdownRow
                      icon={Building2}
                      label="Insurance"
                      amount={insurance}
                      description="Package protection coverage"
                    />
                  )}
                  
                  {handling > 0 && (
                    <TaxBreakdownRow
                      icon={Package}
                      label="Handling"
                      amount={handling}
                      description="Processing and handling charges"
                    />
                  )}
                  
                  {customs > 0 && (
                    <TaxBreakdownRow
                      icon={Globe}
                      label="Customs Duty"
                      amount={customs}
                      rate={customsRate}
                      description="Calculated on CIF value"
                    />
                  )}
                  
                  {salesTax > 0 && (
                    <TaxBreakdownRow
                      icon={Receipt}
                      label="Sales Tax"
                      amount={salesTax}
                      rate={salesTaxRate}
                      description="Origin country sales tax (US→NP)"
                    />
                  )}
                  
                  {paymentGatewayFee > 0 && (
                    <TaxBreakdownRow
                      icon={CreditCard}
                      label="Payment Gateway Fee"
                      amount={paymentGatewayFee}
                      description="Payment processing (2.9% + $0.30)"
                    />
                  )}
                  
                  {destinationTax > 0 && (
                    <TaxBreakdownRow
                      icon={TrendingUp}
                      label={`Destination Tax (${currencyDisplay.destinationCountry})`}
                      amount={destinationTax}
                      rate={destinationTaxRate}
                      description="VAT/GST on total + gateway fees"
                    />
                  )}
                  
                  {discount > 0 && (
                    <TaxBreakdownRow
                      icon={AlertCircle}
                      label="Discount Applied"
                      amount={discount}
                      description="Promotional discount"
                      isNegative={true}
                    />
                  )}
                  
                  <Separator className="my-3" />
                  
                  <TaxBreakdownRow
                    icon={DollarSign}
                    label="Final Total"
                    amount={finalTotal}
                    description="Complete delivered cost"
                    isTotal={true}
                  />
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default EnhancedSmartTaxBreakdown;