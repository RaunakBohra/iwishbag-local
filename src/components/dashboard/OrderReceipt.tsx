import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tables } from '@/integrations/supabase/types';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import {
  applyCustomerFriendlyRounding,
  getRoundingExplanation,
} from '@/utils/customerFriendlyRounding';
import { Info } from 'lucide-react';

interface OrderReceiptProps {
  order: Tables<'quotes'> & {
    profiles?: { preferred_display_currency?: string } | null;
  };
}

export const OrderReceipt = ({ order }: OrderReceiptProps) => {
  const { formatAmount, currency } = useQuoteCurrency(order);

  // Apply customer-friendly rounding to final total only
  const finalTotal = order.final_total_origincurrency || 0;
  const roundingResult = applyCustomerFriendlyRounding(finalTotal, currency);
  const roundingExplanation = getRoundingExplanation(finalTotal, currency);

  const costItems = [
    { label: 'Item Price', value: order.item_price },
    { label: 'Sales Tax', value: order.calculation_data?.breakdown?.taxes },
    { label: 'International Shipping', value: order.calculation_data?.breakdown?.shipping },
    { label: 'Customs & Duties', value: order.calculation_data?.breakdown?.customs },
    { label: 'Processing Fees', value: order.calculation_data?.breakdown?.fees },
    { label: 'Domestic Shipping', value: order.domestic_shipping },
    { label: 'Handling Charge', value: order.handling_charge },
    { label: 'Insurance', value: order.insurance_amount },
    { label: 'Payment Gateway Fee', value: order.payment_gateway_fee },
    { label: 'VAT', value: order.vat },
    { label: 'Discount', value: order.calculation_data?.breakdown?.discount, isNegative: true },
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
          <p>{formatAmount(roundingResult.roundedAmount)}</p>
        </div>

        {/* Customer-friendly rounding explanation */}
        {roundingExplanation && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center text-sm text-green-700">
              <Info className="h-4 w-4 mr-2 shrink-0" />
              <span>{roundingExplanation}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
