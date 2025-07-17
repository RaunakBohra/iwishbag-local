import { AdminOrderListItem } from './AdminOrderListItem';
import { OrderFilters } from './OrderFilters';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { useSimpleOrderAnalytics } from '@/hooks/useSimpleOrderAnalytics';
import { PaymentSyncDebugger } from '../debug/PaymentSyncDebugger';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UnifiedPaymentModal } from './UnifiedPaymentModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertCircle, Receipt, TrendingUp, DollarSign, Package } from 'lucide-react';

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
  // Batch verification state removed - using new payment management page

  // Simple analytics using accurate data sources
  const { data: analytics, isLoading: analyticsLoading } = useSimpleOrderAnalytics();

  const handleConfirmPayment = (order) => {
    setSelectedOrderForPayment(order);
    setShowPaymentModal(true);
  };

  if (ordersLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Payment tracking and order fulfillment</p>
        </div>
        <div className="flex gap-2">
          {/* Payment Proofs Button */}
          <Button
            onClick={() => navigate('/admin/payment-proofs')}
            variant="outline"
            size="sm"
            className="gap-2 border-blue-300 hover:bg-blue-50"
          >
            <Receipt className="h-4 w-4" />
            Payment Proofs
          </Button>
          <Button onClick={downloadCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Simple Analytics - Essential Only */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pending Proofs - High Priority */}
          <Card
            className={analytics.pendingProofs > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-2xl font-bold ${analytics.pendingProofs > 0 ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    {analytics.pendingProofs}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending Proofs</p>
                </div>
                <Receipt
                  className={`h-5 w-5 ${analytics.pendingProofs > 0 ? 'text-blue-500' : 'text-gray-400'}`}
                />
              </div>
              {analytics.pendingProofs > 0 && (
                <Button
                  size="sm"
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate('/admin/payment-proofs')}
                >
                  Review Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Unpaid Orders - High Priority */}
          <Card className={analytics.unpaidOrders > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-2xl font-bold ${analytics.unpaidOrders > 0 ? 'text-red-600' : 'text-gray-600'}`}
                  >
                    {analytics.unpaidOrders}
                  </p>
                  <p className="text-sm text-muted-foreground">Unpaid Orders</p>
                </div>
                <AlertCircle
                  className={`h-5 w-5 ${analytics.unpaidOrders > 0 ? 'text-red-500' : 'text-gray-400'}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Total Outstanding */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    ${analytics.totalOutstanding}
                  </p>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                </div>
                <DollarSign className="h-5 w-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{analytics.recentPayments}</p>
                  <p className="text-sm text-muted-foreground">Payments (7 days)</p>
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <OrderFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        paymentStatusFilter={paymentStatusFilter}
        onPaymentStatusChange={setPaymentStatusFilter}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
      />

      {/* Orders List */}
      <div className="space-y-4">
        {orders && orders.length > 0 ? (
          orders.map((order) => (
            <AdminOrderListItem
              key={order.id}
              order={order}
              isSelected={false}
              onSelect={() => {}}
              onConfirmPayment={handleConfirmPayment}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        )}
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
  );
};
