
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";

type Quote = Tables<'quotes'> & {
  profiles?: { preferred_display_currency?: string } | null;
};

interface QuoteCalculatedCostsProps {
  quote: Quote;
}

export const QuoteCalculatedCosts = ({ quote }: QuoteCalculatedCostsProps) => {
  const { formatMultiCurrency } = useAdminCurrencyDisplay();

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

  const renderRow = (label: string, value: number | null, isDiscount = false) => {
    if (value === null || value === undefined || value === 0) return null;

    const sign = isDiscount ? '-' : '';
    const currencies = formatMultiCurrency({
      usdAmount: value,
      quoteCurrency: quote.final_currency,
      customerPreferredCurrency: quote.profiles?.preferred_display_currency,
      showAllVariations: true // Changed to true to show both currencies
    });

    return (
      <div key={label} className="flex justify-between items-center">
        <p className="text-sm">{label}:</p>
        <div className="text-right">
          {sign && <span className="text-green-600">{sign}</span>}
          <MultiCurrencyDisplay 
            currencies={currencies}
            orientation="horizontal"
            showLabels={false}
            compact={false}
            cleanFormat={true}
          />
        </div>
      </div>
    );
  };

  const finalTotalCurrencies = formatMultiCurrency({
    usdAmount: quote.final_total,
    quoteCurrency: quote.final_currency,
    customerPreferredCurrency: quote.profiles?.preferred_display_currency,
    showAllVariations: true // Changed to true to show both currencies
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculated Costs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Description</span>
            <span className="font-medium text-right">Amount</span>
          </div>
          <div className="border-t my-1"></div>
          
          {renderRow("Total Item Price", quote.item_price)}
          {renderRow("Sales Tax", quote.sales_tax_price)}
          {renderRow("Merchant Shipping", quote.merchant_shipping_price)}
          {renderRow("International Shipping", quote.international_shipping)}
          {renderRow("Customs & ECS", quote.customs_and_ecs)}
          {renderRow("Domestic Shipping", quote.domestic_shipping)}
          {renderRow("Handling Charge", quote.handling_charge)}
          {renderRow("Insurance", quote.insurance_amount)}
          {renderRow("Payment Gateway Fee", quote.payment_gateway_fee)}
          {renderRow("Discount", quote.discount, true)}

          <div className="border-t my-2"></div>
          
          <div className="flex justify-between items-center">
            <p className="font-semibold">Subtotal:</p>
            <div className="text-right font-semibold">
              <MultiCurrencyDisplay 
                currencies={formatMultiCurrency({
                  usdAmount: quote.sub_total || 0,
                  quoteCurrency: quote.final_currency,
                  customerPreferredCurrency: quote.profiles?.preferred_display_currency,
                  showAllVariations: true // Changed to true to show both currencies
                })}
                orientation="horizontal"
                showLabels={false}
                compact={false}
                cleanFormat={true}
              />
            </div>
          </div>
          
          {renderRow("VAT", quote.vat)}

          <div className="border-t my-2"></div>

          <div className="flex justify-between items-center">
            <p className="font-semibold text-base">Final Total:</p>
            <div className="text-right">
              <MultiCurrencyDisplay 
                currencies={finalTotalCurrencies}
                orientation="horizontal"
                showLabels={false}
                cleanFormat={true}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
