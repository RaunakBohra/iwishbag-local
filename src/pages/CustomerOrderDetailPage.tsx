import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, User, Home, Ship, MessageSquare, CreditCard } from 'lucide-react';
import { useCustomerOrderDetail } from '@/hooks/useCustomerOrderDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTimeline } from '@/components/dashboard/OrderTimeline';
import { TrackingInfo } from '@/components/dashboard/TrackingInfo';
import { OrderReceipt } from '@/components/dashboard/OrderReceipt';
import { QuoteMessaging } from '@/components/messaging/QuoteMessaging';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { PaymentProofButton } from '@/components/payment/PaymentProofButton';
import { DocumentManager } from '@/components/documents/DocumentManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

const CustomerOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useCustomerOrderDetail(id);

  if (isLoading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 text-center">
        <p className="text-red-500">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-8 text-center">
        <p>Order not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const displayId = order.order_display_id || order.display_id || `#${order.id.substring(0, 6)}`;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold">Order {displayId}</h1>
        <StatusBadge status={order.status} category="order" />
      </div>

      <OrderTimeline currentStatus={order.status} />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package /> Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={item.id}>
                      <p className="font-semibold">{item.name || 'N/A'}</p>
                      {item.options &&
                        (() => {
                          try {
                            const options = JSON.parse(item.options);
                            return options.notes ? (
                              <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 my-2">
                                <span className="font-semibold text-teal-800">Product Notes:</span>
                                <span className="text-teal-900 ml-2 whitespace-pre-line">
                                  {options.notes}
                                </span>
                              </div>
                            ) : null;
                          } catch {
                            return null;
                          }
                        })()}
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity || 1}
                      </p>
                      {item.url && (
                        <Button variant="link" asChild className="p-0 h-auto mt-2">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            View Product
                          </a>
                        </Button>
                      )}
                      {index < order.items.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="font-semibold">{order.items?.[0]?.name || 'Product'}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {order.quantity || 1}</p>
                  {order.items?.[0]?.url && (
                    <Button variant="link" asChild className="p-0 h-auto mt-2">
                      <a href={order.items?.[0]?.url} target="_blank" rel="noopener noreferrer">
                        View Product
                      </a>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <TrackingInfo order={order} />

          {/* Payment Section */}
          {(order.payment_method === 'bank_transfer' || order.payment_method === 'cod') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <Badge variant="outline">
                    {order.payment_method === 'bank_transfer'
                      ? 'Bank Transfer'
                      : 'Cash on Delivery'}
                  </Badge>
                </div>

                {order.payment_status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Payment Status:</span>
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
                      {order.payment_status === 'partial' &&
                      order.amount_paid &&
                      order.final_total_usd
                        ? `Partial: $${order.amount_paid} of $${order.final_total_usd}`
                        : order.payment_status.charAt(0).toUpperCase() +
                          order.payment_status.slice(1)}
                    </Badge>
                  </div>
                )}

                {/* Payment Proof Upload for unpaid/partial payments */}
                {order.payment_method === 'bank_transfer' &&
                  (!order.payment_status ||
                    order.payment_status === 'unpaid' ||
                    order.payment_status === 'partial') && (
                    <div className="pt-2">
                      <PaymentProofButton
                        quoteId={order.id}
                        orderId={order.id}
                        recipientId={null}
                      />
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Customer Communication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages & Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteMessaging quoteId={order.id} quoteUserId={order.user_id} />
            </CardContent>
          </Card>

          {/* Documents & Downloads */}
          <DocumentManager
            quoteId={order.id}
            orderId={displayId}
            isAdmin={false}
            canUpload={false}
          />

          <OrderReceipt order={order} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User /> Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Contact Information</h3>
                <p className="text-sm text-muted-foreground break-all">{order.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship /> Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.shipping_address ? (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Shipping Address</h3>
                  <address className="not-italic text-sm text-muted-foreground">
                    {order.shipping_address.address_line1}
                    <br />
                    {order.shipping_address.address_line2 && (
                      <>
                        {order.shipping_address.address_line2}
                        <br />
                      </>
                    )}
                    {order.shipping_address.city}, {order.shipping_address.state_province_region}{' '}
                    {order.shipping_address.postal_code}
                    <br />
                    {order.shipping_address.country}
                  </address>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Shipping Address</h3>
                  <p className="text-sm text-muted-foreground">No shipping address found</p>
                </div>
              )}

              {(order.shipping_carrier || order.tracking_number || order.shipped_at) && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Shipping Details</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {order.shipping_carrier && (
                        <p>
                          <span className="font-medium">Carrier:</span> {order.shipping_carrier}
                        </p>
                      )}
                      {order.tracking_number && (
                        <p>
                          <span className="font-medium">Tracking Number:</span>{' '}
                          {order.tracking_number}
                        </p>
                      )}
                      {order.shipped_at && (
                        <p>
                          <span className="font-medium">Shipped On:</span>{' '}
                          {new Date(order.shipped_at).toLocaleDateString()}
                        </p>
                      )}
                      {order.estimated_delivery_date && (
                        <p>
                          <span className="font-medium">Estimated Delivery:</span>{' '}
                          {new Date(order.estimated_delivery_date).toLocaleDateString()}
                        </p>
                      )}
                      {order.current_location && (
                        <p>
                          <span className="font-medium">Current Location:</span>{' '}
                          {order.current_location}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrderDetailPage;
