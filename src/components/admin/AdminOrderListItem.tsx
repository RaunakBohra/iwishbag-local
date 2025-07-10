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
import { 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Copy, 
  Eye, 
  Calendar,
  User,
  Package,
  DollarSign,
  AlertTriangle,
  Phone,
  MapPin,
  CheckCircle,
  MessageSquare
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getQuoteRouteCountries } from '@/lib/route-specific-customs';
import { useCountryUtils, formatShippingRoute } from '@/lib/countryUtils';
import { extractShippingAddressFromNotes } from '@/lib/addressUpdates';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type OrderWithItems = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

interface AdminOrderListItemProps {
    order: OrderWithItems;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onConfirmPayment?: (order: OrderWithItems) => void;
}

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

export const AdminOrderListItem = ({ order, isSelected, onSelect, onConfirmPayment }: AdminOrderListItemProps) => {
    const navigate = useNavigate();
    const { formatMultiCurrency } = useAdminCurrencyDisplay();
    const { formatAmount } = useUserCurrency();
    
    // Get message count for this order
    const { data: messageCount = 0 } = useQuery({
        queryKey: ['quote-messages-count', order.id],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('quote_id', order.id);
            if (error) return 0;
            return count || 0;
        },
        staleTime: 30000, // Cache for 30 seconds
    });
    
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
                        {/* Product Image */}
                        {firstItem?.image_url && (
                            <div className="flex-shrink-0">
                                <img 
                                    src={firstItem.image_url} 
                                    alt="Product" 
                                    className="w-12 h-12 object-cover rounded border"
                                />
                            </div>
                        )}
                        <div className="flex-1 grid grid-cols-4 gap-4">
                            <div>
                                <h3 className="font-semibold">{order.order_display_id || order.display_id || itemSummary}</h3>
                                {order.order_display_id && <p className="text-sm text-muted-foreground">{itemSummary}</p>}
                                <p className="text-sm text-muted-foreground">Total items: {totalItems || order.quantity || 0}</p>
                                <p className="text-sm text-muted-foreground">{order.email}</p>
                                {/* Payment Status Display */}
                                {(order.payment_status && order.payment_status !== 'unpaid') && (
                                    <div className="mt-1 flex items-center gap-2">
                                        <Badge 
                                            variant={
                                                order.payment_status === 'paid' ? 'default' : 
                                                order.payment_status === 'partial' ? 'warning' : 
                                                order.payment_status === 'overpaid' ? 'secondary' : 
                                                'outline'
                                            }
                                            className="text-xs"
                                        >
                                            {order.payment_status === 'partial' && (
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                            )}
                                            {order.payment_status === 'partial' 
                                                ? `Partial: $${order.amount_paid || 0} of $${order.final_total || 0}`
                                                : order.payment_status === 'overpaid'
                                                ? `Overpaid: +$${order.overpayment_amount || 0}`
                                                : 'Paid'
                                            }
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm">Country: {order.destination_country || 'Not set'}</p>
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
                                    <StatusBadge status={order.status} category="order" />
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
                        {/* Message Indicator */}
                        {messageCount > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/admin/orders/${order.id}`);
                                        }}
                                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                    >
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        {messageCount}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{messageCount} message{messageCount !== 1 ? 's' : ''} in this conversation</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        
                        {/* Payment Confirmation Button */}
                        {(order.payment_method === 'bank_transfer' || order.payment_method === 'cod') && 
                         (order.payment_status === 'unpaid' || !order.payment_status) && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onConfirmPayment?.(order);
                                }}
                                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirm Payment
                            </Button>
                        )}
                        
                        <Button size="sm" variant="destructive" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                            View Details
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
