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
  // FIXED: Use breakdown source currency instead of customer_currency
  const sourceCurrency = getBreakdownSourceCurrency(quote);
  const currency = displayCurrency || sourceCurrency;

  // Convert amounts when displayCurrency changes
  useEffect(() => {
    const convertAmounts = async () => {
      // FIXED: Check against breakdown source currency, not customer_currency
      const sourceCurrency = getBreakdownSourceCurrency(quote);
      if (!displayCurrency || displayCurrency === sourceCurrency) {
        // No conversion needed, reset converted amounts
        setConvertedAmounts({});
        return;
      }

      try {
        // CRITICAL FIX: Get the actual breakdown source currency (origin currency)
        // Previously assumed breakdown was in customer_currency, but it's actually in origin currency
        const fromCurrency = getBreakdownSourceCurrency(quote);
        
        console.log(`[CustomerBreakdown] Currency conversion: ${fromCurrency} → ${displayCurrency} for quote ${quote.id}`);
        console.log(`[CustomerBreakdown] Origin: ${quote.origin_country}, Destination: ${quote.destination_country}`);
        const stepsToConvert = {
          'items_subtotal': steps.discounted_items_subtotal || steps.items_subtotal || 0,
          'shipping_total': (steps.discounted_shipping_cost || steps.shipping_cost || 0) + 
                           (steps.insurance_amount || 0) + 
                           (steps.discounted_delivery || steps.domestic_delivery || 0),
          'taxes_total': (steps.discounted_customs_duty || steps.customs_duty || 0) + 
                        (steps.discounted_tax_amount || steps.local_tax_amount || 0),
          'service_fees': (steps.discounted_handling_fee || steps.handling_fee || 0) + 
                         (steps.payment_gateway_fee || 0),
          'final_total': steps.total_origin_currency || quote.total_origin_currency || steps.total_usd || quote.total_usd || 0,
          'total_savings': steps.total_savings || 0,
          'total_usd': steps.total_usd || 0,
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
            // Convert currency and apply smart rounding via CurrencyService
            const rawConverted = await convertCurrency(amount, fromCurrency, displayCurrency);
            // Apply admin-level smart rounding by re-formatting with CurrencyService
            const { currencyService } = await import('@/services/CurrencyService');
            // Extract numeric value by formatting and parsing (to apply smart rounding)
            const formattedAmount = currencyService.formatAmount(rawConverted, displayCurrency);
            // Extract just the number from the formatted string (remove currency symbol)
            const numericValue = parseFloat(formattedAmount.replace(/[^\d.-]/g, ''));
            converted[key] = isNaN(numericValue) ? rawConverted : numericValue;
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
  }, [quote, displayCurrency, convertCurrency, steps]);

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
  const finalTotal = getAmount('final_total', steps.total_origin_currency || quote.total_origin_currency || steps.total_usd || quote.total_usd || 0);
  
  // Share calculated total with parent component (Quote Summary)
  React.useEffect(() => {
    if (onTotalCalculated && finalTotal !== undefined) {
      const formattedTotal = formatCurrency(finalTotal, currency);
      onTotalCalculated(formattedTotal, finalTotal, currency);
    }
  }, [onTotalCalculated, finalTotal, currency, formatCurrency]);

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
          {currency !== 'USD' && steps.total_usd && (
            <div className="text-center text-sm text-muted-foreground">
              ≈ {formatCurrency(getAmount('total_usd', steps.total_usd || 0), 'USD')}
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