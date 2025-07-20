import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { useAllCountries } from '@/hooks/useAllCountries';
// Removed useOrderMutations - using unified system
import { OrderTimeline } from '@/components/dashboard/OrderTimeline';
import { TrackingInfo } from '@/components/dashboard/TrackingInfo';
import { OrderReceipt } from '@/components/dashboard/OrderReceipt';
import { AddressEditForm } from '@/components/forms/AddressEditForm';
import { QuoteMessaging } from '@/components/messaging/QuoteMessaging';
import { DocumentManager } from '@/components/documents/DocumentManager';
import { PaymentProofButton } from '@/components/payment/PaymentProofButton';
import { EnhancedBankTransferDetails } from '@/components/payment/EnhancedBankTransferDetails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Separator removed - not used
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  DollarSign,
  MapPin,
  ExternalLink,
  Download,
  MessageCircle,
  Edit,
  Globe,
  Weight,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Navigation,
} from 'lucide-react';
import { ShippingAddress } from '@/types/address';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { useQuoteRoute } from '@/hooks/useQuoteRoute';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: countries } = useAllCountries();
  const [_isBreakdownExpanded, _setIsBreakdownExpanded] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  // Status update state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select(
          `
          *,
          quote_items (*)
        `,
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Get currency display formatter for the order
  const { formatAmount } = useQuoteCurrency(order);

  // Get country name for display
  const _countryName = useMemo(() => {
    return (
      countries?.find((c) => c.code === order?.destination_country)?.name ||
      order?.destination_country
    );
  }, [countries, order?.destination_country]);

  // Get payment method display
  const getPaymentMethodDisplay = () => {
    if (!order?.payment_method) return { label: 'N/A', icon: CreditCard };

    const methods = {
      cod: { label: 'Cash on Delivery', icon: DollarSign },
      bank_transfer: { label: 'Bank Transfer', icon: CreditCard },
      stripe: { label: 'Credit Card', icon: CreditCard },
      paypal: { label: 'PayPal', icon: CreditCard },
    };

    return (
      methods[order.payment_method as keyof typeof methods] || {
        label: order.payment_method,
        icon: CreditCard,
      }
    );
  };

  // Parse shipping address from JSONB
  const shippingAddress = order?.shipping_address as unknown as ShippingAddress | null;

  // Get route information using unified hook
  const route = useQuoteRoute(order);

  // Handler functions for order actions
  const handleTrackPackage = () => {
    if (order?.tracking_number) {
      // Open tracking in new window or modal
      window.open(`https://tracking.com/${order.tracking_number}`, '_blank');
    }
  };

  const handleMarkAsCompleted = async () => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'completed' })
        .eq('id', order.id);
      
      if (error) throw error;
      
      // Refresh the order data
      window.location.reload();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 animate-in fade-in duration-500">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-8 animate-in fade-in duration-500">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-4">
            The order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/dashboard/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const paymentMethod = getPaymentMethodDisplay();
  const PaymentIcon = paymentMethod.icon;
  const isOwner = user?.id === order.user_id;

  return (
    <div className="container py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 animate-in slide-in-from-top duration-700">
        <Link
          to="/dashboard/orders"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">
                Order #{order.order_display_id || order.display_id || order.id.slice(0, 8)}
              </h1>
              <StatusBadge status={order.status} category="order" showIcon />
            </div>
            <p className="text-gray-500">
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hover:scale-105 transition-transform duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hover:scale-105 transition-transform duration-200"
              onClick={() => {
                // Scroll to messaging section
                document
                  .getElementById('messaging-section')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Hero Card */}
          <Card className="overflow-hidden animate-in slide-in-from-left duration-700 delay-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Product Image */}
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform duration-200">
                  {order.image_url ? (
                    <img
                      src={order.image_url}
                      alt={order.product_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-2 truncate">
                    {order.product_name || 'Product Name'}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {route && (
                      <div className="hover:bg-gray-50 p-2 rounded transition-colors duration-200 col-span-2">
                        <span className="text-gray-500">Shipping Route:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <ShippingRouteDisplay
                            origin={route.origin}
                            destination={route.destination}
                            showIcon={false}
                          />
                        </div>
                      </div>
                    )}
                    <div className="hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                      <span className="text-gray-500">Weight:</span>
                      <div className="font-medium flex items-center gap-1">
                        <Weight className="h-3 w-3" />
                        {order.item_weight || 0} kg
                      </div>
                    </div>
                    <div className="hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                      <span className="text-gray-500">Quantity:</span>
                      <div className="font-medium">{order.quantity || 1}</div>
                    </div>
                  </div>

                  {order.product_url && (
                    <div className="mt-3">
                      <a
                        href={order.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-teal-600 hover:text-teal-800 text-sm hover:scale-105 transition-transform duration-200"
                      >
                        View Product <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <div className="animate-in slide-in-from-left duration-700 delay-200">
            <OrderTimeline currentStatus={order.status} />
          </div>

          {/* Tracking Info */}
          {order.status === 'shipped' && (
            <div className="animate-in slide-in-from-left duration-700 delay-300">
              <TrackingInfo order={order} />
            </div>
          )}

          {/* Order Receipt */}
          <div className="animate-in slide-in-from-left duration-700 delay-400">
            <OrderReceipt order={order} />
          </div>

          {/* Customer Communication */}
          <Card
            id="messaging-section"
            className="animate-in slide-in-from-left duration-700 delay-500 hover:shadow-lg transition-shadow duration-300"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages & Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteMessaging quoteId={order.id} quoteUserId={order.user_id} />
            </CardContent>
          </Card>

          {/* Documents & Downloads */}
          <div className="animate-in slide-in-from-left duration-700 delay-600">
            <DocumentManager
              quoteId={order.id}
              orderId={order.order_display_id || order.display_id || order.id}
              isAdmin={false}
              canUpload={false}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Instructions for Bank Transfer */}
          {isOwner && order.payment_method === 'bank_transfer' && (
            <Card className="animate-in slide-in-from-right duration-700 delay-100 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedBankTransferDetails
                  orderId={order.id}
                  orderDisplayId={order.order_display_id || order.display_id || order.id}
                  amount={order.final_total_usd || 0}
                  currency={order.destination_currency || order.currency || 'USD'}
                />
              </CardContent>
            </Card>
          )}

          {/* Actions Card for non-bank transfer orders */}
          {isOwner && order.payment_method !== 'bank_transfer' && (
            <Card className="animate-in slide-in-from-right duration-700 delay-100 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.status === 'shipped' && order.tracking_number && (
                  <Button
                    className="w-full hover:scale-105 transition-transform duration-200"
                    onClick={handleTrackPackage}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Track Package
                  </Button>
                )}

                {order.status === 'shipped' && (
                  <Button
                    className="w-full hover:scale-105 transition-transform duration-200"
                    onClick={handleMarkAsCompleted}
                    disabled={isUpdatingStatus}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full hover:scale-105 transition-transform duration-200"
                  onClick={() => {
                    document
                      .getElementById('messaging-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          <Card className="animate-in slide-in-from-right duration-700 delay-200 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                <span className="text-gray-500">Method:</span>
                <span className="flex items-center gap-1">
                  <PaymentIcon className="h-3 w-3" />
                  {paymentMethod.label}
                </span>
              </div>

              {/* Payment Status */}
              {order.payment_status && (
                <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                  <span className="text-gray-500">Status:</span>
                  <Badge
                    variant={
                      order.payment_status === 'paid'
                        ? 'default'
                        : order.payment_status === 'partial'
                          ? 'warning'
                          : order.payment_status === 'overpaid'
                            ? 'secondary'
                            : 'outline'
                    }
                  >
                    {order.payment_status === 'partial' && order.amount_paid && order.final_total_usd
                      ? `Partial: $${order.amount_paid} of $${order.final_total_usd}`
                      : order.payment_status === 'overpaid' && order.overpayment_amount
                        ? `Overpaid: +$${order.overpayment_amount}`
                        : order.payment_status.charAt(0).toUpperCase() +
                          order.payment_status.slice(1)}
                  </Badge>
                </div>
              )}

              <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                <span className="text-gray-500">Total Amount:</span>
                <span className="font-medium">{formatAmount(order.final_total_usd)}</span>
              </div>

              {order.amount_paid && order.amount_paid > 0 && (
                <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-medium text-green-600">
                    {formatAmount(order.amount_paid)}
                  </span>
                </div>
              )}

              {order.payment_status === 'partial' && order.final_total_usd && order.amount_paid && (
                <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                  <span className="text-gray-500">Outstanding:</span>
                  <span className="font-medium text-orange-600">
                    {formatAmount(order.final_total_usd - order.amount_paid)}
                  </span>
                </div>
              )}

              {order.paid_at && (
                <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                  <span className="text-gray-500">Paid:</span>
                  <span>{new Date(order.paid_at).toLocaleDateString()}</span>
                </div>
              )}

              {/* Payment Proof Upload for bank transfer */}
              {order.payment_method === 'bank_transfer' &&
                (!order.payment_status ||
                  order.payment_status === 'unpaid' ||
                  order.payment_status === 'partial') && (
                  <div className="pt-2">
                    <PaymentProofButton
                      quoteId={order.id}
                      orderId={order.order_display_id || order.display_id || order.id}
                      recipientId={null}
                    />
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="animate-in slide-in-from-right duration-700 delay-300 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:scale-105 transition-transform duration-200"
                    onClick={() => setIsAddressDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shippingAddress ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">
                    {shippingAddress.fullName || shippingAddress.recipient_name}
                  </p>
                  <p>{shippingAddress.streetAddress || shippingAddress.address_line1}</p>
                  {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                  <p>
                    {shippingAddress.city},{' '}
                    {shippingAddress.state || shippingAddress.state_province_region}{' '}
                    {shippingAddress.postalCode || shippingAddress.postal_code}
                  </p>
                  <p>{shippingAddress.country}</p>
                  {shippingAddress.phone && (
                    <p className="text-gray-500">📞 {shippingAddress.phone}</p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  <p>No shipping address set</p>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setIsAddressDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card className="animate-in slide-in-from-right duration-700 delay-400 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                <span className="text-gray-500">Order ID:</span>
                <span className="font-mono">{order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                <span className="text-gray-500">Created:</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                <span className="text-gray-500">Last Updated:</span>
                <span>{new Date(order.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                <span className="text-gray-500">Currency:</span>
                <span>
                  {countries?.find((c) => c.code === order.destination_country)?.currency || 'USD'}
                </span>
              </div>
              <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                <span className="text-gray-500">Status:</span>
                <span className="capitalize">{order.status}</span>
              </div>
              {order.tracking_number && (
                <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                  <span className="text-gray-500">Tracking:</span>
                  <span className="font-mono">{order.tracking_number}</span>
                </div>
              )}
              {order.shipping_carrier && (
                <div className="flex justify-between hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                  <span className="text-gray-500">Carrier:</span>
                  <span className="capitalize">{order.shipping_carrier}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Address Edit Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent>
          <DialogDescription>Update your shipping address for this order.</DialogDescription>
          <AddressEditForm
            currentAddress={shippingAddress}
            onSave={() => {
              setIsAddressDialogOpen(false);
              // Refresh the order data
              window.location.reload();
            }}
            onCancel={() => setIsAddressDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
