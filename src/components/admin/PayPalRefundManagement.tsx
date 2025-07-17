import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Download,
  RotateCcw,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface PayPalTransaction {
  id: string;
  paypal_capture_id: string;
  paypal_order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  total_refunded: number;
  refund_count: number;
  is_fully_refunded: boolean;
  quote_id: string;
  user_id: string;
  quotes?: {
    product_name: string;
    user_id: string;
  };
}

interface PayPalRefund {
  id: string;
  refund_id: string;
  original_transaction_id: string;
  refund_amount: number;
  original_amount: number;
  currency: string;
  refund_type: string;
  reason_code: string;
  reason_description: string;
  admin_notes: string;
  customer_note: string;
  status: string;
  paypal_status: string;
  refund_date: string;
  completed_at: string;
  created_at: string;
  processed_by: string;
}

interface RefundReason {
  code: string;
  description: string;
  customer_friendly_description: string;
}

interface RefundFormData {
  paypal_capture_id: string;
  refund_amount?: number;
  currency: string;
  reason_code: string;
  reason_description: string;
  admin_notes: string;
  customer_note: string;
  notify_customer: boolean;
}

export const PayPalRefundManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTransaction, setSelectedTransaction] = useState<PayPalTransaction | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundFormData, setRefundFormData] = useState<RefundFormData>({
    paypal_capture_id: '',
    currency: 'USD',
    reason_code: '',
    reason_description: '',
    admin_notes: '',
    customer_note: '',
    notify_customer: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch PayPal transactions
  const {
    data: transactions,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['paypal-transactions-refund'],
    queryFn: async (): Promise<PayPalTransaction[]> => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(
          `
          id,
          paypal_capture_id,
          paypal_order_id,
          amount,
          currency,
          status,
          created_at,
          total_refunded,
          refund_count,
          is_fully_refunded,
          quote_id,
          user_id,
          quotes(product_name, user_id)
        `,
        )
        .eq('payment_method', 'paypal')
        .eq('status', 'completed')
        .not('paypal_capture_id', 'is.null')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch PayPal refunds
  const {
    data: refunds,
    isLoading: refundsLoading,
    refetch: refetchRefunds,
  } = useQuery({
    queryKey: ['paypal-refunds'],
    queryFn: async (): Promise<PayPalRefund[]> => {
      const { data, error } = await supabase
        .from('paypal_refunds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch refund reasons
  const { data: refundReasons } = useQuery({
    queryKey: ['paypal-refund-reasons'],
    queryFn: async (): Promise<RefundReason[]> => {
      const { data, error } = await supabase
        .from('paypal_refund_reasons')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
  });

  // Process refund mutation
  const processRefundMutation = useMutation({
    mutationFn: async (refundData: RefundFormData) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify(refundData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to process refund');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Refund Processed',
        description: `Refund of ${formatCurrency(data.refund_amount, refundFormData.currency)} has been initiated.`,
      });
      queryClient.invalidateQueries({
        queryKey: ['paypal-transactions-refund'],
      });
      queryClient.invalidateQueries({ queryKey: ['paypal-refunds'] });
      setShowRefundDialog(false);
      setSelectedTransaction(null);
      resetRefundForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Refund Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetRefundForm = () => {
    setRefundFormData({
      paypal_capture_id: '',
      currency: 'USD',
      reason_code: '',
      reason_description: '',
      admin_notes: '',
      customer_note: '',
      notify_customer: true,
    });
  };

  const handleRefundTransaction = (transaction: PayPalTransaction) => {
    setSelectedTransaction(transaction);
    setRefundFormData({
      paypal_capture_id: transaction.paypal_capture_id,
      currency: transaction.currency,
      reason_code: '',
      reason_description: '',
      admin_notes: '',
      customer_note:
        'Your refund has been processed and will appear in your account within 3-5 business days.',
      notify_customer: true,
    });
    setShowRefundDialog(true);
  };

  const handleSubmitRefund = () => {
    if (!refundFormData.reason_code) {
      toast({
        title: 'Missing Information',
        description: 'Please select a refund reason.',
        variant: 'destructive',
      });
      return;
    }

    processRefundMutation.mutate(refundFormData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRefundTypeBadge = (type: string) => {
    return type === 'FULL' ? (
      <Badge className="bg-blue-100 text-blue-800">Full Refund</Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800">Partial Refund</Badge>
    );
  };

  const filteredTransactions =
    transactions?.filter((transaction) => {
      const productName = transaction.quotes?.product_name || 'Test Transaction';
      const matchesSearch =
        searchQuery === '' ||
        transaction.paypal_capture_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.paypal_order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        productName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'refundable' && !transaction.is_fully_refunded) ||
        (statusFilter === 'refunded' && transaction.is_fully_refunded) ||
        (statusFilter === 'partial' &&
          transaction.refund_count > 0 &&
          !transaction.is_fully_refunded);

      return matchesSearch && matchesStatus;
    }) || [];

  const refundStats = React.useMemo(() => {
    if (!refunds) return null;

    const totalRefunds = refunds.length;
    const completedRefunds = refunds.filter((r) => r.status === 'COMPLETED').length;
    const pendingRefunds = refunds.filter((r) => r.status === 'PENDING').length;
    const totalAmount = refunds
      .filter((r) => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + r.refund_amount, 0);

    return {
      totalRefunds,
      completedRefunds,
      pendingRefunds,
      totalAmount,
      successRate: totalRefunds > 0 ? ((completedRefunds / totalRefunds) * 100).toFixed(1) : '0',
    };
  }, [refunds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">PayPal Refund Management</h3>
          <p className="text-muted-foreground">
            Process refunds and track refund history for PayPal transactions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetchTransactions();
            refetchRefunds();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {refundStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{refundStats.totalRefunds}</div>
              <p className="text-xs text-muted-foreground">{refundStats.pendingRefunds} pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{refundStats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {refundStats.completedRefunds} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${refundStats.totalAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All currencies in USD</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Refund</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {refundStats.completedRefunds > 0
                  ? (refundStats.totalAmount / refundStats.completedRefunds).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Per refund</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">
            <CreditCard className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="refunds">
            <RotateCcw className="h-4 w-4 mr-2" />
            Refund History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Find Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by transaction ID, order ID, or product..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status-filter">Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All transactions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="refundable">Refundable</SelectItem>
                      <SelectItem value="partial">Partially Refunded</SelectItem>
                      <SelectItem value="refunded">Fully Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle>PayPal Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="space-y-2">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.paypal_capture_id}</span>
                          {transaction.is_fully_refunded ? (
                            <Badge className="bg-red-100 text-red-800">Fully Refunded</Badge>
                          ) : transaction.refund_count > 0 ? (
                            <Badge className="bg-orange-100 text-orange-800">
                              Partially Refunded
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Refundable</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.quotes?.product_name || 'Test Transaction'} •{' '}
                          {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                        </div>
                        {transaction.refund_count > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Refunded:{' '}
                            {formatCurrency(transaction.total_refunded, transaction.currency)} of{' '}
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Available:{' '}
                            {formatCurrency(
                              transaction.amount - (transaction.total_refunded || 0),
                              transaction.currency,
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleRefundTransaction(transaction)}
                          disabled={transaction.is_fully_refunded}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Refund
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found matching your criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-6">
          {/* Refund History */}
          <Card>
            <CardHeader>
              <CardTitle>Refund History</CardTitle>
            </CardHeader>
            <CardContent>
              {refundsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : refunds && refunds.length > 0 ? (
                <div className="space-y-2">
                  {refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{refund.refund_id}</span>
                          {getStatusBadge(refund.status)}
                          {getRefundTypeBadge(refund.refund_type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Original: {refund.original_transaction_id} •{' '}
                          {format(new Date(refund.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Reason: {refund.reason_description || refund.reason_code}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(refund.refund_amount, refund.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {refund.status === 'COMPLETED' && refund.completed_at
                            ? `Completed ${format(new Date(refund.completed_at), 'MMM d, yyyy')}`
                            : 'Processing...'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No refunds found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process PayPal Refund</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Process a full or partial refund for this PayPal transaction. The refund will be sent
              directly to the customer's PayPal account.
            </p>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Capture ID:</span>
                      <p className="text-muted-foreground">
                        {selectedTransaction.paypal_capture_id}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Order ID:</span>
                      <p className="text-muted-foreground">{selectedTransaction.paypal_order_id}</p>
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span>
                      <p className="text-muted-foreground">
                        {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Available to Refund:</span>
                      <p className="text-muted-foreground">
                        {formatCurrency(
                          selectedTransaction.amount - (selectedTransaction.total_refunded || 0),
                          selectedTransaction.currency,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Product:</span>
                      <p className="text-muted-foreground">
                        {selectedTransaction.quotes?.product_name || 'Test Transaction'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>
                      <p className="text-muted-foreground">
                        {format(new Date(selectedTransaction.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Refund Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="refund_amount">Refund Amount (Optional)</Label>
                    <Input
                      id="refund_amount"
                      type="number"
                      step="0.01"
                      placeholder={`Max: ${(selectedTransaction.amount - (selectedTransaction.total_refunded || 0)).toFixed(2)}`}
                      value={refundFormData.refund_amount || ''}
                      onChange={(e) =>
                        setRefundFormData({
                          ...refundFormData,
                          refund_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for full refund
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="reason_code">Refund Reason *</Label>
                    <Select
                      value={refundFormData.reason_code}
                      onValueChange={(value) =>
                        setRefundFormData({
                          ...refundFormData,
                          reason_code: value,
                          reason_description:
                            refundReasons?.find((r) => r.code === value)?.description || '',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {refundReasons?.map((reason) => (
                          <SelectItem key={reason.code} value={reason.code}>
                            {reason.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason_description">Detailed Reason</Label>
                  <Textarea
                    id="reason_description"
                    placeholder="Provide additional details about the refund reason..."
                    value={refundFormData.reason_description}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        reason_description: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="customer_note">Customer Note</Label>
                  <Textarea
                    id="customer_note"
                    placeholder="Note that will be visible to the customer..."
                    value={refundFormData.customer_note}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        customer_note: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="admin_notes">Internal Notes</Label>
                  <Textarea
                    id="admin_notes"
                    placeholder="Internal notes for admin reference..."
                    value={refundFormData.admin_notes}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        admin_notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRefund}
                  disabled={processRefundMutation.isPending || !refundFormData.reason_code}
                >
                  {processRefundMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Process Refund
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
