import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Search, ArrowLeft, Truck, CheckCircle, Clock, DollarSign, Package, Eye, Calendar } from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useStatusManagement } from '@/hooks/useStatusManagement';

export default function Orders() {
  const {
    orders,
    isLoading,
    searchTerm,
    handleSearchChange,
    isSearching,
  } = useDashboardState();

  const { data: countries } = useAllCountries();
  const { orderStatuses } = useStatusManagement();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter orders based on status and search
  const filteredOrders = orders?.filter(order => {
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const productMatch = order.product_name?.toLowerCase().includes(searchLower);
      const productUrlMatch = order.product_url?.toLowerCase().includes(searchLower);
      const orderIdMatch = order.order_display_id?.toLowerCase().includes(searchLower);
      const quoteIdMatch = order.display_id?.toLowerCase().includes(searchLower);
      
      // Get country name for search
      const countryName = countries?.find(c => c.code === order.country_code)?.name;
      const countryMatch = countryName?.toLowerCase().includes(searchLower);
      
      if (!productMatch && !productUrlMatch && !orderIdMatch && !quoteIdMatch && !countryMatch) return false;
    }
    
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-gray-500 text-sm">Track your order status and delivery</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
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
                {orderStatuses?.map((status) => (
                  <SelectItem key={status.name} value={status.name}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'You haven\'t placed any orders yet'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/quote">
                <Button>Request Your First Quote</Button>
              </Link>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {order.product_name || 'Product Order'}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Order #{order.order_display_id || order.display_id || order.id.slice(0, 8)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} category="order" />
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-1 font-medium">
                        ${order.final_total?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ordered:</span>
                      <span className="ml-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Country:</span>
                      <span className="ml-1">{countries?.find(c => c.code === order.country_code)?.name || order.country_code || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Items:</span>
                      <span className="ml-1">{order.quote_items?.length || 1}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  {order.payment_method && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Payment:</span>
                      <span className="ml-1 capitalize">{order.payment_method.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Link to={`/dashboard/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  {order.status === 'shipped' && (
                    <Button size="sm" variant="outline">
                      Track Package
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 