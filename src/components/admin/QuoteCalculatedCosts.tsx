import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { DualCurrencyDisplay } from "./DualCurrencyDisplay";
import { useQuoteCurrencyDisplay } from "@/hooks/useCurrencyConversion";
import { Badge } from "@/components/ui/badge";

type Quote = Tables<'quotes'> & {
  profiles?: { preferred_display_currency?: string } | null;
  quote_items?: any[];
};

interface QuoteCalculatedCostsProps {
  quote: Quote;
}

export const QuoteCalculatedCosts = ({ quote }: QuoteCalculatedCostsProps) => {
  // Get origin and destination countries from quote
  const originCountry = quote.country_code || 'US';
  
  // Try to get destination country from shipping address
  let destinationCountry = 'US';
  if ((quote as any).destination_country) {
    destinationCountry = (quote as any).destination_country;
  } else if (quote.shipping_address) {
    try {
      const shippingAddress = typeof quote.shipping_address === 'string' 
        ? JSON.parse(quote.shipping_address) 
        : quote.shipping_address;
      
      // Get country from shipping address
      let country = shippingAddress?.country_code || shippingAddress?.country || 'US';
      
      // Convert country names to country codes
      const countryNameToCode: { [key: string]: string } = {
        'Nepal': 'NP',
        'India': 'IN', 
        'United States': 'US',
        'USA': 'US',
        'China': 'CN',
        'Australia': 'AU',
        'United Kingdom': 'GB',
        'Canada': 'CA'
      };
      
      // If it's a country name, convert to code
      if (countryNameToCode[country]) {
        destinationCountry = countryNameToCode[country];
      } else if (country.length === 2) {
        // Already a country code
        destinationCountry = country.toUpperCase();
      } else {
        destinationCountry = 'US';
      }
    } catch (e) {
      console.warn('Could not parse shipping address in QuoteCalculatedCosts:', e);
    }
  }

  // Use our new currency display hook
  const currencyDisplay = useQuoteCurrencyDisplay({
    originCountry,
    destinationCountry,
    isAdminView: true
  });

  if (!quote.final_total) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calculated Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No calculation performed yet. Please update the quote to see the cost breakdown.</p>
        </CardContent>
      </Card>
    );
  }

  // Get the original entered item price (sum of all items in origin currency)
  const originalItemPrice = Array.isArray(quote.quote_items)
    ? quote.quote_items.reduce((sum, item) => sum + (item.item_price || 0), 0)
    : null;

  // Render individual cost rows with dual currency
  const renderRow = (label: string, value: number | null, isDiscount = false) => {
    if (value === null || value === undefined || value === 0) return null;
    
    const formattedAmount = currencyDisplay.formatAmount(value);
    const sign = isDiscount ? '-' : '';
    
    return (
      <div className="flex justify-between">
        <span>{label}</span>
        <span className={isDiscount ? 'text-red-600' : ''}>
          {sign}
          {typeof formattedAmount === 'string' ? (
            formattedAmount
          ) : (
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
          )}
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
            <span className="font-medium text-right">Amount ({originCountry}/{destinationCountry})</span>
          </div>
          <div className="border-t my-1"></div>
          
          {/* Item Price */}
          {originalItemPrice && renderRow("Total Item Price", originalItemPrice)}
          
          {/* Other costs */}
          {renderRow("Sales Tax", (quote as any).salesTaxPrice)}
          {renderRow("Merchant Shipping", (quote as any).merchantShippingPrice)}
          {renderRow("International Shipping", (quote as any).interNationalShipping)}
          {renderRow("Customs & ECS", (quote as any).customsAndECS)}
          {renderRow("Domestic Shipping", (quote as any).domesticShipping)}
          {renderRow("Handling Charge", (quote as any).handlingCharge)}
          {renderRow("Insurance", (quote as any).insuranceAmount)}
          {renderRow("Payment Gateway Fee", (quote as any).paymentGatewayFee)}
          {renderRow("Discount", (quote as any).discount, true)}

          <div className="border-t my-2"></div>
          
          {/* Subtotal */}
          {quote.sub_total && renderRow("Subtotal", quote.sub_total)}
          
          {/* VAT */}
          {quote.vat && renderRow("VAT", quote.vat)}

          <div className="border-t my-2"></div>

          {/* Final Total */}
          <div className="flex justify-between items-center">
            <p className="font-semibold text-base">Final Total:</p>
            <div className="text-right font-semibold">
              <DualCurrencyDisplay
                amount={quote.final_total}
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
