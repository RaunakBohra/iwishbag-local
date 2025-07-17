import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tables } from '@/integrations/supabase/types';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';

interface OrderReceiptProps {
  order: Tables<'quotes'> & {
    profiles?: { preferred_display_currency?: string } | null;
  };
}

export const OrderReceipt = ({ order }: OrderReceiptProps) => {
  const { formatAmount } = useQuoteDisplayCurrency({ quote: order });

  const costItems = [
    { label: 'Item Price', value: order.item_price },
    { label: 'Sales Tax', value: order.sales_tax_price },
    { label: 'Merchant Shipping', value: order.merchant_shipping_price },
    { label: 'International Shipping', value: order.international_shipping },
    { label: 'Customs & Duties', value: order.customs_and_ecs },
    { label: 'Domestic Shipping', value: order.domestic_shipping },
    { label: 'Handling Charge', value: order.handling_charge },
    { label: 'Insurance', value: order.insurance_amount },
    { label: 'Payment Gateway Fee', value: order.payment_gateway_fee },
    { label: 'VAT', value: order.vat },
    { label: 'Discount', value: order.discount, isNegative: true },
  ].filter((item) => typeof item.value === 'number' && item.value !== 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Receipt</CardTitle>
        <CardDescription>A detailed breakdown of your order costs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {costItems.map((item) => (
            <div key={item.label} className="flex justify-between items-center text-sm">
              <p className="text-muted-foreground">{item.label}</p>
              <p className={item.isNegative ? 'text-red-500' : ''}>
                {item.isNegative ? '-' : ''}
                {formatAmount(item.value)}
              </p>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex justify-between items-center text-lg font-bold">
          <p>Total</p>
          <p>{formatAmount(order.final_total)}</p>
        </div>
      </CardContent>
    </Card>
  );
};
