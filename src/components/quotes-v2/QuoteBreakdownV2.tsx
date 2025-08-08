import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Package,
  Truck,
  Shield,
  Calculator,
  Globe,
  Info,
  CheckCircle,
  Clock,
  Tag,
  Check
} from 'lucide-react';
import { currencyService } from '@/services/CurrencyService';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';

interface QuoteV2 {
  id: string;
  quote_number: string;
  status: string;
  customer_email: string;
  customer_name?: string;
  origin_country: string;
  destination_country: string;
  items: any[];
  calculation_data: any;
  total_quote_origincurrency?: number; // Legacy
  total_customer_display_currency?: number; // Legacy
  customer_currency?: string; // Legacy
  total_origin_currency?: number; // New system
  created_at: string;
  calculated_at?: string;
}

interface QuoteBreakdownV2Props {
  quote: QuoteV2;
}

// Component to handle async destination total calculation for admin dual-currency display
const AdminDestinationTotal: React.FC<{
  getDestinationTotal: () => Promise<number>;
  destinationCurrency: string;
}> = ({ getDestinationTotal, destinationCurrency }) => {
  const [destinationTotal, setDestinationTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTotal = async () => {
      try {
        const total = await getDestinationTotal();
        setDestinationTotal(total);
      } catch (error) {
        console.error('Failed to calculate destination total:', error);
        setDestinationTotal(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadTotal();
  }, [getDestinationTotal]);

  if (loading) {
    return <p className="text-lg text-green-700">Converting...</p>;
  }

  if (destinationTotal === null) {
    return <p className="text-lg text-green-600">Conversion failed</p>;
  }

  return (
    <p className="text-lg text-green-700">
      {currencyService.formatAmount(destinationTotal, destinationCurrency)}
    </p>
  );
};


export const QuoteBreakdownV2: React.FC<QuoteBreakdownV2Props> = ({ quote }) => {
  if (!quote.calculation_data || !quote.calculation_data.calculation_steps) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-700 text-center">No calculation data available</p>
        </CardContent>
      </Card>
    );
  }

  const calc = quote.calculation_data;
  
  // NEW SYSTEM: Use origin currency as primary breakdown currency
  const breakdownCurrency = getBreakdownSourceCurrency(quote);
  
  // Helper function to format amounts in breakdown currency (now origin currency)
  // Since values are now already proportionally rounded, we use exact formatting to avoid additional rounding
  const formatBreakdownAmount = (amount: number): string => {
    // Check if this quote has proportional rounding applied
    const hasProportionalRounding = calc._proportional_rounding_applied || 
                                   calc.calculation_steps?._rounding_metadata;
    
    if (hasProportionalRounding) {
      // Use exact formatting to preserve the proportionally rounded values
      return formatExactAmount(amount, breakdownCurrency);
    } else {
      // Legacy quotes: apply individual rounding
      return currencyService.formatAmount(amount, breakdownCurrency);
    }
  };
  
  // Helper function for exact formatting without additional rounding
  const formatExactAmount = (amount: number, currencyCode: string): string => {
    const symbol = currencyService.getCurrencySymbol(currencyCode);
    const decimalPlaces = currencyService.getCurrencyFormatOptions(currencyCode).decimalPlaces;
    
    // Format with exact precision
    const parts = amount.toFixed(decimalPlaces).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    const formatted = parts.join('.');
    return `${symbol}${formatted}`;
  };
  
  // Get total from new system (origin currency) with fallback
  const getOriginTotal = () => {
    return calc.calculation_steps?.total_origin_currency || 
           quote.total_origin_currency || 
           calc.calculation_steps?.total_quote_origincurrency || 
           quote.total_quote_origincurrency || 
           0;
  };
  
  // Get destination currency for dual display (admin feature)
  const destinationCurrency = getDestinationCurrency(quote.destination_country);
  const getDestinationTotal = async () => {
    const originTotal = getOriginTotal();
    if (breakdownCurrency === destinationCurrency) {
      return originTotal;
    }
    
    try {
      return await currencyService.convertAmount(originTotal, breakdownCurrency, destinationCurrency);
    } catch (error) {
      console.warn('Currency conversion failed, using origin amount:', error);
      return originTotal;
    }
  };
  
  // Create default steps object with all properties set to 0
  const defaultSteps = {
    items_subtotal: 0,
    item_discounts: 0,
    discounted_items_subtotal: 0,
    order_discount_amount: 0,
    origin_sales_tax: 0,
    shipping_cost: 0,
    shipping_discount_amount: 0,
    discounted_shipping_cost: 0,
    insurance_amount: 0,
    cif_value: 0,
    customs_duty: 0,
    handling_fee: 0,
    domestic_delivery: 0,
    taxable_value: 0,
    local_tax_amount: 0,
    payment_gateway_fee: 0,
    total_savings: 0,
    total_quote_origincurrency: 0,
    total_customer_display_currency: 0
  };
  
  const steps = { ...defaultSteps, ...(calc.calculation_steps || {}) };
  const rates = {
    origin_sales_tax_percentage: 0,
    shipping_rate_per_kg: 0,
    insurance_percentage: 0,
    customs_percentage: 0,
    local_tax_percentage: 0,
    payment_gateway_percentage: 0,
    payment_gateway_fixed: 0,
    ...(calc.applied_rates || {})
  };
  const inputs = {
    total_weight_kg: 0,
    ...(calc.inputs || {})
  };
  
  const taxInfo = simplifiedQuoteCalculator.getTaxInfo(quote.destination_country);


  return (
    <div className="space-y-6">
      {/* Calculation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Calculation Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Step 1: Items Subtotal */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Step 1: Items Subtotal</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.items_subtotal)}</span>
            </div>
          </div>

          {/* Item Discounts */}
          {steps.item_discounts > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Item-level Discounts</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.item_discounts)}</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Applied to individual items = {formatBreakdownAmount(steps.discounted_items_subtotal)} after discounts
              </p>
            </div>
          )}

          {/* Order Discount */}
          {steps.order_discount_amount > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Order Discount</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.order_discount_amount)}</span>
              </div>
            </div>
          )}

          {/* Origin Sales Tax */}
          {steps.origin_sales_tax > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Step 2: Origin Sales Tax</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.origin_sales_tax)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {rates.origin_sales_tax_percentage}% sales tax in {inputs.origin_state || inputs.origin_country}
              </p>
            </div>
          )}

          {/* Step 3: International Shipping */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Step 3: International Shipping</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.shipping_cost)}</span>
            </div>
            {calc.route_calculations ? (
              <div className="text-sm text-gray-600 mt-2">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                  <div className="mb-1">
                    <strong>Dynamic Route Calculation:</strong>
                  </div>
                  <div>
                    Base: {formatBreakdownAmount(calc.route_calculations.shipping.base_cost)} + 
                    Per-kg: {formatBreakdownAmount(calc.route_calculations.shipping.per_kg_cost)} + 
                    Cost%: {formatBreakdownAmount(calc.route_calculations.shipping.cost_percentage)} = 
                    <strong> {formatBreakdownAmount(calc.route_calculations.shipping.total)}</strong>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Using: {calc.route_calculations.delivery_option_used.name} ({calc.route_calculations.delivery_option_used.carrier}) - 
                    ${calc.route_calculations.delivery_option_used.price_per_kg}/kg, {calc.route_calculations.delivery_option_used.delivery_days}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                {inputs.total_chargeable_weight_kg}kg × {formatBreakdownAmount(rates.shipping_rate_per_kg)}/kg = {formatBreakdownAmount(steps.shipping_cost)}
              </p>
            )}
          </div>

          {/* Shipping Discount - Legacy */}
          {steps.shipping_discount_amount > 0 && !steps.component_discounts?.shipping && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Shipping Discount</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.shipping_discount_amount)}</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Final shipping cost: {formatBreakdownAmount(steps.discounted_shipping_cost)}
              </p>
            </div>
          )}

          {/* Shipping Component Discount */}
          {steps.component_discounts?.shipping && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Shipping Discount</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.component_discounts.shipping.discount)}</span>
              </div>
              <div className="text-sm text-green-700 mt-2">
                {steps.component_discounts.shipping.applied_discounts?.map((discount: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-{formatBreakdownAmount(discount.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final shipping cost:</span>
                  <span>{formatBreakdownAmount(steps.component_discounts.shipping.final)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Insurance */}
          {steps.insurance_amount > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Step 4: Insurance</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.insurance_amount)}</span>
              </div>
              {calc.route_calculations?.insurance ? (
                <div className="text-sm text-gray-600 mt-2">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                    <div className="mb-1">
                      <strong>Dynamic Route Insurance:</strong>
                    </div>
                    <div>
                      Coverage: {calc.route_calculations.insurance.percentage}% of order value
                    </div>
                    <div>
                      Min Fee: {formatBreakdownAmount(calc.route_calculations.insurance.min_fee)}
                    </div>
                    <div>
                      <strong>Amount: {formatBreakdownAmount(calc.route_calculations.insurance.amount)}</strong>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {calc.route_calculations.insurance.available ? '✅ Available' : '❌ Not Available'}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  {rates.insurance_percentage}% of order value = {formatBreakdownAmount(steps.insurance_amount)}
                </p>
              )}
            </div>
          )}

          {/* CIF Value */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-base font-semibold text-blue-900">CIF Value</p>
                <p className="text-sm text-blue-700">Cost + Insurance + Freight</p>
              </div>
              <span className="text-xl font-semibold text-blue-900">{formatBreakdownAmount(steps.cif_value)}</span>
            </div>
          </div>

          {/* Step 5: Customs Duty */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="font-medium">Step 5: Customs Duty</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.customs_duty)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {rates.customs_percentage}% of CIF {formatBreakdownAmount(steps.cif_value)} = {formatBreakdownAmount(steps.customs_duty)}
            </p>
          </div>

          {/* Customs Discount */}
          {steps.component_discounts?.customs && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Customs Discount</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.component_discounts.customs.discount)}</span>
              </div>
              <div className="text-sm text-green-700 mt-2">
                {steps.component_discounts.customs.applied_discounts?.map((discount: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-{formatBreakdownAmount(discount.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final customs duty:</span>
                  <span>{formatBreakdownAmount(steps.component_discounts.customs.final)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Handling Fees */}
          {steps.handling_fee > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Step 6: Handling Fees</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.handling_fee)}</span>
              </div>
              {calc.route_calculations?.handling ? (
                <div className="text-sm text-gray-600 mt-2">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                    <div className="mb-1">
                      <strong>Dynamic Route Handling:</strong>
                    </div>
                    <div>
                      Base Fee: {formatBreakdownAmount(calc.route_calculations.handling.base_fee)} + 
                      Percentage: {formatBreakdownAmount(calc.route_calculations.handling.percentage_fee)} = 
                      {formatBreakdownAmount(calc.route_calculations.handling.total_before_caps)}
                    </div>
                    <div>
                      <strong>Final (capped): {formatBreakdownAmount(calc.route_calculations.handling.total)}</strong>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Caps: Min {formatBreakdownAmount(calc.route_calculations.handling.min_fee)} - Max {formatBreakdownAmount(calc.route_calculations.handling.max_fee)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  {rates.handling_fee_fixed > 0 && rates.handling_fee_percentage > 0 
                    ? `${formatBreakdownAmount(rates.handling_fee_fixed)} fixed + ${rates.handling_fee_percentage}% of order`
                    : rates.handling_fee_fixed > 0 
                      ? `${formatBreakdownAmount(rates.handling_fee_fixed)} fixed fee`
                      : `${rates.handling_fee_percentage}% of order value`
                  }
                </p>
              )}
            </div>
          )}

          {/* Handling Fee Discount */}
          {steps.component_discounts?.handling && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Handling Fee Discount</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.component_discounts.handling.discount)}</span>
              </div>
              <div className="text-sm text-green-700 mt-2">
                {steps.component_discounts.handling.applied_discounts?.map((discount: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-{formatBreakdownAmount(discount.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final handling fee:</span>
                  <span>{formatBreakdownAmount(steps.component_discounts.handling.final)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Domestic Delivery */}
          {steps.domestic_delivery > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Step 7: Domestic Delivery</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.domestic_delivery)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {inputs.destination_state === 'rural' ? 'Rural' : 'Urban'} delivery in {inputs.destination_country}
                {/* Show domestic delivery conversion details */}
                {steps.domestic_delivery_details && (
                  <span className="text-blue-600 font-medium block mt-1">
                    🔄 {steps.domestic_delivery_details.provider}: 
                    {steps.domestic_delivery_details.original_currency} {steps.domestic_delivery_details.original_amount} → 
                    {calc.inputs?.origin_currency || 'USD'} {steps.domestic_delivery_details.amount}
                    {steps.domestic_delivery_details.conversion_rate && (
                      <span className="text-xs text-gray-500 ml-1">
                        (rate: {steps.domestic_delivery_details.conversion_rate})
                      </span>
                    )}
                  </span>
                )}
                {steps.delhivery_rates && inputs.destination_country === 'IN' && (
                  <span className="text-blue-600 font-medium block mt-1">
                    📦 Powered by Delhivery API
                    {steps.delhivery_rates.cache_used && (
                      <span className="text-xs text-gray-600 ml-2">(cached)</span>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      {steps.delhivery_rates.rates.map((rate: any) => (
                        <div key={rate.service_type} className="flex justify-between">
                          <span>
                            {rate.service_type === 'standard' ? '📦 Standard' : 
                             rate.service_type === 'express' ? '⚡ Express' : 
                             '🚀 Same Day'}: 
                            {rate.estimated_days ? ` ${rate.estimated_days} days` : ''}
                          </span>
                          <span>₹{rate.rate}</span>
                        </div>
                      ))}
                    </div>
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Delivery Discount */}
          {steps.component_discounts?.delivery && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Delivery Discount</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.component_discounts.delivery.discount)}</span>
              </div>
              <div className="text-sm text-green-700 mt-2">
                {steps.component_discounts.delivery.applied_discounts?.map((discount: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-{formatBreakdownAmount(discount.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final delivery fee:</span>
                  <span>{formatBreakdownAmount(steps.component_discounts.delivery.final)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Taxable Value */}
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-base font-semibold text-orange-900">Taxable Value</p>
                <p className="text-sm text-orange-700">All costs before local tax</p>
              </div>
              <span className="text-xl font-semibold text-orange-900">{formatBreakdownAmount(steps.taxable_value)}</span>
            </div>
          </div>

          {/* Step 8: Local Tax (GST/VAT) */}
          {steps.local_tax_amount > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Step 8: {taxInfo.local_tax_name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.local_tax_amount)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {rates.local_tax_percentage}% of taxable value {formatBreakdownAmount(steps.taxable_value)} = {formatBreakdownAmount(steps.local_tax_amount)}
              </p>
            </div>
          )}

          {/* Tax Discount */}
          {steps.component_discounts?.taxes && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">{taxInfo.local_tax_name} Discount</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.component_discounts.taxes.discount)}</span>
              </div>
              <div className="text-sm text-green-700 mt-2">
                {steps.component_discounts.taxes.applied_discounts?.map((discount: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-{formatBreakdownAmount(discount.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final {taxInfo.local_tax_name.toLowerCase()}:</span>
                  <span>{formatBreakdownAmount(steps.component_discounts.taxes.final)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Payment Gateway Fee */}
          {steps.payment_gateway_fee > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Step 9: Payment Gateway Fee</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatBreakdownAmount(steps.payment_gateway_fee)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {rates.payment_gateway_fee_percentage}% + {formatBreakdownAmount(rates.payment_gateway_fee_fixed)} ({inputs.payment_gateway})
              </p>
            </div>
          )}

          {/* Total Savings */}
          {steps.total_savings > 0 && (
            <div className="p-3 bg-green-100 rounded-lg border border-green-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Total Savings</span>
                </div>
                <span className="text-sm font-semibold text-green-800">-{formatBreakdownAmount(steps.total_savings)}</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You saved {formatBreakdownAmount(steps.total_savings)} with applied discounts!
              </p>
            </div>
          )}

          <Separator />

          {/* Final Total */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold text-green-900">Total Amount</p>
                <p className="text-sm text-green-700">
                  {breakdownCurrency === destinationCurrency 
                    ? 'All costs included' 
                    : `Origin: ${breakdownCurrency} | Customer pays: ${destinationCurrency}`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-green-900">
                  {formatBreakdownAmount(getOriginTotal())}
                </p>
                {breakdownCurrency !== destinationCurrency && (
                  <AdminDestinationTotal 
                    getDestinationTotal={getDestinationTotal}
                    destinationCurrency={destinationCurrency}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Calculation Info */}
          <div className="text-xs text-gray-600 pt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span>Calculated: {new Date(calc.calculation_timestamp).toLocaleString()}</span>
              </div>
              {(calc._proportional_rounding_applied || calc.calculation_steps?._rounding_metadata) && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                  ✓ Proportional Rounding Applied
                </Badge>
              )}
            </div>
            <Badge variant="outline">Version: {calc.calculation_version}</Badge>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};