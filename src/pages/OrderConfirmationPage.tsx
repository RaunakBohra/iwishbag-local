// src/pages/OrderConfirmationPage.tsx
import React, { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Truck,
  Package,
  Download,
  Share2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Banknote,
  Landmark,
  ArrowRight,
  Copy,
  ExternalLink,
  Calendar,
  Star,
  Heart,
  ShoppingBag,
  Home
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { BankTransferDetails } from '@/components/dashboard/BankTransferDetails';
import { cn } from '@/lib/utils';

type QuoteType = Tables<'quotes'>;

interface OrderStatus {
  status: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const OrderConfirmationPage = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { toast } = useToast();
  const { formatAmount } = useUserCurrency();
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const { data: order, isLoading, isError, error } = useQuery<QuoteType, Error>({
    queryKey: ['orderConfirmation', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is missing');
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const getOrderStatus = (status: string, paymentMethod: string): OrderStatus => {
    switch (status) {
      case 'paid':
        return {
          status: 'paid',
          title: 'Payment Confirmed',
          description: 'Your payment has been processed successfully',
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'cod_pending':
        return {
          status: 'cod_pending',
          title: 'Cash on Delivery',
          description: 'Pay when your order arrives',
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'bank_transfer_pending':
        return {
          status: 'bank_transfer_pending',
          title: 'Bank Transfer Pending',
          description: 'Complete your bank transfer to confirm order',
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50'
        };
      case 'ordered':
        return {
          status: 'ordered',
          title: 'Order Confirmed',
          description: 'Your order has been placed and is being processed',
          icon: Package,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        };
      case 'shipped':
        return {
          status: 'shipped',
          title: 'Order Shipped',
          description: 'Your order is on its way to you',
          icon: Truck,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'completed':
        return {
          status: 'completed',
          title: 'Order Delivered',
          description: 'Your order has been delivered successfully',
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      default:
        return {
          status: 'pending',
          title: 'Order Placed',
          description: 'Your order has been placed successfully',
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const copyOrderId = async () => {
    const orderDisplayId = order?.order_display_id || order?.id?.substring(0, 8).toUpperCase();
    if (orderDisplayId) {
      await navigator.clipboard.writeText(orderDisplayId);
      setCopiedOrderId(true);
      toast({
        title: "Order ID Copied",
        description: "Order ID has been copied to clipboard",
      });
      setTimeout(() => setCopiedOrderId(false), 2000);
    }
  };

  const shareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Order Confirmation',
        text: `Check out my order: ${order?.order_display_id || order?.id?.substring(0, 8).toUpperCase()}`,
        url: window.location.href,
      });
    } else {
      copyOrderId();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
            <CheckCircle2 className="absolute inset-0 m-auto w-8 h-8 text-green-600 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Processing Your Order</h2>
            <p className="text-gray-600">Please wait while we confirm your order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="relative">
            <XCircle className="w-20 h-20 text-red-500 mx-auto" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Order Not Found</h2>
            <p className="text-gray-600">We couldn't find the order you're looking for. Please check your order ID and try again.</p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/cart">
                <ShoppingBag className="w-4 h-4 mr-2" />
                View Cart
              </Link>
        </Button>
          </div>
        </div>
      </div>
    );
  }

  const orderStatus = getOrderStatus(order.status, order.payment_method);
  const StatusIcon = orderStatus.icon;
  const isBankTransfer = order.payment_method === 'bank_transfer';
  const isStripePayment = order.payment_method === 'stripe' && sessionId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <StatusIcon className="w-12 h-12 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">{orderStatus.title}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{orderStatus.description}</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Details Card */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Order Details</CardTitle>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      #{order.order_display_id || order.id?.substring(0, 8).toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Order Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Order Date</p>
                          <p className="font-medium">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Product</p>
                          <p className="font-medium">{order.product_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 text-gray-500">#</div>
                        <div>
                          <p className="text-sm text-gray-500">Quantity</p>
                          <p className="font-medium">{order.quantity} item{order.quantity !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 text-gray-500">$</div>
                        <div>
                          <p className="text-sm text-gray-500">Total Amount</p>
                          <p className="font-medium text-lg">
                            {formatAmount(order.final_total_local ?? order.final_total ?? 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {order.payment_method === 'stripe' && <CreditCard className="w-5 h-5 text-gray-500" />}
                        {order.payment_method === 'cod' && <Banknote className="w-5 h-5 text-gray-500" />}
                        {order.payment_method === 'bank_transfer' && <Landmark className="w-5 h-5 text-gray-500" />}
                        <div>
                          <p className="text-sm text-gray-500">Payment Method</p>
                          <p className="font-medium capitalize">
                            {order.payment_method === 'stripe' && 'Credit Card'}
                            {order.payment_method === 'cod' && 'Cash on Delivery'}
                            {order.payment_method === 'bank_transfer' && 'Bank Transfer'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", orderStatus.bgColor.replace('bg-', 'bg-').replace('-50', '-500'))}></div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="font-medium">{orderStatus.title}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Customer Info */}
                  {order.user_id && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Customer Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 text-gray-500">👤</div>
                          <span className="text-sm">User ID: {order.user_id.substring(0, 8)}...</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">Member since {new Date(order.created_at).getFullYear()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bank Transfer Details */}
              {isBankTransfer && (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Landmark className="w-5 h-5" />
                      Payment Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        Please complete your bank transfer using the details below. Your order will be processed once payment is confirmed.
                      </p>
                      <BankTransferDetails />
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-800">Important</p>
                            <p className="text-sm text-yellow-700 mt-1">
                              Please include your Order ID (#{order.order_display_id || order.id?.substring(0, 8).toUpperCase()}) in the payment reference.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Timeline */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Order Timeline</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Order Placed</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {order.status !== 'pending' && (
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Order Confirmed</p>
                          <p className="text-sm text-gray-500">Your order has been confirmed and is being processed</p>
                        </div>
                      </div>
                    )}

                    {order.status === 'shipped' && (
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Order Shipped</p>
                          <p className="text-sm text-gray-500">Your order is on its way to you</p>
                        </div>
                      </div>
                    )}

                    {order.status === 'completed' && (
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Order Delivered</p>
                          <p className="text-sm text-gray-500">Your order has been delivered successfully</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={copyOrderId}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copiedOrderId ? 'Copied!' : 'Copy Order ID'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={shareOrder}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Order
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/dashboard">
                      <Package className="w-4 h-4 mr-2" />
                      View All Orders
                    </Link>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/quote">
                      <Star className="w-4 h-4 mr-2" />
                      Request New Quote
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Support Card */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Have questions about your order? We're here to help!
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/contact">
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Support
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Us
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="text-lg">What's Next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Track Your Order</p>
                      <p className="text-xs text-gray-600">Monitor your order status in your dashboard</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Prepare for Delivery</p>
                      <p className="text-xs text-gray-600">Ensure someone is available to receive your order</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
            <div>
                      <p className="font-medium text-sm">Leave a Review</p>
                      <p className="text-xs text-gray-600">Share your experience once you receive your order</p>
                    </div>
                </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center space-y-4">
              <Separator />
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Thank you for your order!</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We appreciate your business and will keep you updated on your order status. 
                You'll receive email notifications as your order progresses.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <Link to="/dashboard">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Link>
            </Button>
                <Button variant="outline" asChild size="lg">
                  <Link to="/quote">
                    <Star className="w-4 h-4 mr-2" />
                    Request New Quote
                  </Link>
            </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
