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

  // Get the user's local currency (from profile) and purchase country currency (from quote)
  const purchaseCurrency = quote.currency || 'USD';
  const userCurrency = quote.profiles?.preferred_display_currency || purchaseCurrency;

  // Get the exchange rate (assume quote.exchange_rate is from purchaseCurrency to userCurrency)
  const exchangeRate = quote.exchange_rate || 1;

  // Calculate the local currency total
  const localTotal = quote.final_total && purchaseCurrency !== userCurrency
    ? (quote.final_total * exchangeRate)
    : null;

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥', 'CNY': '¥', 'SGD': 'S$', 'AED': 'د.إ', 'SAR': 'ر.س', 'NPR': '₨',
    };
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
  };

  // Get the original entered item price (sum of all items in purchase currency)
  const originalItemPrice = Array.isArray(quote.quote_items)
    ? quote.quote_items.reduce((sum, item) => sum + (item.item_price || 0), 0)
    : null;

  // Helper: should USD be shown?
  const shouldShowUSD = purchaseCurrency === 'USD' || userCurrency === 'USD';

  // Patch renderItemPriceRow to show symbol for purchase currency
  const renderItemPriceRow = () => {
    if (!originalItemPrice) return null;
    let currencies = formatMultiCurrency({
      usdAmount: quote.item_price,
      quoteCurrency: quote.final_currency,
      customerPreferredCurrency: quote.profiles?.preferred_display_currency,
      showAllVariations: true
    });
    currencies = currencies.map(c => {
      if (c.currency === purchaseCurrency) {
        // Add symbol to the original item price in the 'amount' field
        const symbols: { [key: string]: string } = {
          'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥', 'CNY': '¥', 'SGD': 'S$', 'AED': 'د.إ', 'SAR': 'ر.س', 'NPR': '₨',
        };
        const symbol = symbols[c.currency] || c.currency;
        return { ...c, amount: `${symbol}${originalItemPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` };
      }
      return c;
    });
    if (!shouldShowUSD) {
      currencies = currencies.filter(c => c.currency !== 'USD');
    }
    return (
      <div key="Total Item Price" className="flex justify-between items-center">
        <p className="text-sm">Total Item Price:</p>
        <div className="text-right">
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

  // Patch renderRow to filter out USD if not needed
  const renderRow = (label: string, value: number | null, isDiscount = false) => {
    if (value === null || value === undefined || value === 0) return null;

    const sign = isDiscount ? '-' : '';
    let currencies = formatMultiCurrency({
      usdAmount: value,
      quoteCurrency: quote.final_currency,
      customerPreferredCurrency: quote.profiles?.preferred_display_currency,
      showAllVariations: true
    });
    if (!shouldShowUSD) {
      currencies = currencies.filter(c => c.currency !== 'USD');
    }
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

  // Patch Final Total row to use correct values for each currency
  const renderFinalTotalRow = () => {
    // Get all currencies and their correct values
    let currencies = formatMultiCurrency({
      usdAmount: quote.final_total,
      quoteCurrency: quote.final_currency,
      customerPreferredCurrency: quote.profiles?.preferred_display_currency,
      showAllVariations: true
    });
    // Filter out USD if not needed
    if (!shouldShowUSD) {
      currencies = currencies.filter(c => c.currency !== 'USD');
    }
    return (
      <div className="flex justify-between items-center">
        <p className="font-semibold text-base">Final Total:</p>
        <div className="text-right font-semibold">
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

  // Patch Subtotal row to use correct values for each currency
  const renderSubtotalRow = () => {
    let currencies = formatMultiCurrency({
      usdAmount: quote.sub_total || 0,
      quoteCurrency: quote.final_currency,
      customerPreferredCurrency: quote.profiles?.preferred_display_currency,
      showAllVariations: true
    });
    if (!shouldShowUSD) {
      currencies = currencies.filter(c => c.currency !== 'USD');
    }
    return (
      <div className="flex justify-between items-center">
        <p className="font-semibold">Subtotal:</p>
        <div className="text-right font-semibold">
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
          
          {renderItemPriceRow()}
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
          
          {renderSubtotalRow()}
          
          {renderRow("VAT", quote.vat)}

          <div className="border-t my-2"></div>

          {renderFinalTotalRow()}
        </div>
      </CardContent>
    </Card>
  );
};
