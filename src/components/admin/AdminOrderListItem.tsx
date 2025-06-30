import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { StatusBadge } from '@/components/dashboard/StatusBadge';

type OrderWithItems = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

interface AdminOrderListItemProps {
    order: OrderWithItems;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'paid':
        case 'ordered':
            return 'default';
        case 'shipped': 
            return 'secondary';
        case 'completed': 
            return 'outline';
        case 'cancelled': 
            return 'destructive';
        default: 
            return 'default';
    }
};

const getPriorityBadge = (priority: OrderWithItems['priority']) => {
  if (!priority) return null;

  const variants: { [key in NonNullable<OrderWithItems['priority']>]: 'outline' | 'secondary' | 'default' | 'destructive' } = {
    low: 'outline',
    medium: 'secondary',
    high: 'default',
    urgent: 'destructive',
  };

  return (
    <Badge variant={variants[priority]} className="capitalize">
      {priority}
    </Badge>
  );
};

export const AdminOrderListItem = ({ order, isSelected, onSelect }: AdminOrderListItemProps) => {
    const navigate = useNavigate();
    const { formatMultiCurrency } = useAdminCurrencyDisplay();
    const { formatAmount } = useUserCurrency();
    
    const firstItem = order.quote_items?.[0];
    const totalItems = order.quote_items?.length || 0;
    
    const itemSummary = firstItem?.product_name 
        ? `${firstItem.product_name}${totalItems > 1 ? ` and ${totalItems - 1} more` : ''}` 
        : order.product_name || "No items specified";

    const currencyDisplays = order.final_total ? formatMultiCurrency({
        usdAmount: order.final_total,
        quoteCurrency: order.final_currency,
        customerPreferredCurrency: order.profiles?.preferred_display_currency,
    }) : [];

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onSelect(order.id)}
                            aria-label="Select order"
                            className="mt-1"
                        />
                        <div className="flex-1 grid grid-cols-4 gap-4">
                            <div>
                                <h3 className="font-semibold">{order.order_display_id || order.display_id || itemSummary}</h3>
                                {order.order_display_id && <p className="text-sm text-muted-foreground">{itemSummary}</p>}
                                <p className="text-sm text-muted-foreground">Total items: {totalItems || order.quantity || 0}</p>
                                <p className="text-sm text-muted-foreground">{order.email}</p>
                            </div>
                            <div>
                                <p className="text-sm">Country: {order.country_code || 'Not set'}</p>
                                {order.tracking_number && (
                                    <p className="text-sm">Tracking: {order.tracking_number}</p>
                                )}
                            </div>
                            <div>
                                <div>
                                    <p className="text-sm mb-1">Order Total:</p>
                                    {order.final_total_local || order.final_total ? (
                                        <>
                                            <span className="font-semibold text-base">
                                                {formatAmount(order.final_total_local || order.final_total)}
                                            </span>
                                            {currencyDisplays.length > 0 && (
                                                <div className="mt-1">
                                                    <MultiCurrencyDisplay 
                                                        currencies={currencyDisplays}
                                                        compact={true}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Not calculated</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center flex-wrap gap-1">
                                    <StatusBadge status={order.status} />
                                    {getPriorityBadge(order.priority)}
                                </div>
                                {order.status === 'cancelled' && order.rejection_details && (
                                    <p className="text-xs text-red-600 mt-1" title={order.rejection_details}>
                                        <strong>Reason:</strong> {order.rejection_details}
                                    </p>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                    {order.paid_at ? new Date(order.paid_at).toLocaleDateString() : new Date(order.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                            View Details
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
