import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plane, MapPin, CreditCard, Package, Calculator, Building2, Home, Globe } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import type { UnifiedQuote } from '@/types/unified-quote';

type Quote = Tables<'quotes'>;
type CountrySettings = Tables<'country_settings'>;

interface QuoteBreakdownDetailsProps {
  quote: UnifiedQuote;
  countrySettings?: CountrySettings | null;
}

export const QuoteBreakdownDetails: React.FC<QuoteBreakdownDetailsProps> = ({
  quote,
  countrySettings
}) => {
  // Get currency formatting from unified hook
  const { formatPrice, formatPriceWithUSD, displayCurrency, exchangeRate } = useQuoteDisplayCurrency(quote);

  // Extract breakdown data from quote
  const breakdown = quote.calculation_data?.breakdown || {};
  const itemsTotal = breakdown.items_total || quote.item_price || 0;
  const shippingTotal = breakdown.shipping || 
    (quote.international_shipping || 0) + 
    (quote.domestic_shipping || 0) + 
    (quote.merchant_shipping_price || 0);
  const customsTotal = breakdown.customs || quote.customs_and_ecs || 0;
  const feesTotal = breakdown.fees || 
    (quote.handling_charge || 0) + 
    (quote.insurance_amount || 0) + 
    (quote.payment_gateway_fee || 0);
  const discount = breakdown.discount || quote.discount || 0;
  const finalTotal = quote.final_total_usd || 0;

  // Enhanced tax breakdown with detailed categories
  const getDetailedTaxBreakdown = () => {
    const taxBreakdown = [];
    const hsn_breakdown = quote.calculation_data?.hsn_breakdown || [];
    
    // Aggregate tax data from HSN breakdown for detailed display
    let totalGST = 0, totalVAT = 0, totalStateTax = 0, totalLocalTax = 0;
    let totalPST = 0, totalCESS = 0, totalExcise = 0, totalServiceTax = 0;
    
    hsn_breakdown.forEach(item => {
      const localTax = item.local_tax_calculation;
      if (localTax?.breakdown) {
        totalStateTax += localTax.breakdown.state_tax || 0;
        totalLocalTax += localTax.breakdown.local_tax || 0;
        totalCESS += localTax.breakdown.additional_taxes || 0;
      }
      
      // Categorize by tax type
      switch (localTax?.tax_type) {
        case 'gst':
          totalGST += localTax.amount_origin_currency || 0;
          break;
        case 'vat':
          totalVAT += localTax.amount_origin_currency || 0;
          break;
        case 'pst':
          totalPST += localTax.amount_origin_currency || 0;
          break;
        case 'excise_tax':
          totalExcise += localTax.amount_origin_currency || 0;
          break;
        case 'service_tax':
          totalServiceTax += localTax.amount_origin_currency || 0;
          break;
      }
    });

    // Build detailed tax breakdown based on destination country
    const destinationCountry = quote.destination_country;
    
    if (destinationCountry === 'US' && (totalStateTax > 0 || totalLocalTax > 0)) {
      // US: Show state and local taxes separately
      if (totalStateTax > 0) {
        taxBreakdown.push({
          label: 'State Sales Tax',
          amount: totalStateTax,
          icon: Building2,
          description: 'State-level sales tax',
          color: 'text-blue-600'
        });
      }
      if (totalLocalTax > 0) {
        taxBreakdown.push({
          label: 'Local Sales Tax',
          amount: totalLocalTax,
          icon: Home,
          description: 'City/county local sales tax',
          color: 'text-green-600'
        });
      }
    } else if (destinationCountry === 'IN' && (totalGST > 0 || totalCESS > 0)) {
      // India: Show GST and CESS
      if (totalGST > 0) {
        taxBreakdown.push({
          label: 'GST (India)',
          amount: totalGST,
          icon: Calculator,
          description: 'Goods and Services Tax',
          color: 'text-orange-600'
        });
      }
      if (totalCESS > 0) {
        taxBreakdown.push({
          label: 'CESS',
          amount: totalCESS,
          icon: Calculator,
          description: 'Additional tax on specific goods',
          color: 'text-red-600'
        });
      }
    } else if (destinationCountry === 'CA' && (totalGST > 0 || totalPST > 0)) {
      // Canada: Show GST and PST
      if (totalGST > 0) {
        taxBreakdown.push({
          label: 'GST (Canada)',
          amount: totalGST,
          icon: Calculator,
          description: 'Goods and Services Tax',
          color: 'text-blue-600'
        });
      }
      if (totalPST > 0) {
        taxBreakdown.push({
          label: 'PST',
          amount: totalPST,
          icon: Building2,
          description: 'Provincial Sales Tax',
          color: 'text-green-600'
        });
      }
    } else {
      // Other countries: Show consolidated taxes with specific types
      const totalTaxes = breakdown.taxes || quote.vat || 0;
      
      if (totalVAT > 0) {
        taxBreakdown.push({
          label: `VAT (${destinationCountry})`,
          amount: totalVAT,
          icon: Globe,
          description: 'Value Added Tax',
          color: 'text-purple-600'
        });
      } else if (totalGST > 0) {
        taxBreakdown.push({
          label: `GST (${destinationCountry})`,
          amount: totalGST,
          icon: Calculator,
          description: 'Goods and Services Tax',
          color: 'text-orange-600'
        });
      } else if (totalTaxes > 0) {
        taxBreakdown.push({
          label: 'Local Taxes',
          amount: totalTaxes,
          icon: Calculator,
          description: 'Local taxes and duties',
          color: 'text-green-600'
        });
      }
      
      // Show additional tax types if present
      if (totalExcise > 0) {
        taxBreakdown.push({
          label: 'Excise Tax',
          amount: totalExcise,
          icon: Calculator,
          description: 'Federal excise tax',
          color: 'text-red-600'
        });
      }
      
      if (totalServiceTax > 0) {
        taxBreakdown.push({
          label: 'Service Tax',
          amount: totalServiceTax,
          icon: Calculator,
          description: 'Service-related tax',
          color: 'text-indigo-600'
        });
      }
    }
    
    return taxBreakdown;
  };

  const breakdownItems = [
    {
      label: 'Items Total',
      amount: itemsTotal,
      icon: Package,
      description: 'Total cost of all items',
      color: 'text-blue-600'
    },
    {
      label: 'Shipping Costs',
      amount: shippingTotal,
      icon: Plane,
      description: 'International + domestic + merchant shipping',
      color: 'text-purple-600'
    },
    {
      label: 'Customs Duties',
      amount: customsTotal,
      icon: MapPin,
      description: 'Import duties and customs charges',
      color: 'text-orange-600'
    },
    ...getDetailedTaxBreakdown(), // Insert detailed tax breakdown
    {
      label: 'Processing Fees',
      amount: feesTotal,
      icon: CreditCard,
      description: 'Payment processing and handling charges',
      color: 'text-gray-600'
    }
  ];

  // Filter out zero amounts for cleaner display
  const nonZeroItems = breakdownItems.filter(item => item.amount > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <DollarSign className="mr-2 h-5 w-5" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breakdown Items */}
        <div className="space-y-3">
          {nonZeroItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPrice(item.amount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Discount */}
        {discount > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-sm font-medium text-green-900">Discount Applied</p>
                  <p className="text-xs text-green-600">Savings on your order</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-700">
                  -{formatPrice(discount)}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Final Total */}
        <Separator />
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
          <div>
            <p className="text-lg font-semibold text-gray-900">Total Amount</p>
            <p className="text-sm text-gray-600">
              {quote.destination_country ? `Delivered to ${quote.destination_country}` : 'Final cost'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatPrice(finalTotal)}
            </p>
            {displayCurrency !== 'USD' && (
              <p className="text-sm text-gray-500">
                ≈ ${finalTotal.toFixed(2)} USD
              </p>
            )}
          </div>
        </div>

        {/* Additional Information */}
        {displayCurrency !== 'USD' && exchangeRate && exchangeRate !== 1 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Exchange Rate:</strong> 1 USD = {exchangeRate.toFixed(4)} {displayCurrency}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Rates updated regularly to ensure accurate pricing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};