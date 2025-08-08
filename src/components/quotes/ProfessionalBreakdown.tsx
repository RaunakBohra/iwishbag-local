/**
 * ProfessionalBreakdown - Modern, professional financial breakdown component
 * 
 * Design Philosophy:
 * - Clean, minimal design following modern SaaS/FinTech standards
 * - Professional color palette (slate grays, subtle accents)
 * - Clear information hierarchy and typography
 * - Trust-inspiring layout similar to Stripe/PayPal invoices
 * 
 * Features:
 * - Collapsed summary view by default (4 main categories)
 * - Expandable detailed breakdown with proper spacing
 * - Mobile-optimized responsive design
 * - Accessibility-compliant with proper contrast and focus states
 * - Smooth animations and micro-interactions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  FileText,
  Settings,
  Shield,
  Info,
  CheckCircle
} from 'lucide-react';
import { getOriginCurrency } from '@/utils/originCurrency';

interface ProfessionalBreakdownProps {
  quote: {
    id: string;
    calculation_data?: {
      calculation_steps?: Record<string, any>;
      inputs?: Record<string, any>;
      _proportional_rounding_applied?: boolean;
    };
    origin_country?: string;
    destination_country?: string;
    total_quote_origincurrency?: number;
    total_origin_currency?: number;
  };
  formatCurrency: (amount: number, currency: string) => string;
  className?: string;
  displayCurrency?: string;
  onTotalCalculated?: (total: string, numericTotal: number, currency: string) => void;
}

interface BreakdownLineItemProps {
  icon: React.ReactNode;
  label: string;
  amount: number;
  currency: string;
  formatCurrency: (amount: number, currency: string) => string;
  isTotal?: boolean;
  showCurrencyNote?: boolean;
  currencyNote?: string;
}

interface DetailedSectionProps {
  title: string;
  items: Array<{
    label: string;
    amount: number;
    isDiscount?: boolean;
    description?: string;
  }>;
  currency: string;
  formatCurrency: (amount: number, currency: string) => string;
}

// Professional line item component for clean display
const BreakdownLineItem: React.FC<BreakdownLineItemProps> = ({
  icon,
  label,
  amount,
  currency,
  formatCurrency,
  isTotal = false,
  showCurrencyNote = false,
  currencyNote
}) => {
  return (
    <div className={`flex items-center justify-between py-3 ${isTotal ? 'border-t border-slate-200 pt-4 mt-2' : ''}`}>
      <div className="flex items-center space-x-3">
        <div className="text-slate-500 flex-shrink-0">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className={`${isTotal ? 'font-semibold text-slate-900 text-lg' : 'text-slate-700 font-medium'}`}>
            {label}
          </span>
          {showCurrencyNote && currencyNote && (
            <span className="text-xs text-slate-500 mt-1">
              {currencyNote}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <span className={`font-mono ${isTotal ? 'font-bold text-lg text-slate-900' : 'font-medium text-slate-700'}`}>
          {formatCurrency(amount, currency)}
        </span>
      </div>
    </div>
  );
};

// Detailed section for expanded view
const DetailedSection: React.FC<DetailedSectionProps> = ({
  title,
  items,
  currency,
  formatCurrency
}) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-start text-sm">
            <div className="flex-1">
              <span className={`${item.isDiscount ? 'text-emerald-700' : 'text-slate-600'}`}>
                {item.label}
              </span>
              {item.description && (
                <div className="text-xs text-slate-400 mt-1">
                  {item.description}
                </div>
              )}
            </div>
            <span className={`font-mono font-medium ml-4 ${item.isDiscount ? 'text-emerald-700' : 'text-slate-700'}`}>
              {item.isDiscount ? '-' : ''}{formatCurrency(Math.abs(item.amount), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProfessionalBreakdown: React.FC<ProfessionalBreakdownProps> = ({
  quote,
  formatCurrency,
  className = "",
  displayCurrency,
  onTotalCalculated
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [convertedAmounts, setConvertedAmounts] = useState<{ [key: string]: number }>({});
  const [lastSharedTotal, setLastSharedTotal] = React.useState<{total: number, currency: string} | null>(null);

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
      return amount;
    }
  }, []);

  // Derived values
  const calc = quote?.calculation_data;
  const steps = calc?.calculation_steps || {};
  const originCurrency = quote?.origin_country ? getOriginCurrency(quote.origin_country) : 'USD';
  const currency = displayCurrency || originCurrency;
  const hasProportionalRounding = quote?.calculation_data?._proportional_rounding_applied || 
                                 quote?.calculation_data?.calculation_steps?._rounding_metadata;

  // Convert amounts when displayCurrency changes
  useEffect(() => {
    const convertAmounts = async () => {
      if (!displayCurrency || displayCurrency === originCurrency) {
        setConvertedAmounts({});
        return;
      }

      try {
        const stepsToConvert = {
          'items_subtotal': steps.discounted_items_subtotal || steps.items_subtotal || 0,
          'shipping_total': (steps.discounted_shipping_cost || steps.shipping_cost || 0) + 
                           (steps.insurance_amount || 0) + 
                           (steps.discounted_delivery || steps.domestic_delivery || 0),
          'taxes_total': (steps.discounted_customs_duty || steps.customs_duty || 0) + 
                        (steps.discounted_tax_amount || steps.local_tax_amount || 0),
          'service_fees': (steps.discounted_handling_fee || steps.handling_fee || 0) + 
                         (steps.payment_gateway_fee || 0),
          'final_total': steps.total_origin_currency || quote.total_quote_origincurrency || quote.total_origin_currency || 0,
          'total_savings': steps.total_savings || 0,
          // Detailed items
          'item_discounts': steps.item_discounts || 0,
          'order_discount_amount': steps.order_discount_amount || 0,
          'shipping_cost': steps.shipping_cost || 0,
          'insurance_amount': steps.insurance_amount || 0,
          'domestic_delivery': steps.domestic_delivery || 0,
          'discounted_delivery': steps.discounted_delivery || 0,
          'delivery_discount_amount': steps.delivery_discount_amount || 0,
          'customs_duty': steps.customs_duty || 0,
          'local_tax_amount': steps.local_tax_amount || 0,
          'handling_fee': steps.handling_fee || 0,
          'payment_gateway_fee': steps.payment_gateway_fee || 0,
        };

        const converted: { [key: string]: number } = {};
        
        for (const [key, amount] of Object.entries(stepsToConvert)) {
          if (amount !== 0) {
            const rawConverted = await convertCurrency(amount, originCurrency, displayCurrency);
            
            if (hasProportionalRounding) {
              converted[key] = rawConverted;
            } else {
              const { currencyService } = await import('@/services/CurrencyService');
              const formattedAmount = currencyService.formatAmount(rawConverted, displayCurrency);
              const numericValue = parseFloat(formattedAmount.replace(/[^\d.-]/g, ''));
              converted[key] = isNaN(numericValue) ? rawConverted : numericValue;
            }
          } else {
            converted[key] = 0;
          }
        }

        setConvertedAmounts(converted);
      } catch (error) {
        console.error('Failed to convert breakdown amounts:', error);
        setConvertedAmounts({});
      }
    };
    
    convertAmounts();
  }, [quote.id, quote.origin_country, displayCurrency, hasProportionalRounding, convertCurrency]);

  // Share calculated total with parent component
  const finalTotal = steps.total_origin_currency || quote?.total_quote_origincurrency || quote?.total_origin_currency || 0;
  React.useEffect(() => {
    if (onTotalCalculated && finalTotal !== undefined && quote?.calculation_data) {
      const convertedTotal = displayCurrency && convertedAmounts['final_total'] !== undefined 
        ? convertedAmounts['final_total'] 
        : finalTotal;
      
      if (!lastSharedTotal || lastSharedTotal.total !== convertedTotal || lastSharedTotal.currency !== currency) {
        const formattedTotal = formatCurrency(convertedTotal, currency);
        onTotalCalculated(formattedTotal, convertedTotal, currency);
        setLastSharedTotal({ total: convertedTotal, currency });
      }
    }
  }, [finalTotal, currency, onTotalCalculated, formatCurrency, lastSharedTotal, convertedAmounts, displayCurrency, quote?.calculation_data]);

  // Early return after all hooks are declared
  if (!quote || !quote.calculation_data) {
    return (
      <Card className={`${className} border-slate-200 shadow-sm`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center text-slate-500">
            <FileText className="w-5 h-5 mr-2" />
            <span className="text-sm">Breakdown not available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get amounts
  const getAmount = (key: string, originalAmount: number) => {
    const itemCostKeys = ['items_subtotal', 'item_discounts', 'order_discount_amount'];
    
    if (itemCostKeys.includes(key)) {
      return originalAmount; // Keep in origin currency
    }
    
    if (displayCurrency && convertedAmounts[key] !== undefined) {
      return convertedAmounts[key];
    }
    return originalAmount;
  };

  // Main category amounts for summary view
  const summaryItems = [
    {
      icon: <Package className="w-4 h-4" />,
      label: 'Items',
      amount: getAmount('items_subtotal', steps.discounted_items_subtotal || steps.items_subtotal || 0),
      currency: originCurrency, // Items always in origin currency
      showCurrencyNote: displayCurrency !== originCurrency,
      currencyNote: displayCurrency !== originCurrency ? `Shown in ${originCurrency}` : undefined
    },
    {
      icon: <Truck className="w-4 h-4" />,
      label: 'Shipping & Logistics',
      amount: getAmount('shipping_total', (steps.discounted_shipping_cost || steps.shipping_cost || 0) + 
              (steps.insurance_amount || 0) + 
              (steps.discounted_delivery || steps.domestic_delivery || 0)),
      currency: currency
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: 'Taxes & Duties',
      amount: getAmount('taxes_total', (steps.discounted_customs_duty || steps.customs_duty || 0) + 
              (steps.discounted_tax_amount || steps.local_tax_amount || 0)),
      currency: currency
    },
    {
      icon: <Settings className="w-4 h-4" />,
      label: 'Processing',
      amount: getAmount('service_fees', (steps.discounted_handling_fee || steps.handling_fee || 0) + 
              (steps.payment_gateway_fee || 0)),
      currency: currency
    }
  ];

  const convertedFinalTotal = getAmount('final_total', steps.total_origin_currency || quote.total_quote_origincurrency || quote.total_origin_currency || 0);
  const totalSavings = getAmount('total_savings', steps.total_savings || 0);

  // Detailed breakdown sections for expanded view
  const getLocalTaxName = (countryCode: string) => {
    const taxNames: { [key: string]: string } = {
      'NP': 'VAT',
      'IN': 'GST', 
      'US': 'Sales Tax',
      'CA': 'GST/HST',
      'AU': 'GST',
      'GB': 'VAT',
      'DE': 'VAT',
      'FR': 'VAT',
    };
    return taxNames[countryCode] || 'Local Tax';
  };

  const destinationCountry = quote.destination_country || calc.inputs?.destination_country || 'US';
  const localTaxName = getLocalTaxName(destinationCountry);

  const detailedSections = [
    {
      title: 'Items & Products',
      items: [
        { label: 'Items Subtotal', amount: getAmount('items_subtotal', steps.items_subtotal || 0) },
        ...(steps.item_discounts > 0 ? [{ label: 'Item Discounts', amount: getAmount('item_discounts', steps.item_discounts || 0), isDiscount: true }] : []),
        ...(steps.order_discount_amount > 0 ? [{ label: 'Order Discount', amount: getAmount('order_discount_amount', steps.order_discount_amount || 0), isDiscount: true }] : [])
      ]
    },
    {
      title: 'Shipping & Logistics',
      items: [
        { label: 'International Shipping', amount: getAmount('shipping_cost', steps.shipping_cost || 0) },
        ...(steps.insurance_amount > 0 ? [{ label: 'Package Insurance', amount: getAmount('insurance_amount', steps.insurance_amount || 0), description: 'Comprehensive coverage for your package' }] : []),
        { label: 'Local Delivery', amount: getAmount('domestic_delivery', steps.domestic_delivery || 0) },
        ...(steps.delivery_discount_amount > 0 ? [{ label: 'Delivery Savings', amount: getAmount('delivery_discount_amount', steps.delivery_discount_amount || 0), isDiscount: true }] : [])
      ].filter(item => item.amount > 0 || item.isDiscount)
    },
    {
      title: 'Taxes & Duties',
      items: [
        ...(steps.customs_duty > 0 ? [{ label: 'Import Duties', amount: getAmount('customs_duty', steps.customs_duty || 0) }] : []),
        ...(steps.local_tax_amount > 0 ? [{ label: localTaxName, amount: getAmount('local_tax_amount', steps.local_tax_amount || 0) }] : [])
      ]
    },
    {
      title: 'Service Fees',
      items: [
        ...(steps.handling_fee > 0 ? [{ label: 'Handling Fee', amount: getAmount('handling_fee', steps.handling_fee || 0) }] : []),
        { label: 'Payment Processing', amount: getAmount('payment_gateway_fee', steps.payment_gateway_fee || 0), description: '2.9% + $0.30 processing fee' }
      ].filter(item => item.amount > 0)
    }
  ];

  return (
    <Card className={`${className} border-slate-200 shadow-sm bg-white`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Quote Breakdown</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-medium mr-2">
              {showDetails ? 'Hide Details' : 'Show Details'}
            </span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Currency Notice */}
        {displayCurrency && displayCurrency !== originCurrency && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-600">
                <span className="font-medium">Currency Note:</span> Item prices shown in {originCurrency}, 
                other amounts converted to {displayCurrency} for your convenience.
              </div>
            </div>
          </div>
        )}

        {/* Summary View - Main Categories */}
        <div className="space-y-1">
          {summaryItems.map((item, index) => (
            <BreakdownLineItem
              key={index}
              icon={item.icon}
              label={item.label}
              amount={item.amount}
              currency={item.currency}
              formatCurrency={formatCurrency}
              showCurrencyNote={item.showCurrencyNote}
              currencyNote={item.currencyNote}
            />
          ))}

          {/* Total */}
          <BreakdownLineItem
            icon={<CheckCircle className="w-5 h-5" />}
            label="Total"
            amount={convertedFinalTotal}
            currency={currency}
            formatCurrency={formatCurrency}
            isTotal={true}
          />
        </div>

        {/* Trust Signals */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-center space-x-6 text-xs text-slate-600">
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>All Taxes Included</span>
            </div>
            <div className="flex items-center space-x-1">
              <Truck className="w-3 h-3" />
              <span>Insured Shipping</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown (Expandable) */}
        {showDetails && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="space-y-6">
              {detailedSections.map((section, index) => (
                <DetailedSection
                  key={index}
                  title={section.title}
                  items={section.items}
                  currency={section.title === 'Items & Products' ? originCurrency : currency}
                  formatCurrency={formatCurrency}
                />
              ))}

              {/* Total Savings */}
              {totalSavings > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        Savings
                      </Badge>
                      <span className="text-sm font-medium text-emerald-800">
                        Total amount saved on this quote
                      </span>
                    </div>
                    <span className="text-lg font-bold text-emerald-800 font-mono">
                      -{formatCurrency(totalSavings, currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-sm text-slate-600 space-y-2">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800 mb-1">Additional Information</p>
                      <ul className="space-y-1 text-slate-600">
                        <li>• All prices include applicable taxes and duties</li>
                        <li>• Package weight: {calc.inputs?.total_weight_kg || 0}kg</li>
                        <li>• Exchange rates updated daily</li>
                        {steps.insurance_amount > 0 && (
                          <li>• Package insurance covers full value and shipping</li>
                        )}
                        {hasProportionalRounding && (
                          <li className="text-emerald-700">• ✓ Enhanced accuracy with proportional rounding</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};