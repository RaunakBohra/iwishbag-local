import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Edit,
  Eye,
  MessageCircle,
  FileText,
  Settings,
  Activity
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type OrderWithDetails = Database['public']['Tables']['orders']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'];
  order_items?: (Database['public']['Tables']['order_items']['Row'] & {
    item_revisions?: Database['public']['Tables']['item_revisions']['Row'][];
    seller_order_automation?: Database['public']['Tables']['seller_order_automation']['Row'][];
  })[];
  customer_delivery_preferences?: Database['public']['Tables']['customer_delivery_preferences']['Row'][];
  order_shipments?: (Database['public']['Tables']['order_shipments']['Row'] & {
    shipment_tracking_events?: Database['public']['Tables']['shipment_tracking_events']['Row'][];
    shipment_items?: Database['public']['Tables']['shipment_items']['Row'][];
  })[];
};

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch order with all related data
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!customer_id (
            id,
            full_name,
            email,
            phone,
            country,
            preferred_display_currency
          ),
          order_items (
            *,
            item_revisions (
              *
            ),
            seller_order_automation (
              *
            )
          ),
          customer_delivery_preferences (
            *
          ),
          order_shipments (
            *,
            shipment_tracking_events (
              *
            ),
            shipment_items (
              *
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as OrderWithDetails;
    },
    enabled: !!id,
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, overallStatus }: { status?: string; overallStatus?: string }) => {
      if (!id) return;
      
      const updates: any = {};
      if (status) updates.status = status;
      if (overallStatus) updates.overall_status = overallStatus;
      
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail', id] });
      toast({
        title: 'Status updated',
        description: 'Order status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading order details...</p>
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
            <p className="text-gray-500 mb-4">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link to="/admin/orders">
              <Button>Back to Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/orders" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{order.order_number}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">{order.status.replace('_', ' ')}</Badge>
              <Badge variant="secondary">{order.overall_status?.replace('_', ' ') || 'N/A'}</Badge>
              <span className="text-sm text-gray-500">
                Created {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Customer
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            View Invoice
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Order
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
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
                <p className="text-sm text-gray-500">Active Items</p>
                <p className="text-2xl font-bold text-green-600">{order.active_items}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Order Total</p>
                <p className="text-2xl font-bold">${order.current_order_total?.toFixed(2) || '0.00'}</p>
              </div>
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Variance</p>
                <p className={`text-2xl font-bold ${order.variance_amount && order.variance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {order.variance_amount ? `$${order.variance_amount.toFixed(2)}` : '$0.00'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="revisions">Revisions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="font-medium">{order.profiles?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p>{order.profiles?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p>{order.profiles?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Country</label>
                  <p>{order.profiles?.country || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Currency</label>
                  <p>{order.profiles?.preferred_display_currency || order.currency}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Method</label>
                  <p className="capitalize">{order.payment_method?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Status</label>
                  <Badge variant="outline">{order.payment_status || 'pending'}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Primary Warehouse</label>
                  <p className="capitalize">{order.primary_warehouse?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Automation Enabled</label>
                  <Badge variant={order.automation_enabled ? 'default' : 'outline'}>
                    {order.automation_enabled ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quality Check</label>
                  <Badge variant={order.quality_check_requested ? 'default' : 'outline'}>
                    {order.quality_check_requested ? 'Requested' : 'Not Requested'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.customer_delivery_preferences?.[0] ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Delivery Method</label>
                      <p className="capitalize">{order.customer_delivery_preferences[0].delivery_method?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Consolidation</label>
                      <p className="capitalize">{order.customer_delivery_preferences[0].consolidation_preference?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Quality Check Level</label>
                      <p className="capitalize">{order.customer_delivery_preferences[0].quality_check_level}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Priority</label>
                      <Badge variant="outline">{order.customer_delivery_preferences[0].priority}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Max Wait Days</label>
                      <p>{order.customer_delivery_preferences[0].max_wait_days} days</p>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No delivery preferences set</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Order Items ({order.order_items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_items?.length ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Automation</TableHead>
                        <TableHead>Seller Order</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.order_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="font-medium truncate">{item.product_name}</p>
                              <p className="text-sm text-gray-500">Weight: {item.current_weight || 0} kg</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.seller_platform}</Badge>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">${item.current_price?.toFixed(2)}</p>
                              {item.price_variance && item.price_variance !== 0 && (
                                <p className={`text-sm ${item.price_variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                  {item.price_variance > 0 ? '+' : ''}${item.price_variance.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.item_status?.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.order_automation_status || 'pending'}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.seller_order_id ? (
                              <div>
                                <p className="font-medium text-sm">{item.seller_order_id}</p>
                                {item.seller_tracking_id && (
                                  <p className="text-xs text-gray-500">{item.seller_tracking_id}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">Not placed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No items found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_items?.some(item => item.seller_order_automation?.length) ? (
                <div className="space-y-4">
                  {order.order_items.map((item) =>
                    item.seller_order_automation?.map((automation) => (
                      <Card key={automation.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{automation.automation_type?.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">Platform: {automation.seller_platform}</p>
                            <p className="text-sm text-gray-500">Product: {item.product_name}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{automation.automation_status}</Badge>
                            <p className="text-sm text-gray-500 mt-1">
                              Retries: {automation.retry_count}/{automation.max_retries}
                            </p>
                          </div>
                        </div>
                        {automation.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-700">{automation.error_message}</p>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No automation tasks found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle>Shipments ({order.order_shipments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_shipments?.length ? (
                <div className="space-y-4">
                  {order.order_shipments.map((shipment) => (
                    <Card key={shipment.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-medium">{shipment.shipment_number}</p>
                          <p className="text-sm text-gray-500">Weight: {shipment.estimated_weight_kg} kg</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{shipment.current_status}</Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            Tier: {shipment.current_tier}
                          </p>
                        </div>
                      </div>
                      
                      {shipment.shipment_tracking_events?.length ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Recent Events:</p>
                          {shipment.shipment_tracking_events.slice(0, 3).map((event) => (
                            <div key={event.id} className="text-sm flex justify-between">
                              <span>{event.description}</span>
                              <span className="text-gray-500">
                                {new Date(event.event_timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No tracking events yet</p>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No shipments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revisions Tab */}
        <TabsContent value="revisions">
          <Card>
            <CardHeader>
              <CardTitle>Price & Weight Revisions</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_items?.some(item => item.item_revisions?.length) ? (
                <div className="space-y-4">
                  {order.order_items.map((item) =>
                    item.item_revisions?.map((revision) => (
                      <Card key={revision.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{revision.change_type?.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">Product: {item.product_name}</p>
                            <p className="text-sm text-gray-500">Reason: {revision.change_reason}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={revision.auto_approved ? 'default' : 'outline'}>
                              {revision.customer_approval_status}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-1">
                              Impact: ${revision.total_cost_impact?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                        {revision.admin_notes && (
                          <div className="mt-2 p-2 bg-gray-50 border rounded">
                            <p className="text-sm">{revision.admin_notes}</p>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No revisions found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Order Settings & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order Details
                </Button>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync with Sellers
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Customer Update
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Status Updates</h4>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ status: 'processing' })}
                  >
                    Mark Processing
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ status: 'shipped' })}
                  >
                    Mark Shipped
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ status: 'delivered' })}
                  >
                    Mark Delivered
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrderDetailPage;