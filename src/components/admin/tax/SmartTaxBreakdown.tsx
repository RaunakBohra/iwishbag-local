// ============================================================================
// SMART TAX BREAKDOWN - Transparent Tax Model Implementation
// Correctly ordered calculation flow with dual currency display
// Features: Purchase tax, CIF customs, destination tax on gateway fees
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';

interface SmartTaxBreakdownProps {
  quote: UnifiedQuote;
  showEducation?: boolean;
  compact?: boolean;
  title?: string;
}

export const SmartTaxBreakdown: React.FC<SmartTaxBreakdownProps> = ({
  quote,
  showEducation = true,
  compact = false,
  title = 'Tax Breakdown',
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  
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
  
  // Step 4: Pre-gateway subtotal
  const preGatewaySubtotal = actualItemCost + shipping + insurance + handling + customs;
  
  // Step 5: Payment gateway fees (calculated before destination tax)
  const paymentGatewayFee = breakdown.fees || operationalData.payment_gateway_fee || 0;
  
  // Step 6: Destination tax (calculated on subtotal including gateway fees)
  const destinationTax = breakdown.destination_tax || 0;
  
  // Step 7: Final total
  const discount = breakdown.discount || 0;
  const finalTotal = preGatewaySubtotal + paymentGatewayFee + destinationTax - discount;
  
  // Tax rates for display
  const purchaseTaxRate = operationalData.purchase_tax_rate || 0;
  const customsRate = operationalData.customs?.percentage || 0;
  const taxCalculation = quote.calculation_data?.tax_calculation;
  const destinationTaxRate = taxCalculation?.destination_tax_rate || 0;
  
  // Calculation method display
  const calculationMethod = quote.calculation_method_preference || 'route_based';
  const methodLabels = {
    hsn_only: 'route_based: 'Shipping Route',
    manual: 'Manual Entry'
  };
  
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
            {rate && rate > 0 && (
              <span className="text-xs text-gray-500 ml-2">({rate}%)</span>
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
  
  if (compact && !isExpanded) {
    return (
      <Card className="border-gray-200">
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
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Calculator className="h-5 w-5" />
              <span>{title}</span>
              {isDualCurrency && (
                <Badge variant="outline" className="text-xs">
                  {currencyDisplay.originCurrency}/{currencyDisplay.destinationCurrency}
                </Badge>
              )}
              {/* Exchange Rate Status */}
              {isDualCurrency && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge 
                      variant={currencyDisplay.exchangeRateSource === 'fetching' ? 'secondary' : 
                              currencyDisplay.exchangeRateSource === 'error' ? 'destructive' : 'outline'} 
                      className="text-xs flex items-center space-x-1"
                    >
                      {currencyDisplay.isLoadingRate ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : currencyDisplay.exchangeRateSource === 'shipping_route' ? (
                        <Zap className="h-3 w-3" />
                      ) : currencyDisplay.exchangeRateSource === 'country_settings' ? (
                        <Globe className="h-3 w-3" />
                      ) : currencyDisplay.exchangeRateSource === 'error' ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      <span>1:{currencyDisplay.exchangeRate.toFixed(2)}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="text-xs space-y-1">
                      <div className="font-medium">Exchange Rate: 1 {currencyDisplay.originCurrency} = {currencyDisplay.exchangeRate} {currencyDisplay.destinationCurrency}</div>
                      <div className="text-gray-600">
                        Source: {currencyDisplay.exchangeRateSource === 'shipping_route' ? 'Shipping Route (Live)' :
                                currencyDisplay.exchangeRateSource === 'country_settings' ? 'Country Settings (Live)' :
                                currencyDisplay.exchangeRateSource === 'quote_cached' ? 'Quote Cache' :
                                currencyDisplay.exchangeRateSource === 'fetching' ? 'Fetching...' : 'Error - Using Cache'}
                      </div>
                      {currencyDisplay.exchangeRateTimestamp && (
                        <div className="text-gray-500">
                          Updated: {new Date(currencyDisplay.exchangeRateTimestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {methodLabels[calculationMethod as keyof typeof methodLabels]}
              </Badge>
              {/* Exchange Rate Refresh Button */}
              {isDualCurrency && !currencyDisplay.isLoadingRate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={currencyDisplay.refreshExchangeRate}
                  className="h-6 w-6 p-0"
                  title="Refresh exchange rate"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
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
          {/* Step 1: Product Costs */}
          <TaxBreakdownRow
            icon={Package}
            label="Product Cost"
            amount={itemsTotal}
            description="Base product prices before taxes"
          />
          
          {/* Step 1b: Purchase Tax (if applicable) */}
          {purchaseTax > 0 && (
            <TaxBreakdownRow
              icon={Receipt}
              label="Purchase Tax"
              amount={purchaseTax}
              rate={purchaseTaxRate}
              description={`${currencyDisplay.originCountry} origin sales tax`}
            />
          )}
          
          {/* Subtotal: Actual Item Cost */}
          {purchaseTax > 0 && (
            <TaxBreakdownRow
              icon={DollarSign}
              label="Actual Item Cost"
              amount={actualItemCost}
              description="Product cost + purchase tax"
              isSubtotal={true}
            />
          )}
          
          {/* Step 2: Shipping Costs */}
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
          
          {/* Step 3: Customs Duty */}
          {customs > 0 && (
            <TaxBreakdownRow
              icon={Globe}
              label="Customs Duty"
              amount={customs}
              rate={customsRate}
              description="Calculated on CIF value (cost + shipping + insurance)"
            />
          )}
          
          {/* Pre-Gateway Subtotal */}
          <TaxBreakdownRow
            icon={Calculator}
            label="Pre-Gateway Subtotal"
            amount={preGatewaySubtotal}
            description="Total before payment processing"
            isSubtotal={true}
          />
          
          {/* Step 4: Payment Gateway Fee */}
          {paymentGatewayFee > 0 && (
            <TaxBreakdownRow
              icon={CreditCard}
              label="Payment Gateway Fee"
              amount={paymentGatewayFee}
              description="Payment processing charges (2.9% + $0.30)"
            />
          )}
          
          {/* Step 5: Destination Tax */}
          {destinationTax > 0 && (
            <TaxBreakdownRow
              icon={TrendingUp}
              label={`Destination Tax (${currencyDisplay.destinationCountry})`}
              amount={destinationTax}
              rate={destinationTaxRate}
              description="VAT/GST applied to subtotal + gateway fees"
            />
          )}
          
          {/* Discount */}
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
          
          {/* Final Total */}
          <TaxBreakdownRow
            icon={DollarSign}
            label="Final Total"
            amount={finalTotal}
            description="Complete delivered cost"
            isTotal={true}
          />
          
          {/* Education Section */}
          {showEducation && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-medium">Transparent Tax Calculation:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Purchase Tax:</strong> Applied at origin before customs calculation</li>
                    <li>• <strong>Customs:</strong> Calculated on CIF basis (cost + shipping + insurance)</li>
                    <li>• <strong>Destination Tax:</strong> Applied to full subtotal including gateway fees</li>
                    <li>• <strong>Method:</strong> {methodLabels[calculationMethod as keyof typeof methodLabels]} rates used</li>
                    {isDualCurrency && (
                      <li>• <strong>Exchange Rate:</strong> Live rates from {
                        currencyDisplay.exchangeRateSource === 'shipping_route' ? 'shipping route configuration' :
                        currencyDisplay.exchangeRateSource === 'country_settings' ? 'country settings database' :
                        'cached quote data'
                      }</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SmartTaxBreakdown;