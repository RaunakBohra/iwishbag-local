import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database';
import {
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  MessageCircle,
  FileText,
  Eye,
  MapPin,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

type CustomerOrderWithDetails = Database['public']['Tables']['orders']['Row'] & {
  order_items?: Database['public']['Tables']['order_items']['Row'][];
  customer_delivery_preferences?: Database['public']['Tables']['customer_delivery_preferences']['Row'][];
  order_shipments?: (Database['public']['Tables']['order_shipments']['Row'] & {
    shipment_tracking_events?: Database['public']['Tables']['shipment_tracking_events']['Row'][];
  })[];
};

const CustomerOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch order with details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['customer-order-detail', id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *
          ),
          customer_delivery_preferences (
            *
          ),
          order_shipments (
            *,
            shipment_tracking_events (
              *
            )
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only see their own orders
        .single();

      if (error) throw error;
      return data as CustomerOrderWithDetails;
    },
    enabled: !!id && !!user,
  });

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return CheckCircle;
      case 'shipped':
        return Truck;
      case 'processing':
      case 'seller_ordered':
        return Clock;
      default:
        return Package;
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'default';
      case 'shipped':
        return 'secondary';
      case 'processing':
      case 'seller_ordered':
        return 'outline';
      case 'pending_payment':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!user) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Please log in to view your order details.</p>
            <Link to="/auth">
              <Button className="mt-4">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Order not found</h3>
            <p className="text-gray-500 mb-4">
              The order you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link to="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(order.status);

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <StatusIcon className="h-6 w-6 text-gray-500" />
              <h1 className="text-3xl font-bold">{order.order_number}</h1>
              <Badge variant={getStatusBadgeVariant(order.status)}>
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-gray-500 mt-2">
              Ordered on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>
        </div>
      </div>

      {/* Order Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold">${order.current_order_total?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Items</p>
                <p className="text-2xl font-bold">{order.total_items}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Payment</p>
                <p className="text-lg font-medium capitalize">
                  {order.payment_method?.replace('_', ' ') || 'N/A'}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Warehouse</p>
                <p className="text-lg font-medium capitalize">
                  {order.primary_warehouse?.replace('_', ' ') || 'N/A'}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items ({order.order_items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_items && order.order_items.length > 0 ? (
                <div className="space-y-4">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product_name}</h4>
                        <p className="text-sm text-gray-500">
                          Platform: {item.seller_platform} • Qty: {item.quantity}
                        </p>
                        <p className="text-sm text-gray-500">
                          Weight: {item.current_weight || 0} kg
                        </p>
                        {item.seller_order_id && (
                          <p className="text-sm font-mono text-gray-600">
                            Order ID: {item.seller_order_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.current_price?.toFixed(2) || '0.00'}</p>
                        <Badge variant="outline" className="mt-1">
                          {item.item_status?.replace('_', ' ') || 'pending'}
                        </Badge>
                        {item.price_variance && item.price_variance !== 0 && (
                          <p className={`text-sm mt-1 ${item.price_variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {item.price_variance > 0 ? '+' : ''}${item.price_variance.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No items found</p>
              )}
            </CardContent>
          </Card>

          {/* Shipment Tracking */}
          {order.order_shipments && order.order_shipments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipment Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_shipments.map((shipment) => (
                    <div key={shipment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">{shipment.shipment_number}</p>
                          <p className="text-sm text-gray-500">
                            Weight: {shipment.estimated_weight_kg} kg
                          </p>
                        </div>
                        <Badge variant="outline">{shipment.current_status}</Badge>
                      </div>
                      
                      {shipment.shipment_tracking_events && shipment.shipment_tracking_events.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Recent Updates:</p>
                          {shipment.shipment_tracking_events
                            .sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime())
                            .slice(0, 3)
                            .map((event) => (
                              <div key={event.id} className="flex justify-between text-sm">
                                <span>{event.description}</span>
                                <span className="text-gray-500">
                                  {new Date(event.event_timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusIcon className="h-5 w-5" />
                <div>
                  <p className="font-medium">{order.status.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">Current status</p>
                </div>
              </div>
              
              {order.overall_status && (
                <div>
                  <p className="text-sm text-gray-500">Overall Status</p>
                  <Badge variant="outline">
                    {order.overall_status.replace('_', ' ')}
                  </Badge>
                </div>
              )}

              {order.status === 'pending_payment' && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700">
                    Payment is required to proceed with your order.
                  </p>
                  <Button size="sm" className="mt-2">
                    Complete Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Method</p>
                <p className="capitalize">{order.payment_method?.replace('_', ' ') || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
                  {order.payment_status || 'pending'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-bold">${order.current_order_total?.toFixed(2) || '0.00'}</p>
              </div>
              {order.variance_amount && order.variance_amount !== 0 && (
                <div>
                  <p className="text-sm text-gray-500">Price Adjustments</p>
                  <p className={`font-medium ${order.variance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {order.variance_amount > 0 ? '+' : ''}${order.variance_amount.toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Preferences */}
          {order.customer_delivery_preferences && order.customer_delivery_preferences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.customer_delivery_preferences.map((pref) => (
                  <div key={pref.id} className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Method</p>
                      <p className="capitalize">{pref.delivery_method?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Priority</p>
                      <Badge variant="outline">{pref.priority}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quality Check</p>
                      <p className="capitalize">{pref.quality_check_level}</p>
                    </div>
                    {pref.max_wait_days && (
                      <div>
                        <p className="text-sm text-gray-500">Max Wait</p>
                        <p>{pref.max_wait_days} days</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
              {['shipped', 'delivered'].includes(order.status) && (
                <Button variant="outline" className="w-full">
                  <Truck className="h-4 w-4 mr-2" />
                  Track Package
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrderDetailPage;