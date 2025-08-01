import React from 'react';
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
  total_usd: number;
  total_customer_currency: number;
  customer_currency: string;
  created_at: string;
  calculated_at?: string;
}

interface QuoteBreakdownV2Props {
  quote: QuoteV2;
}

export const QuoteBreakdownV2: React.FC<QuoteBreakdownV2Props> = ({ quote }) => {
  if (!quote.calculation_data || !quote.calculation_data.calculation_steps) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500 text-center">No calculation data available</p>
        </CardContent>
      </Card>
    );
  }

  const calc = quote.calculation_data;
  
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
    total_usd: 0,
    total_customer_currency: 0
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{quote.quote_number}</CardTitle>
              <p className="text-gray-500 mt-1">{quote.customer_email}</p>
            </div>
            <Badge className={getStatusColor(quote.status)}>
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created</span>
              <p className="font-medium">{new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Route</span>
              <p className="font-medium">{inputs.origin_country} → {inputs.destination_country}</p>
            </div>
            <div>
              <span className="text-gray-500">Items</span>
              <p className="font-medium">{quote.items.length} items</p>
            </div>
            <div>
              <span className="text-gray-500">Total Weight</span>
              <p className="font-medium">{inputs.total_weight_kg} kg</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applied Discount Codes */}
      {quote.discount_codes && quote.discount_codes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Applied Discount Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quote.discount_codes.map((code, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <Check className="w-3 h-3 mr-1" />
                  {code}
                </Badge>
              ))}
            </div>
            {steps.total_savings > 0 && (
              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-sm text-green-700 font-medium">
                  🎉 Total savings from coupons: ${steps.total_savings.toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Applied Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Applied Rates & Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-blue-900 mb-2">Tax Configuration for {taxInfo.country}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Customs Rate:</span>
                <p className="font-bold text-lg">
                  {rates.customs_percentage}%
                  {rates.hsn_applied && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      HSN Applied
                    </Badge>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-600">{taxInfo.local_tax_name}:</span>
                <p className="font-bold text-lg">{rates.local_tax_percentage}%</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Exchange Rate</span>
              <p className="font-medium">1 USD = {rates.exchange_rate} {quote.customer_currency}</p>
            </div>
            <div>
              <span className="text-gray-500">Shipping Method</span>
              <p className="font-medium capitalize">{inputs.shipping_method}</p>
            </div>
            <div>
              <span className="text-gray-500">Shipping Rate</span>
              <p className="font-medium">${rates.shipping_rate_per_kg}/kg</p>
            </div>
            {rates.insurance_percentage > 0 && (
              <div>
                <span className="text-gray-500">Insurance Rate</span>
                <p className="font-medium">{rates.insurance_percentage}% of value</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Items ({quote.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quote.items.map((item, index) => (
              <div key={item.id || index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <div className="text-sm text-gray-500 mt-1">
                    Qty: {item.quantity} × ${item.unit_price_usd} = ${(item.quantity * item.unit_price_usd).toFixed(2)}
                  </div>
                  {item.weight_kg && (
                    <div className="text-sm text-gray-500">
                      Weight: {item.weight_kg}kg each ({(item.quantity * item.weight_kg).toFixed(2)}kg total)
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="pt-3 border-t">
              <div className="flex justify-between font-medium">
                <span>Items Subtotal</span>
                <span>${steps.items_subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Calculation Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Items Subtotal */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="font-medium">Step 1: Items Subtotal</span>
              </div>
              <span className="font-bold">${steps.items_subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Item Discounts */}
          {steps.item_discounts > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Item-level Discounts</span>
                </div>
                <span className="font-bold text-green-800">-${steps.item_discounts.toFixed(2)}</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Applied to individual items = ${steps.discounted_items_subtotal.toFixed(2)} after discounts
              </p>
            </div>
          )}

          {/* Order Discount */}
          {steps.order_discount_amount > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Order Discount</span>
                </div>
                <span className="font-bold text-green-800">-${steps.order_discount_amount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Origin Sales Tax */}
          {steps.origin_sales_tax > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Step 2: Origin Sales Tax</span>
                </div>
                <span className="font-bold">${steps.origin_sales_tax.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {rates.origin_sales_tax_percentage}% sales tax in {inputs.origin_state || inputs.origin_country}
              </p>
            </div>
          )}

          {/* Step 3: International Shipping */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="font-medium">Step 3: International Shipping</span>
              </div>
              <span className="font-bold">${steps.shipping_cost.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {inputs.total_weight_kg}kg × ${rates.shipping_rate_per_kg}/kg = ${steps.shipping_cost.toFixed(2)}
            </p>
          </div>

          {/* Shipping Discount - Legacy */}
          {steps.shipping_discount_amount > 0 && !steps.component_discounts?.shipping && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Shipping Discount</span>
                </div>
                <span className="font-bold text-green-800">-${steps.shipping_discount_amount.toFixed(2)}</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Final shipping cost: ${steps.discounted_shipping_cost.toFixed(2)}
              </p>
            </div>
          )}

          {/* Shipping Component Discount */}
          {steps.component_discounts?.shipping && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Shipping Discount</span>
                </div>
                <span className="font-bold text-green-800">-${steps.component_discounts.shipping.discount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-green-600 mt-2">
                {steps.component_discounts.shipping.applied_discounts?.map((discount, index) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-${discount.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final shipping cost:</span>
                  <span>${steps.component_discounts.shipping.final.toFixed(2)}</span>
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
                  <span className="font-medium">Step 4: Insurance</span>
                </div>
                <span className="font-bold">${steps.insurance_amount.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {rates.insurance_percentage}% of order value = ${steps.insurance_amount.toFixed(2)}
              </p>
            </div>
          )}

          {/* CIF Value */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-blue-900">CIF Value</p>
                <p className="text-sm text-blue-700">Cost + Insurance + Freight</p>
              </div>
              <span className="font-bold text-lg text-blue-900">${steps.cif_value.toFixed(2)}</span>
            </div>
          </div>

          {/* Step 5: Customs Duty */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="font-medium">Step 5: Customs Duty</span>
              </div>
              <span className="font-bold">${steps.customs_duty.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {rates.customs_percentage}% of CIF ${steps.cif_value.toFixed(2)} = ${steps.customs_duty.toFixed(2)}
            </p>
          </div>

          {/* Customs Discount */}
          {steps.component_discounts?.customs && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Customs Discount</span>
                </div>
                <span className="font-bold text-green-800">-${steps.component_discounts.customs.discount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-green-600 mt-2">
                {steps.component_discounts.customs.applied_discounts?.map((discount, index) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-${discount.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final customs duty:</span>
                  <span>${steps.component_discounts.customs.final.toFixed(2)}</span>
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
                <span className="font-bold">${steps.handling_fee.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {rates.handling_fee_fixed > 0 && rates.handling_fee_percentage > 0 
                  ? `$${rates.handling_fee_fixed} fixed + ${rates.handling_fee_percentage}% of order`
                  : rates.handling_fee_fixed > 0 
                    ? `$${rates.handling_fee_fixed} fixed fee`
                    : `${rates.handling_fee_percentage}% of order value`
                }
              </p>
            </div>
          )}

          {/* Handling Fee Discount */}
          {steps.component_discounts?.handling && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Handling Fee Discount</span>
                </div>
                <span className="font-bold text-green-800">-${steps.component_discounts.handling.discount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-green-600 mt-2">
                {steps.component_discounts.handling.applied_discounts?.map((discount, index) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-${discount.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final handling fee:</span>
                  <span>${steps.component_discounts.handling.final.toFixed(2)}</span>
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
                <span className="font-bold">${steps.domestic_delivery.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {inputs.destination_state === 'rural' ? 'Rural' : 'Urban'} delivery in {inputs.destination_country}
              </p>
            </div>
          )}

          {/* Delivery Discount */}
          {steps.component_discounts?.delivery && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Delivery Discount</span>
                </div>
                <span className="font-bold text-green-800">-${steps.component_discounts.delivery.discount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-green-600 mt-2">
                {steps.component_discounts.delivery.applied_discounts?.map((discount, index) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-${discount.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final delivery fee:</span>
                  <span>${steps.component_discounts.delivery.final.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Taxable Value */}
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-orange-900">Taxable Value</p>
                <p className="text-sm text-orange-700">All costs before local tax</p>
              </div>
              <span className="font-bold text-lg text-orange-900">${steps.taxable_value.toFixed(2)}</span>
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
                <span className="font-bold">${steps.local_tax_amount.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {rates.local_tax_percentage}% of taxable value ${steps.taxable_value.toFixed(2)} = ${steps.local_tax_amount.toFixed(2)}
              </p>
            </div>
          )}

          {/* Tax Discount */}
          {steps.component_discounts?.taxes && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">{taxInfo.local_tax_name} Discount</span>
                </div>
                <span className="font-bold text-green-800">-${steps.component_discounts.taxes.discount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-green-600 mt-2">
                {steps.component_discounts.taxes.applied_discounts?.map((discount, index) => (
                  <div key={index} className="flex justify-between">
                    <span>• {discount.description}</span>
                    <span>-${discount.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-green-300">
                  <span>Final {taxInfo.local_tax_name.toLowerCase()}:</span>
                  <span>${steps.component_discounts.taxes.final.toFixed(2)}</span>
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
                <span className="font-bold">${steps.payment_gateway_fee.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {rates.payment_gateway_fee_percentage}% + ${rates.payment_gateway_fee_fixed} ({inputs.payment_gateway})
              </p>
            </div>
          )}

          {/* Total Savings */}
          {steps.total_savings > 0 && (
            <div className="p-3 bg-green-100 rounded-lg border border-green-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Total Savings</span>
                </div>
                <span className="font-bold text-green-800">-${steps.total_savings.toFixed(2)}</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                You saved ${steps.total_savings.toFixed(2)} with applied discounts!
              </p>
            </div>
          )}

          <Separator />

          {/* Final Total */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-green-900 text-lg">Total Amount</p>
                <p className="text-sm text-green-700">All costs included</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-2xl text-green-900">
                  ${(steps.total_usd || quote.total_usd || 0).toFixed(2)}
                </p>
                <p className="text-lg text-green-700">
                  {currencyService.formatAmount(
                    steps.total_customer_currency || quote.total_customer_currency || 0, 
                    quote.customer_currency
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Calculation Info */}
          <div className="text-xs text-gray-500 pt-2 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span>Calculated: {new Date(calc.calculation_timestamp).toLocaleString()}</span>
            </div>
            <Badge variant="outline">Version: {calc.calculation_version}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};