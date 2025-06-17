
import React from "react";
import { Separator } from "@/components/ui/separator";
import { Tables } from "@/integrations/supabase/types";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { MultiCurrencyDisplay } from "@/components/admin/MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";

type Quote = Tables<'quotes'> & {
  profiles?: { preferred_display_currency?: string } | null;
};

interface QuoteBreakdownDetailsProps {
  quote: Quote;
}

export const QuoteBreakdownDetails: React.FC<QuoteBreakdownDetailsProps> = ({ quote }) => {
  const { formatAmount } = useUserCurrency();
  const { formatMultiCurrency } = useAdminCurrencyDisplay();

  const renderRow = (label: string, amount: number | null, isDiscount = false) => {
    if (amount === null || amount === undefined || amount === 0) return null;
    
    const sign = isDiscount ? '-' : '';
    const colorClass = isDiscount ? 'text-green-600' : '';

    return (
      <div className={`flex justify-between ${colorClass}`}>
        <span>{label}:</span>
        <span>{sign}{formatAmount(amount)}</span>
      </div>
    );
  };

  const finalTotalCurrencies = quote.final_total ? formatMultiCurrency({
    usdAmount: quote.final_total,
    quoteCurrency: quote.final_currency,
    customerPreferredCurrency: quote.profiles?.preferred_display_currency,
  }) : [];
  
  return (
    <div>
      <h4 className="font-semibold mb-3">Quote Breakdown</h4>
      <div className="space-y-3 text-sm">
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
      </div>
      
      <Separator className="my-3" />
      
      <div className="space-y-3 text-sm font-medium">
        {renderRow("Subtotal", quote.sub_total)}
        {renderRow("VAT", quote.vat)}
      </div>
      
      <Separator className="my-3" />
      
      <div className="flex justify-between items-start font-semibold text-lg">
        <span>Total Amount:</span>
        <div className="text-right">
          <MultiCurrencyDisplay 
            currencies={finalTotalCurrencies}
            orientation="vertical"
            showLabels={true}
            compact={false}
          />
        </div>
      </div>
    </div>
  );
};
