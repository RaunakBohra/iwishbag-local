import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database';
import {
  Package,
  Search,
  Eye,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';

type CustomerOrder = Database['public']['Tables']['orders']['Row'] & {
  order_items?: Database['public']['Tables']['order_items']['Row'][];
  order_shipments?: Database['public']['Tables']['order_shipments']['Row'][];
};

const CustomerOrderList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch customer's orders
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['customer-orders', user?.id, searchTerm, statusFilter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            current_price,
            item_status
          ),
          order_shipments (
            id,
            shipment_number,
            current_status,
            estimated_weight_kg
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`order_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data as CustomerOrder[];
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
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
      case 'pending_payment':
        return 'destructive';
      default:
        return 'outline';
    }
  };

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

  if (!user) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Please log in to view your orders.</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load orders</h3>
          <p className="text-gray-500 mb-4">There was an error loading your order data.</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Orders</h2>
          <p className="text-gray-500">Track and manage your orders</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search orders by number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="seller_ordered">Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading your orders...</p>
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : "You haven't placed any orders yet"}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/quote">
                <Button>Request Your First Quote</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <StatusIcon className="h-5 w-5 text-gray-500" />
                        <h3 className="font-semibold text-lg">{order.order_number}</h3>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <span className="ml-1 font-medium">
                            ${order.current_order_total?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <span className="ml-1">{order.total_items || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <span className="ml-1">
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Warehouse:</span>
                          <span className="ml-1 capitalize">
                            {order.primary_warehouse?.replace('_', ' ') || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Status */}
                      {order.payment_status && (
                        <div className="mt-3">
                          <Badge 
                            variant={order.payment_status === 'paid' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            Payment: {order.payment_status}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link to={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      
                      {['shipped', 'delivered'].includes(order.status) && (
                        <Button variant="outline" size="sm">
                          <Truck className="h-4 w-4 mr-2" />
                          Track
                        </Button>
                      )}

                      <Button variant="outline" size="sm">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Support
                      </Button>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="h-4 w-4" />
                        <span>
                          {order.order_items.slice(0, 2).map(item => item.product_name).join(', ')}
                          {order.order_items.length > 2 && ` +${order.order_items.length - 2} more`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Shipments Preview */}
                  {order.order_shipments && order.order_shipments.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Truck className="h-4 w-4" />
                        <span>
                          {order.order_shipments.length} shipment{order.order_shipments.length > 1 ? 's' : ''}
                        </span>
                        {order.order_shipments[0].shipment_number && (
                          <span className="font-mono text-xs">
                            {order.order_shipments[0].shipment_number}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerOrderList;