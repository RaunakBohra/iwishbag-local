import { CompactOrderListItem } from './CompactOrderListItem';
import { OrderFilters } from './OrderFilters';
import { OrderMetrics } from './OrderMetrics';
import { OrderQuickFilters } from './OrderQuickFilters';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { useSimpleOrderAnalytics } from '@/hooks/useSimpleOrderAnalytics';
import { PaymentSyncDebugger } from '../debug/PaymentSyncDebugger';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnifiedPaymentModal } from './UnifiedPaymentModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertCircle, Receipt, TrendingUp, DollarSign, Package, Plus, Search, BarChart3, Filter } from 'lucide-react';
import { H1, H2, Body, BodySmall } from '@/components/ui/typography';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export const OrderManagementPage = () => {
  const navigate = useNavigate();
  const {
    orders,
    ordersLoading,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    searchInput,
    setSearchInput,
    downloadCSV,
  } = useOrderManagement();

  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  // Batch verification state removed - using new payment management page

  // Simple analytics using accurate data sources
  const { data: analytics, isLoading: analyticsLoading } = useSimpleOrderAnalytics();

  const handleConfirmPayment = (order) => {
    setSelectedOrderForPayment(order);
    setShowPaymentModal(true);
  };

  if (ordersLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-gray-50/40">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
          <OrderMetrics orders={[]} isLoading={true} />
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <Body className="text-gray-600">Loading orders...</Body>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate quick filter counts
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders?.filter(o => o.created_at.startsWith(today)).length || 0;
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
  const paidOrders = orders?.filter(o => ['paid', 'ordered', 'shipped', 'completed'].includes(o.status)).length || 0;
  const shippedOrders = orders?.filter(o => ['shipped', 'completed'].includes(o.status)).length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const unpaidOrders = orders?.filter(o => o.payment_status === 'unpaid').length || 0;
  const partialPayments = orders?.filter(o => o.payment_status === 'partial').length || 0;
  
  const orderCounts = {
    all: orders?.length || 0,
    today: todayOrders,
    pending: pendingOrders,
    paid: paidOrders,
    shipped: shippedOrders,
    completed: completedOrders,
    unpaid: unpaidOrders,
    partial: partialPayments,
  };
  
  // Apply quick filters
  const applyQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    
    // Reset other filters when using quick filters
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setSearchInput('');
    
    // Apply the quick filter logic
    switch (filter) {
      case 'today':
        // This would need to be implemented in the hook
        break;
      case 'pending':
        setStatusFilter('pending');
        break;
      case 'paid':
        setStatusFilter('paid');
        break;
      case 'shipped':
        setStatusFilter('shipped');
        break;
      case 'completed':
        setStatusFilter('completed');
        break;
      case 'unpaid':
        setPaymentStatusFilter('unpaid');
        break;
      case 'partial':
        setPaymentStatusFilter('partial');
        break;
      default:
        // 'all' - no additional filters
        break;
    }
  };
  
  const handleSelectOrder = (orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };
  
  const handleSelectAll = () => {
    if (selectedOrders.length === orders?.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders?.map(o => o.id) || []);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <H1 className="text-gray-900">Order Management</H1>
                <BodySmall className="text-gray-600">Payment tracking and order fulfillment</BodySmall>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/admin/payment-proofs')}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Payment Proofs
              </Button>
              <Button 
                onClick={downloadCSV} 
                variant="outline" 
                size="sm" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <OrderMetrics orders={orders || []} isLoading={ordersLoading} />

        {/* Main Content Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <H2 className="text-gray-900">Orders</H2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders by ID, customer, email, or product..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            {/* Quick Filters */}
            <OrderQuickFilters
              activeFilter={quickFilter}
              onFilterChange={applyQuickFilter}
              orderCounts={orderCounts}
            />
          </div>

          {/* Advanced Filters (Collapsible) */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent>
              <div className="px-6 pb-4 border-b border-gray-200">
                <OrderFilters
                  searchInput={searchInput}
                  onSearchChange={setSearchInput}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  paymentStatusFilter={paymentStatusFilter}
                  onPaymentStatusChange={setPaymentStatusFilter}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Content */}
          <div className="p-6">
            {orders && orders.length > 0 ? (
              <div className="space-y-3">
                {orders.map((order) => (
                  <CompactOrderListItem
                    key={order.id}
                    order={order}
                    isSelected={selectedOrders.includes(order.id)}
                    onSelect={handleSelectOrder}
                    onConfirmPayment={handleConfirmPayment}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <H2 className="text-gray-900 mb-2">No orders found</H2>
                <Body className="text-gray-600 mb-6">
                  {searchInput ||
                  statusFilter !== 'all' ||
                  paymentStatusFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Orders will appear here when customers place them.'}
                </Body>
              </div>
            )}
          </div>
        </div>

        {/* Payment Management Modal */}
        {selectedOrderForPayment && (
          <UnifiedPaymentModal
            quote={selectedOrderForPayment}
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedOrderForPayment(null);
            }}
            initialTab="overview"
          />
        )}

        {/* Debug Component - Remove in production */}
        <PaymentSyncDebugger />

        {/* Batch payment verification removed - now handled in dedicated payment management page */}
      </div>
    </div>
  );
};