import { AdminOrderListItem } from "./AdminOrderListItem";
import { OrderFilters } from "./OrderFilters";
import { useOrderManagement } from "@/hooks/useOrderManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentConfirmationModal } from "./PaymentConfirmationModal";
import { useOrderMutations } from "@/hooks/useOrderMutations";
import { useState } from "react";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Download,
  AlertCircle,
  Truck
} from "lucide-react";

export const OrderManagementPage = () => {
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
    
    const { confirmPayment, isConfirmingPayment } = useOrderMutations(selectedOrderForPayment?.id);

    const handleConfirmPayment = (order) => {
        setSelectedOrderForPayment(order);
        setShowPaymentModal(true);
    };

    const handlePaymentConfirmation = (amount, notes) => {
        confirmPayment({ amount, notes }, {
            onSuccess: () => {
                setShowPaymentModal(false);
                setSelectedOrderForPayment(null);
            }
        });
    };

    if (ordersLoading) {
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

    // Calculate statistics
    const totalOrders = orders?.length || 0;
    const pendingPaymentOrders = orders?.filter(o => o.status === 'payment_pending').length || 0;
    const partialPaymentOrders = orders?.filter(o => o.status === 'partial_payment').length || 0;
    const paidOrders = orders?.filter(o => o.status === 'paid').length || 0;
    const processingOrders = orders?.filter(o => o.status === 'processing').length || 0;
    const shippedOrders = orders?.filter(o => o.status === 'shipped').length || 0;
    const deliveredOrders = orders?.filter(o => o.status === 'delivered').length || 0;
    const totalValue = orders?.reduce((sum, o) => sum + (o.final_total || 0), 0) || 0;
    const totalPaid = orders?.reduce((sum, o) => sum + (o.amount_paid || 0), 0) || 0;
    const totalOutstanding = totalValue - totalPaid;

    return (
        <div className="space-y-4">
            {/* Compact Header with Actions */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Order Management</h1>
                <div className="flex gap-2">
                    <Button 
                        onClick={downloadCSV} 
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Action-focused Statistics - Smaller Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                {/* Pending Payment - Most Important */}
                <Card className={`col-span-2 ${pendingPaymentOrders > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-2xl font-bold ${pendingPaymentOrders > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                                    {pendingPaymentOrders}
                                </p>
                                <p className="text-xs text-muted-foreground">Awaiting Payment</p>
                            </div>
                            <AlertCircle className={`h-5 w-5 ${pendingPaymentOrders > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                        </div>
                    </CardContent>
                </Card>

                {/* Partial Payments */}
                {partialPaymentOrders > 0 && (
                    <Card className="col-span-2 bg-amber-50 border-amber-200">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-amber-600">{partialPaymentOrders}</p>
                                    <p className="text-xs text-muted-foreground">Partial Payment</p>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Processing */}
                <Card className={`${partialPaymentOrders > 0 ? '' : 'col-span-2'}`}>
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{processingOrders}</p>
                                <p className="text-xs text-muted-foreground">Processing</p>
                            </div>
                            <Clock className="h-5 w-5 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                {/* Paid */}
                <Card>
                    <CardContent className="p-3">
                        <div>
                            <p className="text-2xl font-bold text-green-600">{paidOrders}</p>
                            <p className="text-xs text-muted-foreground">Paid</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Shipped */}
                <Card>
                    <CardContent className="p-3">
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{shippedOrders}</p>
                            <p className="text-xs text-muted-foreground">Shipped</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivered */}
                <Card>
                    <CardContent className="p-3">
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{deliveredOrders}</p>
                            <p className="text-xs text-muted-foreground">Delivered</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Summary - Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Expected Revenue</p>
                            <p className="text-lg font-semibold">${totalValue.toFixed(2)}</p>
                        </div>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Amount Collected</p>
                            <p className="text-lg font-semibold text-green-600">${totalPaid.toFixed(2)}</p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Outstanding</p>
                            <p className="text-lg font-semibold text-orange-600">${totalOutstanding.toFixed(2)}</p>
                        </div>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Total Orders</p>
                            <p className="text-lg font-semibold">{totalOrders}</p>
                        </div>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                </Card>
            </div>

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

            {/* Payment Confirmation Modal */}
            {selectedOrderForPayment && (
                <PaymentConfirmationModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedOrderForPayment(null);
                    }}
                    onConfirm={handlePaymentConfirmation}
                    quote={selectedOrderForPayment}
                    isConfirming={isConfirmingPayment}
                />
            )}
        </div>
    );
};