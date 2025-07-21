import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { useDualCurrency } from '@/hooks/useCurrency';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Badge } from '@/components/ui/badge';
import { getCurrencySymbolFromCountry } from '@/lib/currencyUtils';
import { useQuoteRoute } from '@/hooks/useQuoteRoute';

interface QuoteItem {
  item_price?: number;
  item_weight?: number;
  quantity?: number;
  product_name?: string;
}

interface QuoteWithCosts extends Tables<'quotes'> {
  profiles?: { preferred_display_currency?: string } | null;
  quote_items?: QuoteItem[];
  salesTaxPrice?: number;
  merchantShippingPrice?: number;
  interNationalShipping?: number;
  customsAndECS?: number;
  domesticShipping?: number;
  handlingCharge?: number;
  insuranceAmount?: number;
  paymentGatewayFee?: number;
  discount?: number;
}

interface QuoteCalculatedCostsProps {
  quote: QuoteWithCosts;
}

export const QuoteCalculatedCosts = ({ quote }: QuoteCalculatedCostsProps) => {
  // Use unified route determination - same as customs tiers and shipping routes
  const routeInfo = useQuoteRoute(quote);

  // Default to US if route info is not available yet
  const originCountry = routeInfo?.origin || 'US';
  const destinationCountry = routeInfo?.destination || 'US';

  const { data: allCountries } = useAllCountries();

  // Get destination currency from countries data
  const destinationCurrency = useMemo(() => {
    if (!allCountries || !destinationCountry) return 'USD';
    const country = allCountries.find((c) => c.code === destinationCountry);
    return country?.currency || 'USD';
  }, [allCountries, destinationCountry]);

  // Use dual currency display for admin views, but prioritize route exchange rate
  const dualCurrencyDisplay = useDualCurrency(
    destinationCurrency,
    originCountry,
    destinationCountry,
  );

  // Create compatibility object for existing display logic
  // Prioritize route-specific exchange rate over country settings
  const routeExchangeRate = routeInfo?.route?.exchange_rate;
  const finalExchangeRate = routeExchangeRate || dualCurrencyDisplay.local?.exchangeRate || 1;

  const currencyDisplay = {
    exchangeRate: finalExchangeRate,
    exchangeRateSource: routeExchangeRate ? 'shipping_route' : ('database' as const),
    warning: null,
  };

  console.log('[QuoteCalculatedCosts Debug] Exchange rate selection:', {
    routeExchangeRate,
    dualCurrencyExchangeRate: dualCurrencyDisplay.local?.exchangeRate,
    finalExchangeRate,
    source: currencyDisplay.exchangeRateSource,
  });

  if (!quote.final_total_usd) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calculated Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No calculation performed yet. Please update the quote to see the cost breakdown.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get the original entered item price (sum of all items in origin currency)
  const originalItemPrice = Array.isArray(quote.items)
    ? quote.items.reduce((sum, item) => sum + (item.price_usd || 0), 0)
    : null;

  // Render individual cost rows with dual currency
  const renderRow = (label: string, value: number | null, isDiscount = false) => {
    if (value === null || value === undefined || value === 0) return null;

    const sign = isDiscount ? '-' : '';

    return (
      <div className="flex justify-between">
        <span>{label}</span>
        <span className={isDiscount ? 'text-red-600' : ''}>
          {sign}
          <DualCurrencyDisplay
            amount={value}
            originCountry={originCountry}
            destinationCountry={destinationCountry}
            exchangeRate={currencyDisplay.exchangeRate}
            exchangeRateSource={currencyDisplay.exchangeRateSource}
            warning={currencyDisplay.warning}
            showTooltip={false}
            className="text-sm"
          />
        </span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Calculated Costs
          {currencyDisplay.warning && (
            <Badge variant="outline" className="text-xs">
              {currencyDisplay.exchangeRateSource === 'fallback' ? 'No Rate' : 'USD Rate'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Description</span>
            <span className="font-medium text-right">
              Amount ({getCurrencySymbolFromCountry(originCountry)}/
              {getCurrencySymbolFromCountry(destinationCountry)})
            </span>
          </div>
          <div className="border-t my-1"></div>

          {/* Item Price */}
          {originalItemPrice && renderRow('Total Item Price', originalItemPrice)}

          {/* Other costs */}
          {renderRow('Sales Tax', quote.salesTaxPrice)}
          {renderRow('Merchant Shipping', quote.merchantShippingPrice)}
          {renderRow('International Shipping', quote.interNationalShipping)}
          {renderRow('Customs & ECS', quote.customsAndECS)}
          {renderRow('Domestic Shipping', quote.domesticShipping)}
          {renderRow('Handling Charge', quote.handlingCharge)}
          {renderRow('Insurance', quote.insuranceAmount)}
          {renderRow('Payment Gateway Fee', quote.paymentGatewayFee)}
          {renderRow('Discount', quote.discount, true)}

          <div className="border-t my-2"></div>

          {/* Subtotal */}
          {quote.sub_total && renderRow('Subtotal', quote.sub_total)}

          {/* VAT */}
          {quote.vat && renderRow('VAT', quote.vat)}

          <div className="border-t my-2"></div>

          {/* Final Total */}
          <div className="flex justify-between items-center">
            <p className="font-semibold text-base">Final Total:</p>
            <div className="text-right font-semibold">
              <DualCurrencyDisplay
                amount={quote.final_total_usd}
                originCountry={originCountry}
                destinationCountry={destinationCountry}
                exchangeRate={currencyDisplay.exchangeRate}
                exchangeRateSource={currencyDisplay.exchangeRateSource}
                warning={currencyDisplay.warning}
                showTooltip={true}
                className="text-base"
              />
            </div>
          </div>

          {/* Exchange Rate Info */}
          {currencyDisplay.warning && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              <strong>Note:</strong> {currencyDisplay.warning}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
