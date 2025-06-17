
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tables } from "@/integrations/supabase/types";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { MultiCurrencyDisplay } from "@/components/admin/MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";

interface OrderReceiptProps {
    order: Tables<'quotes'> & {
        profiles?: { preferred_display_currency?: string } | null;
    };
}

export const OrderReceipt = ({ order }: OrderReceiptProps) => {
    const { formatAmount } = useUserCurrency();
    const { formatMultiCurrency } = useAdminCurrencyDisplay();
    
    const costItems = [
        { label: "Subtotal", value: order.sub_total },
        { label: "Domestic Shipping", value: order.domestic_shipping },
        { label: "Sales Tax", value: order.sales_tax_price },
        { label: "International Shipping", value: order.international_shipping },
        { label: "VAT", value: order.vat },
        { label: "Customs & ECS", value: order.customs_and_ecs },
        { label: "Handling Fee", value: order.handling_charge },
        { label: "Insurance", value: order.insurance_amount },
        { label: "Gateway Fee", value: order.payment_gateway_fee },
        { label: "Discount", value: order.discount, isNegative: true },
    ].filter(item => typeof item.value === 'number' && item.value > 0);

    const totalPaidCurrencies = order.final_total ? formatMultiCurrency({
        usdAmount: order.final_total,
        quoteCurrency: order.final_currency,
        customerPreferredCurrency: order.profiles?.preferred_display_currency,
        showAllVariations: false // Changed to false to show only USD and user currency
    }) : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Order Receipt</CardTitle>
                <CardDescription>A detailed breakdown of your order costs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {costItems.map(item => (
                        <div key={item.label} className="flex justify-between items-center text-sm">
                            <p className="text-muted-foreground">{item.label}</p>
                            <p className={item.isNegative ? "text-red-500" : ""}>
                                {item.isNegative ? "-" : ""}
                                {formatAmount(item.value)}
                            </p>
                        </div>
                    ))}
                </div>
                <Separator />
                <div className="flex justify-between items-start text-lg font-bold">
                    <p>Total Paid</p>
                    <div className="text-right">
                        <MultiCurrencyDisplay 
                            currencies={totalPaidCurrencies}
                            orientation="horizontal"
                            showLabels={false}
                            compact={false}
                            cleanFormat={true}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
