import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { 
  Calendar, 
  User, 
  Package, 
  DollarSign, 
  MapPin, 
  ExternalLink,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Copy,
  ArrowRight,
  Phone,
  CreditCard,
  Truck,
  Receipt,
  CheckCircle,
  AlertCircle,
  Clock,
  Landmark,
  Banknote,
  Wallet
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Body, BodySmall } from '@/components/ui/typography';

type OrderWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

interface CompactOrderListItemProps {
  order: OrderWithItems;
  isSelected: boolean;
  onSelect: (orderId: string, selected: boolean) => void;
  onConfirmPayment?: (order: OrderWithItems) => void;
}

const getPriorityBadge = (priority: OrderWithItems['priority']) => {
  if (!priority) return null;

  const config = {
    low: {
      label: 'Low',
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    },
    medium: {
      label: 'Medium',
      className: 'bg-teal-100 text-teal-700 border-teal-300',
    },
    high: {
      label: 'High',
      className: 'bg-red-100 text-red-700 border-red-300',
    },
    urgent: {
      label: 'Urgent',
      className: 'bg-red-100 text-red-700 border-red-300',
    },
  };

  const badgeConfig = config[priority] || config.medium;

  return (
    <Badge className={cn('text-xs font-medium', badgeConfig.className)}>
      {badgeConfig.label}
    </Badge>
  );
};

const getPaymentMethodInfo = (method: string | null) => {
  if (!method) return { label: 'Not Set', icon: DollarSign, color: 'text-gray-500' };

  const methods = {
    bank_transfer: {
      label: 'Bank Transfer',
      icon: Landmark,
      color: 'text-teal-600',
    },
    cod: {
      label: 'Cash on Delivery',
      icon: Banknote,
      color: 'text-green-600',
    },
    stripe: {
      label: 'Credit Card',
      icon: CreditCard,
      color: 'text-orange-600',
    },
    payu: { label: 'PayU', icon: CreditCard, color: 'text-orange-600' },
    paypal: { label: 'PayPal', icon: Wallet, color: 'text-teal-600' },
  };

  return (
    methods[method as keyof typeof methods] || {
      label: method,
      icon: DollarSign,
      color: 'text-gray-500',
    }
  );
};

export const CompactOrderListItem = ({ order, isSelected, onSelect, onConfirmPayment }: CompactOrderListItemProps) => {
  const navigate = useNavigate();
  const [customerProfile, setCustomerProfile] = useState<{
    full_name: string | null;
    phone: string | null;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const firstItem = order.quote_items?.[0];
  const totalItems = order.quote_items?.length || 0;
  const productName = firstItem?.product_name || order.product_name || 'Product name not specified';
  
  const paymentMethodInfo = getPaymentMethodInfo(order.payment_method);
  const PaymentIcon = paymentMethodInfo.icon;
  
  const finalTotal = order.final_total_usd || 0;
  const amountPaid = order.amount_paid || 0;
  const currency = order.destination_currency || 'USD';
  const paymentProgress = finalTotal > 0 ? (amountPaid / finalTotal) * 100 : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return diffHours <= 1 ? 'Just now' : `${diffHours}h ago`;
    }
    return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  useEffect(() => {
    let isMounted = true;
    
    // Fetch customer profile
    async function fetchCustomerProfile() {
      if (order.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', order.user_id)
          .single();

        if (isMounted && profile) {
          setCustomerProfile(profile);
        }
      }
    }

    // Fetch message count
    async function fetchMessageCount() {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('quote_id', order.id);
      
      if (isMounted) {
        setMessageCount(count || 0);
      }
    }

    fetchCustomerProfile();
    fetchMessageCount();

    return () => {
      isMounted = false;
    };
  }, [order]);

  const customerName = customerProfile?.full_name || order.customer_name || order.email || 'Unknown Customer';

  const getPaymentStatusBadge = () => {
    const status = order.payment_status;
    const config = {
      paid: { label: 'Paid', className: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
      partial: { label: 'Partial', className: 'bg-orange-100 text-orange-700 border-orange-300', icon: Clock },
      unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle },
      overpaid: { label: 'Overpaid', className: 'bg-teal-100 text-teal-700 border-teal-300', icon: CheckCircle },
    };

    const badgeConfig = config[status as keyof typeof config] || config.unpaid;
    const Icon = badgeConfig.icon;

    return (
      <Badge className={cn('text-xs font-medium flex items-center gap-1', badgeConfig.className)}>
        <Icon className="h-3 w-3" />
        {badgeConfig.label}
      </Badge>
    );
  };

  return (
    <>
      <div className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200',
        isSelected && 'ring-2 ring-teal-500 border-teal-500'
      )}>
        <div className="flex items-center gap-4">
          {/* Selection Checkbox */}
          <div className="flex-shrink-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(order.id, !!checked)}
              className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
            />
          </div>

          {/* Status Indicator */}
          <div className={cn(
            'flex-shrink-0 w-2 h-12 rounded-full',
            order.status === 'cancelled' && 'bg-red-500',
            order.status === 'rejected' && 'bg-red-500',
            order.status === 'pending' && 'bg-yellow-500',
            order.status === 'approved' && 'bg-green-500',
            order.status === 'paid' && 'bg-teal-500',
            order.status === 'ordered' && 'bg-orange-500',
            order.status === 'shipped' && 'bg-teal-500',
            order.status === 'completed' && 'bg-green-600',
            !['cancelled', 'rejected', 'pending', 'approved', 'paid', 'ordered', 'shipped', 'completed'].includes(order.status) && 'bg-gray-300',
          )} />

          {/* Product Image */}
          {firstItem?.image_url && (
            <div className="flex-shrink-0">
              <img
                src={firstItem.image_url}
                alt="Product"
                className="w-12 h-12 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Body className="font-semibold text-gray-900">
                  #{order.order_display_id || order.display_id || order.id.substring(0, 8).toUpperCase()}
                </Body>
                <StatusBadge status={order.status} />
                {getPriorityBadge(order.priority)}
              </div>
              <div className="flex items-center gap-2">
                <BodySmall className="text-gray-500">
                  {formatDate(order.created_at)}
                </BodySmall>
                {messageCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-teal-50 border-teal-200 text-teal-700">
                    {messageCount} msg{messageCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {/* Product Name Row */}
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-gray-500" />
              <BodySmall className="text-gray-700 font-medium truncate">
                {productName}
                {totalItems > 1 && (
                  <span className="text-gray-500 ml-1">
                    +{totalItems - 1} more item{totalItems - 1 !== 1 ? 's' : ''}
                  </span>
                )}
              </BodySmall>
              {firstItem?.product_url && (
                <a
                  href={firstItem.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Payment Info Row */}
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <PaymentIcon className={`h-4 w-4 ${paymentMethodInfo.color}`} />
                <BodySmall className="text-gray-700">
                  {paymentMethodInfo.label}
                </BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <BodySmall className="text-gray-700 font-medium">
                  {formatCurrency(amountPaid)} / {formatCurrency(finalTotal)}
                </BodySmall>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      paymentProgress >= 100 ? 'bg-green-500' : 
                      paymentProgress > 0 ? 'bg-orange-500' : 'bg-gray-300'
                    )}
                    style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                  />
                </div>
                {getPaymentStatusBadge()}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 font-medium truncate">
                  {customerName}
                </BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 truncate">
                  {order.destination_country || 'Unknown'}
                </BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-700 truncate">
                  {order.tracking_number || 'No tracking'}
                </BodySmall>
              </div>
              {customerProfile?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <BodySmall className="text-gray-700 truncate">
                    {customerProfile.phone}
                  </BodySmall>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(`/admin/orders/${order.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Quick Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/admin/payment-proofs?search=${order.order_display_id || order.display_id}`)}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Payment Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {order.payment_status !== 'paid' && onConfirmPayment && (
                  <DropdownMenuItem onClick={() => onConfirmPayment(order)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Payment
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Quick Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order #{order.order_display_id || order.display_id || order.id} - Quick Preview
            </DialogTitle>
            <DialogDescription>
              {customerName} • {formatDate(order.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Product Information */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-gray-500" />
                <BodySmall className="text-gray-500 font-medium">Product</BodySmall>
              </div>
              <div className="flex items-center gap-2">
                <Body className="font-medium text-gray-900">{productName}</Body>
                {firstItem?.product_url && (
                  <a
                    href={firstItem.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              {totalItems > 1 && (
                <BodySmall className="text-gray-600 mt-1">
                  +{totalItems - 1} more item{totalItems - 1 !== 1 ? 's' : ''}
                </BodySmall>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Status</BodySmall>
                <StatusBadge status={order.status} />
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Payment Status</BodySmall>
                {getPaymentStatusBadge()}
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Total Amount</BodySmall>
                <Body className="font-semibold">{formatCurrency(finalTotal)}</Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Amount Paid</BodySmall>
                <Body className="font-semibold">{formatCurrency(amountPaid)}</Body>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Payment Method</BodySmall>
                <div className="flex items-center gap-2">
                  <PaymentIcon className={`h-4 w-4 ${paymentMethodInfo.color}`} />
                  <Body>{paymentMethodInfo.label}</Body>
                </div>
              </div>
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Tracking</BodySmall>
                <Body>{order.tracking_number || 'Not assigned'}</Body>
              </div>
            </div>
            {order.notes && (
              <div>
                <BodySmall className="text-gray-500 font-medium mb-1">Notes</BodySmall>
                <Body className="text-gray-700">{order.notes}</Body>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsPreviewOpen(false);
                navigate(`/admin/orders/${order.id}`);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};