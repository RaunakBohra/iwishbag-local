import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Shield,
  Calculator,
  Globe,
  CreditCard,
  Tag,
  Info
} from 'lucide-react';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency } from '@/utils/originCurrency';

interface CustomerBreakdownProps {
  quote: any;
  formatCurrency: (amount: number, currency: string) => string;
  className?: string;
  displayCurrency?: string; // Override currency for display
  onTotalCalculated?: (total: string, numericTotal: number, currency: string) => void; // Callback to share total with parent
}

export const CustomerBreakdown: React.FC<CustomerBreakdownProps> = ({
  quote,
  formatCurrency,
  className = "",
  displayCurrency,
  onTotalCalculated
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [convertedAmounts, setConvertedAmounts] = useState<{ [key: string]: number }>({});

  // Currency conversion function
  const convertCurrency = useCallback(async (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    try {
      const { currencyService } = await import('@/services/CurrencyService');
      return await currencyService.convertAmount(amount, fromCurrency, toCurrency);
    } catch (error) {
      console.warn(`Currency conversion failed ${fromCurrency}->${toCurrency}:`, error);
      return amount; // Return original amount if conversion fails
    }
  }, []);

  // Check if quote has proportional rounding applied
  const hasProportionalRounding = quote.calculation_data?._proportional_rounding_applied || 
                                 quote.calculation_data?.calculation_steps?._rounding_metadata;

  if (!quote || !quote.calculation_data) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500 text-center">Breakdown not available</p>
        </CardContent>
      </Card>
    );
  }

  const calc = quote.calculation_data;
  const steps = calc.calculation_steps || {};
  // CLEAR: Always use origin country to determine source currency (not breakdown detection)
  // This ensures amounts stored as "total_quote_origincurrency" are correctly identified as origin currency (e.g., INR for India)
  const originCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : 'USD';
  const currency = displayCurrency || originCurrency;

  // Convert amounts when displayCurrency changes
  useEffect(() => {
    const convertAmounts = async () => {
      // CLEAR: Always use origin country mapping for currency detection
      const originCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : 'USD';
      if (!displayCurrency || displayCurrency === originCurrency) {
        // No conversion needed, reset converted amounts
        setConvertedAmounts({});
        return;
      }

      try {
        // CLEAR: Get the origin currency from origin_country column 
        // All amounts are stored in origin currency (e.g., INR for India), then converted for display
        const fromCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : 'USD';
        
        // console.log(`[CustomerBreakdown] Currency conversion: ${fromCurrency} → ${displayCurrency} for quote ${quote.id}`);
        // console.log(`[CustomerBreakdown] Origin: ${quote.origin_country}, Destination: ${quote.destination_country}`);
        const stepsToConvert = {
          'items_subtotal': steps.discounted_items_subtotal || steps.items_subtotal || 0,
          'shipping_total': (steps.discounted_shipping_cost || steps.shipping_cost || 0) + 
                           (steps.insurance_amount || 0) + 
                           (steps.discounted_delivery || steps.domestic_delivery || 0),
          'taxes_total': (steps.discounted_customs_duty || steps.customs_duty || 0) + 
                        (steps.discounted_tax_amount || steps.local_tax_amount || 0),
          'service_fees': (steps.discounted_handling_fee || steps.handling_fee || 0) + 
                         (steps.payment_gateway_fee || 0),
          'final_total': steps.total_origin_currency || quote.total_quote_origincurrency || quote.total_origin_currency  || 0,
          'total_savings': steps.total_savings || 0,
          'total_quote_origincurrency': steps.total_quote_origincurrency || 0,
          // Detailed breakdown items
          'item_discounts': steps.item_discounts || 0,
          'order_discount_amount': steps.order_discount_amount || 0,
          'origin_sales_tax': steps.origin_sales_tax || 0,
          'shipping_cost': steps.shipping_cost || 0,
          'shipping_discount_amount': steps.shipping_discount_amount || 0,
          'insurance_amount': steps.insurance_amount || 0,
          'domestic_delivery': steps.domestic_delivery || 0,
          'delivery_discount_amount': steps.delivery_discount_amount || 0,
          'customs_duty': steps.customs_duty || 0,
          'customs_discount_amount': steps.customs_discount_amount || 0,
          'local_tax_amount': steps.local_tax_amount || 0,
          'tax_discount_amount': steps.tax_discount_amount || 0,
          'handling_fee': steps.handling_fee || 0,
          'handling_discount_amount': steps.handling_discount_amount || 0,
          'payment_gateway_fee': steps.payment_gateway_fee || 0,
        };

        const converted: { [key: string]: number } = {};
        
        for (const [key, amount] of Object.entries(stepsToConvert)) {
          if (amount !== 0) {
            // Convert currency
            const rawConverted = await convertCurrency(amount, fromCurrency, displayCurrency);
            
            if (hasProportionalRounding) {
              // For proportionally rounded quotes, don't apply additional rounding to preserve proportions
              converted[key] = rawConverted;
            } else {
              // Legacy quotes: Apply smart rounding via CurrencyService
              const { currencyService } = await import('@/services/CurrencyService');
              // Extract numeric value by formatting and parsing (to apply smart rounding)
              const formattedAmount = currencyService.formatAmount(rawConverted, displayCurrency);
              // Extract just the number from the formatted string (remove currency symbol)
              const numericValue = parseFloat(formattedAmount.replace(/[^\d.-]/g, ''));
              converted[key] = isNaN(numericValue) ? rawConverted : numericValue;
            }
          } else {
            converted[key] = 0;
          }
        }

        setConvertedAmounts(converted);
      } catch (error) {
        console.error('Failed to convert customer breakdown amounts:', error);
        // Reset to defaults on error
        setConvertedAmounts({});
      }
    };
    
    convertAmounts();
  }, [quote.id, quote.origin_country, displayCurrency, hasProportionalRounding]);

  // Helper to get converted amount or original - FIXED for origin currency system
  const getAmount = (key: string, originalAmount: number) => {
    if (displayCurrency && convertedAmounts[key] !== undefined) {
      return convertedAmounts[key];
    }
    return originalAmount;
  };

  // Helper function to get country-specific tax name
  const getLocalTaxName = (countryCode: string) => {
    const taxNames: { [key: string]: string } = {
      'NP': 'Local Tax (VAT)',
      'IN': 'Local Tax (GST)', 
      'US': 'Sales Tax',
      'CA': 'Local Tax (GST/HST)',
      'AU': 'Local Tax (GST)',
      'GB': 'Local Tax (VAT)',
      'DE': 'Local Tax (VAT)',
      'FR': 'Local Tax (VAT)',
      'IT': 'Local Tax (VAT)',
      'ES': 'Local Tax (VAT)',
      'NL': 'Local Tax (VAT)',
      'BE': 'Local Tax (VAT)',
      'SE': 'Local Tax (VAT)',
      'NO': 'Local Tax (VAT)',
      'DK': 'Local Tax (VAT)',
      'FI': 'Local Tax (VAT)'
    };
    return taxNames[countryCode] || 'Local Tax';
  };

  // Essential breakdown items (always visible) - 4 Main Categories
  const essentialItems = [
    {
      label: 'Items',
      amount: getAmount('items_subtotal', steps.discounted_items_subtotal || steps.items_subtotal || 0),
      icon: <Package className="w-4 h-4" />
    },
    {
      label: 'Shipping',
      amount: getAmount('shipping_total', (steps.discounted_shipping_cost || steps.shipping_cost || 0) + 
              (steps.insurance_amount || 0) + 
              (steps.discounted_delivery || steps.domestic_delivery || 0)),
      icon: <Truck className="w-4 h-4" />
    },
    {
      label: 'Taxes',
      amount: getAmount('taxes_total', (steps.discounted_customs_duty || steps.customs_duty || 0) + 
              (steps.discounted_tax_amount || steps.local_tax_amount || 0)),
      icon: <Globe className="w-4 h-4" />
    },
    {
      label: 'Service Fees',
      amount: getAmount('service_fees', (steps.discounted_handling_fee || steps.handling_fee || 0) + 
              (steps.payment_gateway_fee || 0)),
      icon: <Calculator className="w-4 h-4" />
    }
  ];

  // Detailed breakdown items (shown when expanded) with country-specific tax names
  const destinationCountry = quote.destination_country || calc.inputs?.destination_country || 'US';
  const localTaxName = getLocalTaxName(destinationCountry);
  
  const detailedItems = [
    {
      section: 'Items',
      items: [
        { label: 'Items Subtotal', amount: getAmount('items_subtotal', steps.items_subtotal || 0) },
        ...(steps.item_discounts > 0 ? [{ label: 'Item Discounts', amount: -getAmount('item_discounts', steps.item_discounts || 0), isDiscount: true }] : []),
        ...(steps.order_discount_amount > 0 ? [{ label: 'Order Discount', amount: -getAmount('order_discount_amount', steps.order_discount_amount || 0), isDiscount: true }] : []),
        ...(steps.origin_sales_tax > 0 ? [{ label: 'Origin Sales Tax', amount: getAmount('origin_sales_tax', steps.origin_sales_tax || 0) }] : [])
      ]
    },
    {
      section: 'Shipping & Logistics',
      items: [
        { label: 'International Shipping', amount: getAmount('shipping_cost', steps.shipping_cost || 0) },
        ...(steps.shipping_discount_amount > 0 ? [{ label: 'Shipping Savings', amount: -getAmount('shipping_discount_amount', steps.shipping_discount_amount || 0), isDiscount: true }] : []),
        ...(steps.insurance_amount > 0 ? [{ label: 'Package Insurance', amount: getAmount('insurance_amount', steps.insurance_amount || 0) }] : []),
        { 
          label: 'Local Delivery', 
          amount: getAmount('domestic_delivery', steps.domestic_delivery || 0),
          description: steps.domestic_delivery_details ? 
            `${steps.domestic_delivery_details.provider}: ${steps.domestic_delivery_details.original_currency} ${steps.domestic_delivery_details.original_amount} → ${steps.domestic_delivery_details.currency} ${steps.domestic_delivery_details.amount}` : 
            undefined 
        },
        ...(steps.delivery_discount_amount > 0 ? [{ label: 'Delivery Savings', amount: -getAmount('delivery_discount_amount', steps.delivery_discount_amount || 0), isDiscount: true }] : [])
      ]
    },
    {
      section: 'Taxes & Duties',
      items: [
        ...(steps.customs_duty > 0 ? [{ label: 'Import Duties', amount: getAmount('customs_duty', steps.customs_duty || 0) }] : []),
        ...(steps.customs_discount_amount > 0 ? [{ label: 'Customs Savings', amount: -getAmount('customs_discount_amount', steps.customs_discount_amount || 0), isDiscount: true }] : []),
        ...(steps.local_tax_amount > 0 ? [{ label: localTaxName, amount: getAmount('local_tax_amount', steps.local_tax_amount || 0) }] : []),
        ...(steps.tax_discount_amount > 0 ? [{ label: 'Tax Savings', amount: -getAmount('tax_discount_amount', steps.tax_discount_amount || 0), isDiscount: true }] : [])
      ]
    },
    {
      section: 'Service Fees',
      items: [
        ...(steps.handling_fee > 0 ? [{ label: 'Handling Fee', amount: getAmount('handling_fee', steps.handling_fee || 0) }] : []),
        ...(steps.handling_discount_amount > 0 ? [{ label: 'Handling Savings', amount: -getAmount('handling_discount_amount', steps.handling_discount_amount || 0), isDiscount: true }] : []),
        { label: 'Payment Gateway Fee', amount: getAmount('payment_gateway_fee', steps.payment_gateway_fee || 0), description: '2.9% + $0.30 processing fee' }
      ]
    },
    {
      section: 'Exchange & Conversion',
      items: [
        { label: 'Exchange Rate Used', amount: 0, description: `1 ${calc.inputs?.origin_currency || 'USD'} = ${calc.applied_rates?.exchange_rate || 1} ${currency}`, isInfo: true }
      ]
    }
  ];

  const totalSavings = getAmount('total_savings', steps.total_savings || 0);
  const finalTotal = getAmount('final_total', steps.total_origin_currency || quote.total_quote_origincurrency || quote.total_origin_currency  || 0);
  
  // Share calculated total with parent component (Quote Summary)
  const [lastSharedTotal, setLastSharedTotal] = React.useState<{total: number, currency: string} | null>(null);
  
  React.useEffect(() => {
    if (onTotalCalculated && finalTotal !== undefined) {
      // Only update if the total or currency has actually changed
      if (!lastSharedTotal || lastSharedTotal.total !== finalTotal || lastSharedTotal.currency !== currency) {
        const formattedTotal = formatCurrency(finalTotal, currency);
        onTotalCalculated(formattedTotal, finalTotal, currency);
        setLastSharedTotal({ total: finalTotal, currency });
      }
    }
  }, [finalTotal, currency]); // Remove onTotalCalculated and formatCurrency from deps to prevent infinite re-renders

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-blue-600" />
            <span>Pricing Breakdown</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700"
          >
            {showDetails ? 'Hide' : 'Show'} Details
            {showDetails ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Essential Breakdown (Always Visible) - Clean & Simple */}
          <div className="space-y-3">
            {essentialItems.map((item, index) => {
              if (item.optional && item.amount === 0) return null;
              
              return (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3">{item.icon}</span>
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Final Total */}
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(finalTotal, currency)}</span>
          </div>

          {/* USD Equivalent */}
          {currency !== 'USD' && steps.total_quote_origincurrency && (
            <div className="text-center text-sm text-muted-foreground">
              ≈ {formatCurrency(getAmount('total_quote_origincurrency', steps.total_quote_origincurrency || 0), 'USD')}
            </div>
          )}

          {/* Detailed Breakdown (Expandable) */}
          {showDetails && (
            <div className="mt-6 pt-6 border-t">
              <div className="space-y-6">
                {detailedItems.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                      {section.section}
                    </h4>
                    <div className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={`${item.isDiscount ? 'text-green-600' : item.isInfo ? 'text-blue-600' : 'text-muted-foreground'}`}>
                              {item.label}
                            </span>
                            {!item.isInfo && (
                              <span className={`${item.isDiscount ? 'text-green-600 font-medium' : ''}`}>
                                {formatCurrency(item.amount, currency)}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-500 pl-2">
                              {item.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Total Savings Summary (in details only) */}
                {totalSavings > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Tag className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-semibold text-lg">Total Savings</span>
                      </div>
                      <span className="text-green-800 font-bold text-lg">
                        -{formatCurrency(totalSavings, currency)}
                      </span>
                    </div>
                    <p className="text-green-700 text-sm mt-2">
                      You saved {formatCurrency(totalSavings, currency)} on this quote through various discounts and optimizations!
                    </p>
                  </div>
                )}

                {/* Additional Details */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-900 font-medium mb-1">Price Breakdown Details</p>
                      <ul className="text-blue-800 space-y-1">
                        <li>• All prices include applicable taxes and duties</li>
                        <li>• Shipping calculated based on total weight: {calc.inputs?.total_weight_kg || 0}kg</li>
                        <li>• Exchange rates are updated daily for accurate pricing</li>
                        {steps.insurance_amount > 0 && <li>• Insurance covers full package value and shipping costs</li>}
                        {hasProportionalRounding && (
                          <li className="text-green-700">• ✓ Enhanced breakdown accuracy with proportional rounding</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};