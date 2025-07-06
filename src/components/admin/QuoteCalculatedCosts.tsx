import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";

type Quote = Tables<'quotes'> & {
  profiles?: { preferred_display_currency?: string } | null;
  quote_items?: any[];
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
    // Debug: Log item price USD value and displayed values
    console.log(`[Breakdown Debug] Total Item Price: USD value =`, quote.item_price, '| Displayed =', currencies.map(c => `${c.amount} (${c.currency})`).join(' / '));
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
  const renderRow = (label: string, value: number | null, isDiscount = false, originalFieldName?: string) => {
    // Get the original input value from the quote object (in purchase currency)
    let originalInput = undefined;
    if (originalFieldName && quote[originalFieldName] !== undefined) {
      originalInput = quote[originalFieldName];
    }
    
    // Use the value directly (camelCase fields now contain USD values)
    let usdValue = value || 0;
    
    // Debug: Log calculated value and displayed values side by side, even for 0/null
    let currencies = formatMultiCurrency({
      usdAmount: usdValue,
      quoteCurrency: quote.final_currency,
      customerPreferredCurrency: quote.profiles?.preferred_display_currency,
      showAllVariations: true
    });
    if (!shouldShowUSD) {
      currencies = currencies.filter(c => c.currency !== 'USD');
    }
    
    console.log(`[Breakdown Debug] ${label}: USD value =`, usdValue, '| Displayed =', currencies.map(c => `${c.amount} (${c.currency})`).join(' / '), '| Original input =', originalInput);

    if (usdValue === null || usdValue === undefined || usdValue === 0) return null;
    const sign = isDiscount ? '-' : '';
    return (
      <div className="flex justify-between">
        <span>{label}</span>
        <span className={isDiscount ? 'text-red-600' : ''}>
          {sign}{currencies.map((c, i) => (
            <span key={c.currency} className={i > 0 ? 'ml-2 text-muted-foreground' : ''}>{c.amount} <span className="text-xs">{c.currency}</span></span>
          ))}
        </span>
      </div>
    );
  };

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
    // Debug: Log final total USD value and displayed values
    console.log(`[Breakdown Debug] Final Total: USD value =`, quote.final_total, '| Displayed =', currencies.map(c => `${c.amount} (${c.currency})`).join(' / '));
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
    // Debug: Log subtotal USD value and displayed values
    console.log(`[Breakdown Debug] Subtotal: USD value =`, quote.sub_total, '| Displayed =', currencies.map(c => `${c.amount} (${c.currency})`).join(' / '));
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

  // Patch VAT row to use correct values for each currency
  const renderVatRow = () => {
    let currencies = formatMultiCurrency({
      usdAmount: quote.vat || 0,
      quoteCurrency: quote.final_currency,
      customerPreferredCurrency: quote.profiles?.preferred_display_currency,
      showAllVariations: true
    });
    if (!shouldShowUSD) {
      currencies = currencies.filter(c => c.currency !== 'USD');
    }
    // Debug: Log VAT USD value and displayed values
    console.log(`[Breakdown Debug] VAT: USD value =`, quote.vat, '| Displayed =', currencies.map(c => `${c.amount} (${c.currency})`).join(' / '));
    return (
      <div className="flex justify-between items-center">
        <p className="font-semibold">VAT:</p>
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
          {renderRow("Sales Tax", (quote as any).salesTaxPrice, false, 'sales_tax_price')}
          {renderRow("Merchant Shipping", (quote as any).merchantShippingPrice, false, 'merchant_shipping_price')}
          {renderRow("International Shipping", (quote as any).interNationalShipping, false)}
          {renderRow("Customs & ECS", (quote as any).customsAndECS, false)}
          {renderRow("Domestic Shipping", (quote as any).domesticShipping, false, 'domestic_shipping')}
          {renderRow("Handling Charge", (quote as any).handlingCharge, false, 'handling_charge')}
          {renderRow("Insurance", (quote as any).insuranceAmount, false, 'insurance_amount')}
          {renderRow("Payment Gateway Fee", (quote as any).paymentGatewayFee, false)}
          {renderRow("Discount", (quote as any).discount, true, 'discount')}

          <div className="border-t my-2"></div>
          
          {renderSubtotalRow()}
          {renderVatRow()}

          <div className="border-t my-2"></div>

          {renderFinalTotalRow()}
        </div>
      </CardContent>
    </Card>
  );
};
