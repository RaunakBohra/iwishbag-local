import { AdminOrderListItem } from "./AdminOrderListItem";
import { OrderFilters } from "./OrderFilters";
import { useOrderManagement } from "@/hooks/useOrderManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentConfirmationModal } from "./PaymentConfirmationModal";
import { BatchPaymentVerification } from "./BatchPaymentVerification";
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
    const [showBatchVerification, setShowBatchVerification] = useState(false);
    
    const { confirmPayment, isConfirmingPayment } = useOrderMutations(selectedOrderForPayment?.id);

    // Fetch orders with payment proofs for batch verification
    const { data: ordersWithPaymentProofs, refetch: refetchPaymentProofs } = useQuery({
        queryKey: ['orders-with-payment-proofs'],
        queryFn: async () => {
            // First try the RPC function
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_orders_with_payment_proofs', {
                status_filter: 'pending',
                limit_count: 100
            });
            
            if (!rpcError && rpcData) {
                // Transform RPC data to match our interface
                return rpcData.map(order => ({
                    id: order.order_id,
                    order_display_id: order.order_display_id,
                    final_total: order.final_total,
                    final_currency: order.final_currency,
                    payment_status: order.payment_status,
                    created_at: order.submitted_at,
                    paymentProofMessage: {
                        id: order.message_id,
                        verification_status: order.verification_status,
                        admin_notes: order.admin_notes,
                        attachment_file_name: order.attachment_file_name,
                        attachment_url: order.attachment_url,
                        verified_at: order.verified_at,
                        message_type: 'payment_proof' as const,
                        sender_id: order.customer_id
                    },
                    isSelected: false
                }));
            }
            
            // Fallback: Query directly from tables
            console.log('RPC function not available, using fallback query');
            
            // First check all payment proof messages
            const { data: allProofs, error: allProofsError } = await supabase
                .from('messages')
                .select('message_type, verification_status, quote_id')
                .eq('message_type', 'payment_proof');
            
            console.log('All payment proofs:', allProofs);
            
            // Get latest payment proof messages per quote (including all statuses)
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .eq('message_type', 'payment_proof')
                .order('created_at', { ascending: false })
                .limit(100);
            
            console.log('Payment proof messages query result:', { messages, error: messagesError });
            
            if (messagesError) {
                console.error('Error fetching payment proof messages:', messagesError);
                return [];
            }
            
            // Get quote IDs from messages
            const quoteIds = [...new Set(messages?.map(m => m.quote_id).filter(Boolean))];
            
            if (quoteIds.length === 0) {
                console.log('No quote IDs found in messages');
                return [];
            }
            
            // Fetch quotes separately
            const { data: quotes, error: quotesError } = await supabase
                .from('quotes')
                .select('id, order_display_id, final_total, final_currency, payment_status, user_id')
                .in('id', quoteIds);
            
            console.log('Quotes query result:', { quotes, quotesError });
            
            if (quotesError) {
                console.error('Error fetching quotes:', quotesError);
                return [];
            }
            
            // Create quotes map
            const quotesMap = new Map(quotes?.map(q => [q.id, q]) || []);
            
            // Group by quote_id and take the latest message for each
            const latestByQuote = new Map();
            messages?.forEach(msg => {
                if (!latestByQuote.has(msg.quote_id) || 
                    new Date(msg.created_at) > new Date(latestByQuote.get(msg.quote_id).created_at)) {
                    latestByQuote.set(msg.quote_id, msg);
                }
            });
            
            console.log('Grouped payment proofs by quote:', latestByQuote.size, 'unique quotes');
            
            // Transform to our interface (include all statuses)
            return Array.from(latestByQuote.values())
                .filter(msg => quotesMap.has(msg.quote_id)) // Only include if we have the quote data
                .map(msg => {
                    const quote = quotesMap.get(msg.quote_id)!;
                    return {
                        id: msg.quote_id,
                        order_display_id: quote.order_display_id,
                        final_total: quote.final_total,
                        final_currency: quote.final_currency,
                        payment_status: quote.payment_status,
                        created_at: msg.created_at,
                        paymentProofMessage: {
                            id: msg.id,
                            verification_status: msg.verification_status,
                            admin_notes: msg.admin_notes,
                            attachment_file_name: msg.attachment_file_name,
                            attachment_url: msg.attachment_url,
                            verified_at: msg.verified_at,
                            message_type: 'payment_proof' as const,
                            sender_id: quote.user_id
                        },
                        isSelected: false
                    };
                });
        },
        enabled: true,
        refetchInterval: 10000 // Refresh every 10 seconds for better responsiveness
    });

    // Get payment proof statistics
    const { data: paymentProofStats } = useQuery({
        queryKey: ['payment-proof-stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_payment_proof_stats');
            if (error) {
                console.error('Error fetching payment proof stats:', error);
                // Return default stats on error
                return { total: 0, pending: 0, verified: 0, confirmed: 0, rejected: 0 };
            }
            return data;
        },
        refetchInterval: 10000 // Refresh every 10 seconds for consistency
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

    // Calculate payment-focused statistics
    const statistics = useMemo(() => {
        if (!orders) return null;

        // Payment Status Statistics
        const unpaidOrders = orders.filter(o => !o.payment_status || o.payment_status === 'unpaid').length;
        const partialPaymentOrders = orders.filter(o => o.payment_status === 'partial').length;
        const paidOrders = orders.filter(o => o.payment_status === 'paid').length;
        const overpaidOrders = orders.filter(o => o.payment_status === 'overpaid').length;
        
        // Count pending payment proofs
        const pendingPaymentProofs = ordersWithPaymentProofs?.filter(o => 
            !o.paymentProofMessage?.verification_status || 
            o.paymentProofMessage?.verification_status === 'pending'
        ).length || 0;

        // Payment Method Statistics
        const paymentMethods = {
            bank_transfer: orders.filter(o => o.payment_method === 'bank_transfer').length,
            cod: orders.filter(o => o.payment_method === 'cod').length,
            stripe: orders.filter(o => o.payment_method === 'stripe').length,
            payu: orders.filter(o => o.payment_method === 'payu').length,
            paypal: orders.filter(o => o.payment_method === 'paypal').length,
        };

        // Financial Statistics
        const totalValue = orders.reduce((sum, o) => sum + (o.final_total || 0), 0);
        const totalPaid = orders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
        const totalOutstanding = totalValue - totalPaid;

        // Currency Statistics - Payments Received
        const currencyBreakdown = orders.reduce((acc, order) => {
            if (order.amount_paid && order.amount_paid > 0) {
                const currency = order.final_currency || 'USD';
                acc[currency] = (acc[currency] || 0) + order.amount_paid;
            }
            return acc;
        }, {} as Record<string, number>);

        // Currency Statistics - Outstanding Amounts
        const currencyOutstanding = orders.reduce((acc, order) => {
            if (order.final_total && order.final_total > 0) {
                const currency = order.final_currency || 'USD';
                const amountPaid = order.amount_paid || 0;
                const outstanding = order.final_total - amountPaid;
                
                if (outstanding > 0) {
                    acc[currency] = (acc[currency] || 0) + outstanding;
                }
            }
            return acc;
        }, {} as Record<string, number>);

        // Orders requiring immediate attention
        const actionRequiredOrders = orders.filter(o => 
            !o.payment_status || 
            o.payment_status === 'unpaid' || 
            o.payment_status === 'partial' || 
            o.payment_status === 'overpaid'
        );

        // Order Status Statistics (for tracking)
        const orderStatuses = {
            pending: orders.filter(o => o.status === 'pending').length,
            approved: orders.filter(o => o.status === 'approved').length,
            paid: orders.filter(o => o.status === 'paid').length,
            ordered: orders.filter(o => o.status === 'ordered').length,
            shipped: orders.filter(o => o.status === 'shipped').length,
            completed: orders.filter(o => o.status === 'completed').length,
        };

        return {
            totalOrders: orders.length,
            paymentStatus: { unpaidOrders, partialPaymentOrders, paidOrders, overpaidOrders },
            paymentMethods,
            financial: { totalValue, totalPaid, totalOutstanding },
            currencyBreakdown,
            currencyOutstanding,
            actionRequiredOrders,
            orderStatuses,
            pendingPaymentProofs
        };
    }, [orders, ordersWithPaymentProofs]);

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
                                {ordersWithPaymentProofs && ordersWithPaymentProofs.length > statistics.pendingPaymentProofs && (
                                    <p className="text-xs text-gray-500">{ordersWithPaymentProofs.length} total</p>
                                )}
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

            {/* Batch Payment Verification Modal */}
            <BatchPaymentVerification
                isOpen={showBatchVerification}
                onClose={() => {
                    setShowBatchVerification(false);
                    refetchPaymentProofs();
                }}
                orders={ordersWithPaymentProofs || []}
            />
        </div>
    );
};