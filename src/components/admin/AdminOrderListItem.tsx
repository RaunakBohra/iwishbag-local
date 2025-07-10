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
  MessageSquare,
  Landmark,
  Banknote,
  CreditCard,
  Wallet
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

    // Get payment method display info
    const getPaymentMethodInfo = (method: string | null) => {
        if (!method) return { label: 'Not Set', icon: DollarSign, color: 'text-gray-500' };
        
        const methods = {
            'bank_transfer': { label: 'Bank Transfer', icon: Landmark, color: 'text-blue-600' },
            'cod': { label: 'Cash on Delivery', icon: Banknote, color: 'text-green-600' },
            'stripe': { label: 'Credit Card', icon: CreditCard, color: 'text-purple-600' },
            'payu': { label: 'PayU', icon: CreditCard, color: 'text-orange-600' },
            'paypal': { label: 'PayPal', icon: Wallet, color: 'text-blue-600' },
        };
        
        return methods[method as keyof typeof methods] || { label: method, icon: DollarSign, color: 'text-gray-500' };
    };

    const paymentMethodInfo = getPaymentMethodInfo(order.payment_method);
    const PaymentIcon = paymentMethodInfo.icon;

    // Calculate payment amounts
    const finalTotal = order.final_total || 0;
    const amountPaid = order.amount_paid || 0;
    const dueAmount = finalTotal - amountPaid;
    const currency = order.final_currency || 'USD';

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Header with Order ID and Status */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onSelect(order.id)}
                                aria-label="Select order"
                            />
                            <div>
                                <h3 className="font-bold text-lg">Order #{order.order_display_id || order.display_id || order.id.slice(0, 8)}</h3>
                                <p className="text-sm text-muted-foreground">{order.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={order.status} category="order" />
                            {getPriorityBadge(order.priority)}
                        </div>
                    </div>

                    {/* Product Summary */}
                    <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                        {firstItem?.image_url && (
                            <img 
                                src={firstItem.image_url} 
                                alt="Product" 
                                className="w-10 h-10 object-cover rounded border"
                            />
                        )}
                        <div className="flex-1">
                            <p className="font-medium">{itemSummary}</p>
                            <p className="text-sm text-muted-foreground">{totalItems || order.quantity || 0} item(s) • {order.destination_country || 'Unknown destination'}</p>
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="border rounded-lg p-4 bg-blue-50/30">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-900">Payment Information</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Payment Method */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                                <div className="flex items-center gap-2">
                                    <PaymentIcon className={`h-4 w-4 ${paymentMethodInfo.color}`} />
                                    <span className="font-medium">{paymentMethodInfo.label}</span>
                                </div>
                            </div>

                            {/* Amount Paid */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
                                <p className="font-bold text-green-600">{currency} {amountPaid.toFixed(2)}</p>
                            </div>

                            {/* Due Amount */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Due Amount</p>
                                <p className={`font-bold ${dueAmount > 0 ? 'text-red-600' : dueAmount < 0 ? 'text-purple-600' : 'text-green-600'}`}>
                                    {currency} {Math.abs(dueAmount).toFixed(2)}
                                    {dueAmount < 0 && ' (Overpaid)'}
                                </p>
                            </div>

                            {/* Payment Status */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
                                <Badge 
                                    variant={
                                        order.payment_status === 'paid' ? 'default' : 
                                        order.payment_status === 'partial' ? 'secondary' : 
                                        order.payment_status === 'overpaid' ? 'outline' : 
                                        'destructive'
                                    }
                                    className="text-xs"
                                >
                                    {order.payment_status === 'partial' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                    {order.payment_status?.charAt(0).toUpperCase() + (order.payment_status?.slice(1) || 'Unpaid')}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Tracking Section */}
                    <div className="border rounded-lg p-4 bg-green-50/30">
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-900">Tracking & Status</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Order Status */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                                <p className="font-medium capitalize">{order.status}</p>
                            </div>

                            {/* Tracking Number */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
                                {order.tracking_number ? (
                                    <p className="font-mono font-medium">{order.tracking_number}</p>
                                ) : (
                                    <p className="text-muted-foreground">Not assigned</p>
                                )}
                            </div>

                            {/* Last Updated */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                                <p className="font-medium">
                                    {order.updated_at ? new Date(order.updated_at).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {order.shipping_carrier && (
                            <div className="mt-3 p-2 bg-white rounded border">
                                <p className="text-xs text-muted-foreground">Shipping Carrier</p>
                                <p className="font-medium">{order.shipping_carrier}</p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2">
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
                                        <p>{messageCount} message{messageCount !== 1 ? 's' : ''}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            
                            {/* Payment Confirmation Button */}
                            {(order.payment_method === 'bank_transfer' || order.payment_method === 'cod') && 
                             (order.payment_status === 'unpaid' || !order.payment_status || order.payment_status === 'partial') && (
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
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => navigate(`/admin/orders/${order.id}`)}
                            >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
