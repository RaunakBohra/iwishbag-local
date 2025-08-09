import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database';
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  Eye, 
  Edit, 
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  DollarSign
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Link } from 'react-router-dom';

type Order = Database['public']['Tables']['orders']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'];
  order_items?: Database['public']['Tables']['order_items']['Row'][];
  customer_delivery_preferences?: Database['public']['Tables']['customer_delivery_preferences']['Row'][];
  order_shipments?: Database['public']['Tables']['order_shipments']['Row'][];
};

type OrderStatus = 'pending_payment' | 'paid' | 'processing' | 'seller_ordered' | 'shipped' | 'delivered' | 'cancelled';
type OverallStatus = 'payment_pending' | 'processing' | 'automation_in_progress' | 'revision_needed' | 'ready_to_ship' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'exception';

const OrderManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch orders with related data
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['admin-orders', searchTerm, statusFilter, warehouseFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles!customer_id (
            id,
            full_name,
            email,
            phone,
            country
          ),
          order_items (
            id,
            product_name,
            seller_platform,
            quantity,
            current_price,
            item_status,
            order_automation_status,
            seller_order_id,
            seller_tracking_id
          ),
          customer_delivery_preferences (
            delivery_method,
            consolidation_preference,
            quality_check_level,
            priority
          ),
          order_shipments (
            id,
            shipment_number,
            current_status,
            current_tier,
            estimated_weight_kg
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (warehouseFilter !== 'all') {
        query = query.eq('primary_warehouse', warehouseFilter);
      }

      // Apply search
      if (searchTerm) {
        query = query.or(
          `order_number.ilike.%${searchTerm}%,profiles.full_name.ilike.%${searchTerm}%,profiles.email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data as Order[];
    },
    staleTime: 30000, // 30 seconds
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Partial<Order> }) => {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Order updated',
        description: 'Order status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: `Failed to update order: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

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
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get overall status badge variant
  const getOverallStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'shipped':
      case 'ready_to_ship':
        return 'secondary';
      case 'processing':
      case 'automation_in_progress':
        return 'outline';
      case 'revision_needed':
      case 'exception':
        return 'destructive';
      case 'payment_pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Calculate order statistics
  const orderStats = React.useMemo(() => {
    if (!orders) return { total: 0, pending: 0, processing: 0, shipped: 0, completed: 0 };
    
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending_payment').length,
      processing: orders.filter(o => ['processing', 'seller_ordered'].includes(o.status)).length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      completed: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
    };
  }, [orders]);

  // Filter orders by tab
  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    
    switch (activeTab) {
      case 'pending':
        return orders.filter(o => o.status === 'pending_payment');
      case 'processing':
        return orders.filter(o => ['processing', 'seller_ordered'].includes(o.status));
      case 'shipped':
        return orders.filter(o => o.status === 'shipped');
      case 'completed':
        return orders.filter(o => ['delivered', 'completed'].includes(o.status));
      case 'exceptions':
        return orders.filter(o => o.overall_status === 'exception' || o.overall_status === 'revision_needed');
      default:
        return orders;
    }
  }, [orders, activeTab]);

  if (error) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load orders</h3>
            <p className="text-gray-500 mb-4">There was an error loading the order data.</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-gray-500">Manage and track customer orders through the enhanced system</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Manual Order
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{orderStats.total}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Payment</p>
                <p className="text-2xl font-bold text-orange-600">{orderStats.pending}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{orderStats.processing}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Shipped</p>
                <p className="text-2xl font-bold text-indigo-600">{orderStats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{orderStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search orders by number, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="seller_ordered">Seller Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-48">
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  <SelectItem value="india_warehouse">India Warehouse</SelectItem>
                  <SelectItem value="china_warehouse">China Warehouse</SelectItem>
                  <SelectItem value="us_warehouse">US Warehouse</SelectItem>
                  <SelectItem value="myus_3pl">MyUS 3PL</SelectItem>
                  <SelectItem value="other_3pl">Other 3PL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All ({orderStats.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({orderStats.pending})</TabsTrigger>
              <TabsTrigger value="processing">Processing ({orderStats.processing})</TabsTrigger>
              <TabsTrigger value="shipped">Shipped ({orderStats.shipped})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({orderStats.completed})</TabsTrigger>
              <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                  <p className="text-gray-500">No orders match your current filters.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Overall Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.profiles?.full_name || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{order.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getOverallStatusBadgeVariant(order.overall_status || '')}>
                              {order.overall_status?.replace('_', ' ') || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.total_items} ({order.active_items} active)
                          </TableCell>
                          <TableCell>
                            ${order.current_order_total?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.primary_warehouse?.replace('_', ' ') || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/orders/${order.id}`} className="flex items-center">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  toast({ 
                                    title: 'Edit Order', 
                                    description: 'Order editing interface will be available soon.', 
                                    variant: 'default' 
                                  });
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Order
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  toast({ 
                                    title: 'Order Items', 
                                    description: `${order.total_items} items (${order.active_items} active)`, 
                                    variant: 'default' 
                                  });
                                }}>
                                  <Package className="h-4 w-4 mr-2" />
                                  View Items ({order.total_items})
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  if (order.order_shipments?.length) {
                                    toast({ 
                                      title: 'Shipment Tracking', 
                                      description: `${order.order_shipments.length} shipments found`, 
                                      variant: 'default' 
                                    });
                                  } else {
                                    toast({ 
                                      title: 'No Shipments', 
                                      description: 'No shipments created for this order yet.', 
                                      variant: 'default' 
                                    });
                                  }
                                }}>
                                  <Truck className="h-4 w-4 mr-2" />
                                  Track Shipment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderManagementPage;