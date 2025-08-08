import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  ArrowLeft,
  CheckCircle,
  DollarSign,
  Package,
  Download,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
// useNavigate removed - not used
import { StatusBadge } from '@/components/dashboard/StatusBadge';
// formatDistanceToNow removed - not used
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tables } from '@/integrations/supabase/types';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { useQuoteRoute } from '@/hooks/useQuoteRoute';

export default function Orders() {
  const {
    orders,
    isLoading,
    searchTerm,
    handleSearchChange,
    isSearching: _isSearching,
  } = useDashboardState();

  const { data: countries } = useAllCountries();
  const { orderStatuses } = useStatusManagement();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // For summary statistics, use the first order's currency display
  const firstOrder = orders?.[0];
  const { formatAmount: formatSummaryAmount } = useQuoteCurrency(firstOrder);

  // Filter orders based on status and search
  const filteredOrders =
    orders?.filter((order) => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Payment status filter
      if (paymentStatusFilter !== 'all' && order.payment_status !== paymentStatusFilter)
        return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const productMatch = order.product_name?.toLowerCase().includes(searchLower);
        const productUrlMatch = order.product_url?.toLowerCase().includes(searchLower);
        const orderIdMatch = order.display_id?.toLowerCase().includes(searchLower);
        const quoteIdMatch = order.display_id?.toLowerCase().includes(searchLower);

        // Get country name for search
        const countryName = countries?.find((c) => c.code === order.destination_country)?.name;
        const countryMatch = countryName?.toLowerCase().includes(searchLower);

        if (!productMatch && !productUrlMatch && !orderIdMatch && !quoteIdMatch && !countryMatch)
          return false;
      }

      return true;
    }) || [];

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalValue = filteredOrders.reduce((sum, order) => sum + (order.final_total_origincurrency || 0), 0);
    const totalPaid = filteredOrders.reduce((sum, order) => sum + (order.amount_paid || 0), 0);
    const totalOutstanding = totalValue - totalPaid;

    const paymentStatusCounts = {
      unpaid: filteredOrders.filter((o) => !o.payment_status || o.payment_status === 'unpaid')
        .length,
      partial: filteredOrders.filter((o) => o.payment_status === 'partial').length,
      paid: filteredOrders.filter((o) => o.payment_status === 'paid').length,
      overpaid: filteredOrders.filter((o) => o.payment_status === 'overpaid').length,
    };

    return {
      totalOrders,
      totalValue,
      totalPaid,
      totalOutstanding,
      paymentStatusCounts,
    };
  }, [filteredOrders]);

  // Export to CSV function
  const exportToCSV = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no orders to export.',
        variant: 'destructive',
      });
      return;
    }

    const csvData = filteredOrders.map((order) => ({
      'Order ID': order.display_id || order.id.slice(0, 8),
      Product: order.product_name || 'N/A',
      Status: order.status,
      'Payment Status': order.payment_status || 'unpaid',
      Total: order.final_total_origincurrency || 0,
      Paid: order.amount_paid || 0,
      Outstanding: (order.final_total_origincurrency || 0) - (order.amount_paid || 0),
      'Payment Method': order.payment_method || 'N/A',
      Country:
        countries?.find((c) => c.code === order.destination_country)?.name ||
        order.destination_country ||
        'N/A',
      Created: new Date(order.created_at).toLocaleDateString(),
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: 'Export successful',
      description: `${filteredOrders.length} orders exported to CSV`,
    });
  };

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
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-gray-500 text-sm">Track your order status and delivery</p>
          </div>
        </div>
        <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Financial Summary */}
      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{statistics.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">{formatSummaryAmount(statistics.totalValue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatSummaryAmount(statistics.totalPaid)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatSummaryAmount(statistics.totalOutstanding)}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
          <div className="sm:w-48">
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
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
                : "You haven't placed any orders yet"}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/quote">
                <Button>Request Your First Quote</Button>
              </Link>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderItem key={order.id} order={order} countries={countries} />
          ))
        )}
      </div>
    </div>
  );
}

// Separate component for order item to handle message count query
function OrderItem({
  order,
  countries: _countries,
}: {
  order: Tables<'quotes'> & { quote_items?: Tables<'quote_items'>[] };
  countries: { code: string; name: string }[] | undefined;
}) {
  const { formatAmount } = useQuoteCurrency(order);
  // Get route information using unified hook
  const route = useQuoteRoute(order);

  // Get message count for this order
  const { data: messageCount = 0 } = useQuery({
    queryKey: ['order-messages-count', order.id],
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

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{order.product_name || 'Product Order'}</h3>
              <p className="text-gray-500 text-sm">
                Order {order.display_id || `#${order.id.slice(0, 8)}`}
              </p>
            </div>
            <StatusBadge status={order.status} category="order" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="ml-1 font-medium">{formatAmount(order.final_total_origincurrency || 0)}</span>
            </div>
            <div>
              <span className="text-gray-500">Ordered:</span>
              <span className="ml-1">{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            {route && (
              <div>
                <span className="text-gray-500">Route:</span>
                <ShippingRouteDisplay
                  origin={route.origin}
                  destination={route.destination}
                  className="ml-1 inline-flex"
                  showIcon={false}
                />
              </div>
            )}
            <div>
              <span className="text-gray-500">Items:</span>
              <span className="ml-1">{order.quote_items?.length || 1}</span>
            </div>
          </div>

          {/* Payment Method & Status */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {order.payment_method && (
              <div>
                <span className="text-gray-500">Payment:</span>
                <span className="ml-1 capitalize">{order.payment_method.replace('_', ' ')}</span>
              </div>
            )}

            {/* Payment Status Badge */}
            {order.payment_status && (
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
                className="text-xs"
              >
                {order.payment_status === 'partial' && order.amount_paid && order.final_total_origincurrency
                  ? `Partial: ${formatAmount(order.amount_paid)} of ${formatAmount(order.final_total_origincurrency)}`
                  : order.payment_status === 'overpaid' && order.overpayment_amount
                    ? `Overpaid: +${formatAmount(order.overpayment_amount)}`
                    : order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Message Count Indicator */}
          {messageCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={`/dashboard/orders/${order.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {messageCount}
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {messageCount} message{messageCount !== 1 ? 's' : ''}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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
  );
}
