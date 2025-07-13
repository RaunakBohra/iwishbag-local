import { AdminOrderListItem } from "./AdminOrderListItem";
import { OrderFilters } from "./OrderFilters";
import { useOrderManagement } from "@/hooks/useOrderManagement";
import { PaymentSyncDebugger } from "../debug/PaymentSyncDebugger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentConfirmationModal } from "./PaymentConfirmationModal";
// BatchPaymentVerification removed - using new simplified payment management
import { useOrderMutations } from "@/hooks/useOrderMutations";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  Truck,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  Wallet,
  PiggyBank,
  Receipt,
  Users
} from "lucide-react";

export const OrderManagementPage = () => {
    const queryClient = useQueryClient();
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
    
    const { confirmPayment, isConfirmingPayment } = useOrderMutations(selectedOrderForPayment?.id);

    // Simplified payment proof count query - much lighter than full data fetch
    const { data: pendingPaymentProofsCount = 0 } = useQuery({
        queryKey: ['pending-payment-proofs-count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('message_type', 'payment_proof')
                .or('verification_status.is.null,verification_status.eq.pending');
            
            if (error) {
                console.error('Error fetching pending payment proofs count:', error);
                return 0;
            }
            return count || 0;
        },
        refetchInterval: 30000, // Reduced frequency - every 30 seconds
        staleTime: 20000 // Cache for 20 seconds
    });

    // Simplified payment proof statistics - reduced frequency
    const { data: paymentProofStats } = useQuery({
        queryKey: ['payment-proof-stats'],
        queryFn: async () => {
            // Simplified stats query instead of RPC
            const { data, error } = await supabase
                .from('messages')
                .select('verification_status')
                .eq('message_type', 'payment_proof');
            
            if (error) {
                console.error('Error fetching payment proof stats:', error);
                return { total: 0, pending: 0, verified: 0, confirmed: 0, rejected: 0 };
            }
            
            const total = data?.length || 0;
            const pending = data?.filter(p => !p.verification_status || p.verification_status === 'pending').length || 0;
            const verified = data?.filter(p => p.verification_status === 'verified').length || 0;
            const confirmed = data?.filter(p => p.verification_status === 'confirmed').length || 0;
            const rejected = data?.filter(p => p.verification_status === 'rejected').length || 0;
            
            return { total, pending, verified, confirmed, rejected };
        },
        refetchInterval: 60000, // Reduced to every 60 seconds
        staleTime: 45000 // Cache for 45 seconds
    });

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

    // Optimized statistics calculation with better performance
    const statistics = useMemo(() => {
        if (!orders || orders.length === 0) return null;

        // Initialize counters
        const stats = {
            totalOrders: orders.length,
            paymentStatus: { unpaidOrders: 0, partialPaymentOrders: 0, paidOrders: 0, overpaidOrders: 0 },
            paymentMethods: { bank_transfer: 0, cod: 0, stripe: 0, payu: 0, paypal: 0 },
            financial: { totalValue: 0, totalPaid: 0, totalOutstanding: 0 },
            currencyBreakdown: {} as Record<string, number>,
            currencyOutstanding: {} as Record<string, number>,
            actionRequiredOrders: [] as any[],
            orderStatuses: { pending: 0, approved: 0, paid: 0, ordered: 0, shipped: 0, completed: 0 },
            pendingPaymentProofs: pendingPaymentProofsCount
        };

        // Single pass through orders for all calculations
        orders.forEach(order => {
            // Payment Status
            const paymentStatus = order.payment_status || 'unpaid';
            if (paymentStatus === 'unpaid') stats.paymentStatus.unpaidOrders++;
            else if (paymentStatus === 'partial') stats.paymentStatus.partialPaymentOrders++;
            else if (paymentStatus === 'paid') stats.paymentStatus.paidOrders++;
            else if (paymentStatus === 'overpaid') stats.paymentStatus.overpaidOrders++;

            // Payment Methods
            const method = order.payment_method;
            if (method && stats.paymentMethods.hasOwnProperty(method)) {
                stats.paymentMethods[method as keyof typeof stats.paymentMethods]++;
            }

            // Financial calculations
            const finalTotal = order.final_total || 0;
            const amountPaid = order.amount_paid || 0;
            stats.financial.totalValue += finalTotal;
            stats.financial.totalPaid += amountPaid;

            // Currency breakdowns
            const currency = order.final_currency || 'USD';
            if (amountPaid > 0) {
                stats.currencyBreakdown[currency] = (stats.currencyBreakdown[currency] || 0) + amountPaid;
            }
            
            const outstanding = finalTotal - amountPaid;
            if (outstanding > 0) {
                stats.currencyOutstanding[currency] = (stats.currencyOutstanding[currency] || 0) + outstanding;
            }

            // Orders requiring attention
            if (!paymentStatus || ['unpaid', 'partial', 'overpaid'].includes(paymentStatus)) {
                stats.actionRequiredOrders.push(order);
            }

            // Order Status
            const status = order.status;
            if (status && stats.orderStatuses.hasOwnProperty(status)) {
                stats.orderStatuses[status as keyof typeof stats.orderStatuses]++;
            }
        });

        stats.financial.totalOutstanding = stats.financial.totalValue - stats.financial.totalPaid;
        return stats;
    }, [orders, pendingPaymentProofsCount]);

    if (ordersLoading || !statistics) {
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

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'bank_transfer': return Landmark;
            case 'cod': return Banknote;
            case 'stripe': return CreditCard;
            case 'payu': return Smartphone;
            case 'paypal': return Wallet;
            default: return DollarSign;
        }
    };

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

            {/* Payment Status Overview - Priority Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Payment Proof Verification Card */}
                <Card className={`${statistics.pendingPaymentProofs > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-3xl font-bold ${statistics.pendingPaymentProofs > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {statistics.pendingPaymentProofs}
                                </p>
                                <p className="text-sm text-muted-foreground">Pending Proofs</p>
                            </div>
                            <Receipt className={`h-6 w-6 ${statistics.pendingPaymentProofs > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                        </div>
                        <Button 
                            size="sm" 
                            className={`w-full mt-2 ${statistics.pendingPaymentProofs > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                            onClick={() => navigate('/admin/payment-proofs')}
                        >
                            {statistics.pendingPaymentProofs > 0 ? 'Review Now' : 'View All'}
                        </Button>
                    </CardContent>
                </Card>
                {/* Unpaid Orders - Highest Priority */}
                <Card className={`${statistics.paymentStatus.unpaidOrders > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-3xl font-bold ${statistics.paymentStatus.unpaidOrders > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {statistics.paymentStatus.unpaidOrders}
                                </p>
                                <p className="text-sm text-muted-foreground">Unpaid Orders</p>
                            </div>
                            <AlertCircle className={`h-6 w-6 ${statistics.paymentStatus.unpaidOrders > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                        </div>
                    </CardContent>
                </Card>

                {/* Partial Payments - High Priority */}
                <Card className={`${statistics.paymentStatus.partialPaymentOrders > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-3xl font-bold ${statistics.paymentStatus.partialPaymentOrders > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                                    {statistics.paymentStatus.partialPaymentOrders}
                                </p>
                                <p className="text-sm text-muted-foreground">Partial Payments</p>
                            </div>
                            <AlertTriangle className={`h-6 w-6 ${statistics.paymentStatus.partialPaymentOrders > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                        </div>
                    </CardContent>
                </Card>

                {/* Overpaid Orders - Needs Attention */}
                <Card className={`${statistics.paymentStatus.overpaidOrders > 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-3xl font-bold ${statistics.paymentStatus.overpaidOrders > 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                                    {statistics.paymentStatus.overpaidOrders}
                                </p>
                                <p className="text-sm text-muted-foreground">Overpaid Orders</p>
                            </div>
                            <PiggyBank className={`h-6 w-6 ${statistics.paymentStatus.overpaidOrders > 0 ? 'text-purple-500' : 'text-gray-400'}`} />
                        </div>
                    </CardContent>
                </Card>

                {/* Paid Orders - Success Metric */}
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-bold text-green-600">{statistics.paymentStatus.paidOrders}</p>
                                <p className="text-sm text-muted-foreground">Paid Orders</p>
                            </div>
                            <CheckCircle className="h-6 w-6 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Method Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Methods Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(statistics.paymentMethods).map(([method, count]) => {
                            const Icon = getPaymentMethodIcon(method);
                            const methodName = method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                            
                            return (
                                <div key={method} className="flex items-center gap-3 p-3 border rounded-lg">
                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold">{count}</p>
                                        <p className="text-xs text-muted-foreground">{methodName}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Financial Overview - Currency Focused */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                                <p className="text-2xl font-bold text-red-600">${statistics.financial.totalOutstanding.toFixed(2)}</p>
                            </div>
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Amount Collected</p>
                                <p className="text-2xl font-bold text-green-600">${statistics.financial.totalPaid.toFixed(2)}</p>
                            </div>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                <p className="text-2xl font-bold">{statistics.totalOrders}</p>
                            </div>
                            <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Currency-Specific Payment Tracking */}
            {(Object.keys(statistics.currencyBreakdown).length > 0 || Object.keys(statistics.currencyOutstanding).length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payments Received by Currency */}
                    {Object.keys(statistics.currencyBreakdown).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    Payments Received by Currency
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(statistics.currencyBreakdown).map(([currency, amount]) => (
                                        <div key={currency} className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-green-50 to-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-bold text-green-700">{currency}</span>
                                                </div>
                                                <span className="font-medium">{currency}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-green-600">{amount.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">Collected</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Outstanding Amounts by Currency */}
                    {Object.keys(statistics.currencyOutstanding).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    Outstanding Amounts by Currency
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(statistics.currencyOutstanding).map(([currency, amount]) => (
                                        <div key={currency} className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-red-50 to-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-bold text-red-700">{currency}</span>
                                                </div>
                                                <span className="font-medium">{currency}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-red-600">{amount.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">Outstanding</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Order Status Tracking */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Order Progress Tracking
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                        {Object.entries(statistics.orderStatuses).map(([status, count]) => (
                            <div key={status} className="text-center p-3 border rounded-lg">
                                <p className="text-2xl font-bold">{count}</p>
                                <p className="text-xs text-muted-foreground capitalize">{status}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

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

            {/* Debug Component - Remove in production */}
            <PaymentSyncDebugger />

            {/* Batch payment verification removed - now handled in dedicated payment management page */}
        </div>
    );
};