import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  Eye,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Landmark,
  Banknote,
  CreditCard,
  Wallet,
  Receipt,
  Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
// PaymentProofPreviewModal removed - using new simplified payment management

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

  const variants: {
    [key in NonNullable<OrderWithItems['priority']>]:
      | 'outline'
      | 'secondary'
      | 'default'
      | 'destructive';
  } = {
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

export const AdminOrderListItem = ({
  order,
  isSelected,
  onSelect,
  onConfirmPayment,
}: AdminOrderListItemProps) => {
  const navigate = useNavigate();
  // const { formatMultiCurrency } = useAdminCurrencyDisplay();
  // Payment proof modal removed - now handled in dedicated payment management page

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

  // Payment proof queries simplified - detailed verification now in payment management page

  const firstItem = order.quote_items?.[0];
  const totalItems = order.quote_items?.length || 0;

  const itemSummary = firstItem?.product_name
    ? `${firstItem.product_name}${totalItems > 1 ? ` and ${totalItems - 1} more` : ''}`
    : order.product_name || 'No items specified';

  // Currency displays available if needed
  // const currencyDisplays = order.final_total
  //   ? formatMultiCurrency({
  //       usdAmount: order.final_total,
  //       quoteCurrency: order.final_currency,
  //       customerPreferredCurrency: order.profiles?.preferred_display_currency,
  //     })
  //   : [];

  // Get payment method display info
  const getPaymentMethodInfo = (method: string | null) => {
    if (!method) return { label: 'Not Set', icon: DollarSign, color: 'text-gray-500' };

    const methods = {
      bank_transfer: {
        label: 'Bank Transfer',
        icon: Landmark,
        color: 'text-blue-600',
      },
      cod: {
        label: 'Cash on Delivery',
        icon: Banknote,
        color: 'text-green-600',
      },
      stripe: {
        label: 'Credit Card',
        icon: CreditCard,
        color: 'text-purple-600',
      },
      payu: { label: 'PayU', icon: CreditCard, color: 'text-orange-600' },
      paypal: { label: 'PayPal', icon: Wallet, color: 'text-blue-600' },
    };

    return (
      methods[method as keyof typeof methods] || {
        label: method,
        icon: DollarSign,
        color: 'text-gray-500',
      }
    );
  };

  const paymentMethodInfo = getPaymentMethodInfo(order.payment_method);
  const PaymentIcon = paymentMethodInfo.icon;

  // Calculate payment amounts
  const finalTotal = order.final_total || 0;
  const amountPaid = order.amount_paid || 0;
  const currency = order.final_currency || 'USD';

  // Payment proof verification status (unused but kept for reference)
  // const getVerificationStatusInfo = (status: string | null) => {
  //   switch (status) {
  //     case 'pending':
  //       return {
  //         label: 'Pending Review',
  //         color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  //         icon: Clock,
  //       };
  //     case 'verified':
  //       return {
  //         label: 'Verified',
  //         color: 'bg-blue-100 text-blue-800 border-blue-300',
  //         icon: CheckCircle,
  //       };
  //     case 'confirmed':
  //       return {
  //         label: 'Confirmed',
  //         color: 'bg-green-100 text-green-800 border-green-300',
  //         icon: CheckCircle,
  //       };
  //     case 'rejected':
  //       return {
  //         label: 'Rejected',
  //         color: 'bg-red-100 text-red-800 border-red-300',
  //         icon: AlertTriangle,
  //       };
  //     default:
  //       return null;
  //   }
  // };

  // Payment proof verification info moved to dedicated payment management page

  return (
    <>
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
                  <h3 className="font-bold text-lg">
                    Order #{order.order_display_id || order.display_id || order.id.slice(0, 8)}
                  </h3>
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
                <p className="text-sm text-muted-foreground">
                  {totalItems || order.quantity || 0} item(s) •{' '}
                  {order.destination_country || 'Unknown destination'}
                </p>
              </div>
            </div>

            {/* Simplified Payment Section */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <PaymentIcon className={`h-4 w-4 ${paymentMethodInfo.color}`} />
                  <span className="text-sm font-medium">{paymentMethodInfo.label}</span>
                </div>

                {/* Payment Progress */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {currency} {amountPaid.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">/</span>
                  <span className="text-sm">
                    {currency} {finalTotal.toFixed(2)}
                  </span>

                  {/* Progress indicator */}
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        amountPaid / finalTotal >= 1
                          ? 'bg-green-500'
                          : amountPaid / finalTotal > 0
                            ? 'bg-orange-500'
                            : 'bg-gray-300',
                      )}
                      style={{
                        width: `${Math.min((amountPaid / finalTotal) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Payment Status Badge */}
                <Badge
                  variant={
                    order.payment_status === 'paid'
                      ? 'success'
                      : order.payment_status === 'partial'
                        ? 'warning'
                        : order.payment_status === 'overpaid'
                          ? 'secondary'
                          : 'destructive'
                  }
                  className="text-xs"
                >
                  {order.payment_status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {order.payment_status === 'partial' && <Clock className="h-3 w-3 mr-1" />}
                  {order.payment_status === 'unpaid' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {order.payment_status?.charAt(0).toUpperCase() +
                    (order.payment_status?.slice(1) || 'Unpaid')}
                </Badge>

                {/* Bank Transfer Proof Badge - simplified */}
                {order.payment_method === 'bank_transfer' && (
                  <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50">
                    <Receipt className="h-3 w-3 mr-1" />
                    Bank Transfer
                  </Badge>
                )}
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
                      <p>
                        {messageCount} message{messageCount !== 1 ? 's' : ''}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Single action button for payment */}
                {order.payment_method === 'bank_transfer' && order.payment_status !== 'paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/payment-proofs?search=${order.order_display_id}`);
                    }}
                  >
                    <Receipt className="h-3 w-3 mr-1" />
                    Manage Payment
                  </Button>
                )}

                {order.payment_method !== 'bank_transfer' && order.payment_status !== 'paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/payment-proofs?search=${order.order_display_id}`);
                    }}
                  >
                    <Receipt className="h-3 w-3 mr-1" />
                    Payment Details
                  </Button>
                )}

                {/* For non-bank transfer methods, show confirm payment if needed */}
                {order.payment_method !== 'bank_transfer' &&
                  (order.payment_status === 'unpaid' || order.payment_status === 'partial') && (
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

      {/* Payment proof modal removed - now handled in dedicated payment management page */}
    </>
  );
};
