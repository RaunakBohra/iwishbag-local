import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DollarSign, 
  Plus, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  CreditCard,
  Banknote,
  Receipt,
  History,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  X,
  Calendar,
  User,
  FileText,
  Loader2,
  Download,
  Shield
} from "lucide-react";
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { getCurrencySymbol, getCountryCurrency, getDestinationCountryFromQuote, formatAmountForDisplay } from '@/lib/currencyUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RefundManagementModal } from './RefundManagementModal';
import { PaymentProofButton } from '../payment/PaymentProofButton';

interface UnifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: any;
}

type TabValue = 'overview' | 'record' | 'verify' | 'history' | 'refund';

export const UnifiedPaymentModal: React.FC<UnifiedPaymentModalProps> = ({
  isOpen,
  onClose,
  quote,
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const { formatAmount } = useQuoteDisplayCurrency({ quote });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get currency information
  const destinationCountry = quote ? getDestinationCountryFromQuote(quote) : 'US';
  const currency = getCountryCurrency(destinationCountry);
  const currencySymbol = getCurrencySymbol(currency);

  // Fetch payment data
  const { data: paymentLedger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['payment-ledger', quote.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_ledger')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!quote.id,
  });

  const { data: paymentProofs, isLoading: proofsLoading } = useQuery({
    queryKey: ['payment-proofs', quote.id],
    queryFn: async () => {
      // Query messages table for payment proofs
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_id', quote.id)
        .eq('message_type', 'payment_proof')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform messages to proof format
      return messages?.map(msg => ({
        id: msg.id,
        quote_id: msg.quote_id,
        file_name: msg.attachment_file_name || 'Payment Proof',
        attachment_url: msg.attachment_url || '',
        created_at: msg.created_at,
        verified_at: msg.verified_at,
        verified_by: msg.verified_by,
        verified_amount: msg.verified_amount,
        verification_notes: msg.verification_notes,
        verification_status: msg.verification_status
      })) || [];
    },
    enabled: isOpen && !!quote.id && quote.payment_method === 'bank_transfer',
  });

  // Calculate payment summary
  const paymentSummary = useMemo(() => {
    const totalPaid = paymentLedger?.reduce((sum, entry) => {
      if (entry.transaction_type === 'payment') return sum + (entry.amount || 0);
      if (entry.transaction_type === 'refund') return sum - (entry.amount || 0);
      return sum;
    }, 0) || 0;

    const finalTotal = quote.final_total || 0;
    const remaining = finalTotal - totalPaid;
    const status = remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
    const isOverpaid = totalPaid > finalTotal;

    return {
      finalTotal,
      totalPaid,
      remaining: Math.max(0, remaining),
      overpaidAmount: isOverpaid ? totalPaid - finalTotal : 0,
      status,
      isOverpaid,
      percentagePaid: finalTotal > 0 ? (totalPaid / finalTotal) * 100 : 0,
    };
  }, [paymentLedger, quote.final_total]);

  // Payment recording state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Reset payment form when modal opens
  useEffect(() => {
    if (isOpen && paymentSummary.remaining > 0) {
      setPaymentAmount(paymentSummary.remaining.toFixed(2));
    }
  }, [isOpen, paymentSummary.remaining]);

  // Payment verification state
  const [verifyProofId, setVerifyProofId] = useState<string | null>(null);
  const [verifyAmount, setVerifyAmount] = useState<string>('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Handle payment recording
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    setIsRecording(true);
    
    try {
      const { data, error } = await supabase.rpc('record_payment_with_ledger_and_triggers', {
        p_quote_id: quote.id,
        p_amount: amount,
        p_currency: currency,
        p_payment_method: paymentMethod,
        p_transaction_reference: transactionId || `MANUAL-${Date.now()}`,
        p_notes: paymentNotes,
        p_recorded_by: (await supabase.auth.getUser()).data.user?.id || null,
        p_payment_date: paymentDate
      });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `Successfully recorded ${formatAmountForDisplay(amount, currency)} payment.`,
      });

      // Reset form
      setPaymentAmount('');
      setTransactionId('');
      setPaymentNotes('');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
      
      // Switch to history tab
      setActiveTab('history');
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment.",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };

  // Handle payment proof verification
  const handleVerifyProof = async () => {
    if (!verifyProofId || !verifyAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a proof and enter the amount.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(verifyAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Record the payment
      const { error: paymentError } = await supabase.rpc('record_payment_with_ledger_and_triggers', {
        p_quote_id: quote.id,
        p_amount: amount,
        p_currency: currency,
        p_payment_method: 'bank_transfer',
        p_transaction_reference: `PROOF-${verifyProofId}`,
        p_notes: verifyNotes || 'Payment verified from uploaded proof',
        p_recorded_by: (await supabase.auth.getUser()).data.user?.id || null,
        p_payment_date: new Date().toISOString().split('T')[0]
      });

      if (paymentError) throw paymentError;

      // Update proof status in messages table
      const { error: proofError } = await supabase
        .from('messages')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_amount: amount,
          verification_notes: verifyNotes,
          verification_status: 'verified'
        })
        .eq('id', verifyProofId);

      if (proofError) throw proofError;

      toast({
        title: "Payment Verified",
        description: `Successfully verified payment of ${formatAmountForDisplay(amount, currency)}.`,
      });

      // Reset form
      setVerifyProofId(null);
      setVerifyAmount('');
      setVerifyNotes('');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-proofs', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      
      // Switch to history tab
      setActiveTab('history');
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Export payment history to CSV
  const handleExportPaymentHistory = () => {
    if (!paymentLedger || paymentLedger.length === 0) {
      toast({
        title: "No Data",
        description: "No payment history to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare CSV headers
      const headers = [
        'Date',
        'Type',
        'Method',
        'Gateway',
        'Amount',
        'Currency',
        'Balance After',
        'Reference',
        'Notes',
        'Recorded By'
      ];

      // Prepare CSV rows
      const rows = paymentLedger.map(entry => [
        format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
        entry.transaction_type || 'payment',
        entry.payment_method || '-',
        entry.gateway_code || '-',
        entry.amount?.toFixed(2) || '0.00',
        currency,
        entry.balance_after?.toFixed(2) || '0.00',
        entry.reference_number || entry.gateway_transaction_id || '-',
        entry.notes?.replace(/,/g, ';') || '-',
        entry.created_by_profile?.full_name || entry.created_by_profile?.email || 'System'
      ]);

      // Create CSV content
      const csvContent = [
        `Payment History for Order ${quote.display_id}`,
        `Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
        `Total Amount: ${currency} ${quote.final_total?.toFixed(2)}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payment_history_${quote.display_id}_${format(new Date(), 'yyyyMMdd')}.csv`;
      link.click();

      toast({
        title: "Export Successful",
        description: "Payment history exported to CSV.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export payment history.",
        variant: "destructive",
      });
    }
  };

  // Determine which tabs to show based on payment status and method
  const availableTabs = useMemo(() => {
    const tabs: TabValue[] = ['overview', 'history'];
    
    // Show record tab for unpaid or partially paid
    if (paymentSummary.status !== 'paid' || paymentSummary.isOverpaid) {
      tabs.splice(1, 0, 'record');
    }
    
    // Show verify tab for bank transfers with unverified proofs
    if (quote.payment_method === 'bank_transfer' && paymentProofs?.some(p => !p.verified_at)) {
      tabs.splice(tabs.indexOf('record') + 1, 0, 'verify');
    }
    
    // Show refund tab for paid or overpaid
    if (paymentSummary.totalPaid > 0) {
      tabs.push('refund');
    }
    
    return tabs;
  }, [paymentSummary, quote.payment_method, paymentProofs]);

  const getPaymentMethodIcon = (method: string | null | undefined) => {
    if (!method) return <DollarSign className="w-5 h-5" />;
    
    switch (method.toLowerCase()) {
      case 'bank_transfer':
      case 'wire_transfer':
        return <Banknote className="w-5 h-5 text-blue-500" />;
      case 'payu':
      case 'stripe':
      case 'credit_card':
        return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'cash':
        return <DollarSign className="w-5 h-5 text-gray-500" />;
      case 'upi':
      case 'esewa':
        return <Smartphone className="w-5 h-5 text-purple-500" />;
      case 'check':
      case 'cheque':
        return <FileText className="w-5 h-5 text-orange-500" />;
      case 'credit_note':
        return <Receipt className="w-5 h-5 text-yellow-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'partial': return 'text-orange-600 bg-orange-50';
      case 'unpaid': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Payment Management - {quote.display_id}</DialogTitle>
            <DialogDescription>
              Manage all payment activities for this order in one place
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
              {availableTabs.includes('overview') && (
                <TabsTrigger value="overview">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
              )}
              {availableTabs.includes('record') && (
                <TabsTrigger value="record">
                  <Plus className="w-4 h-4 mr-2" />
                  Record
                </TabsTrigger>
              )}
              {availableTabs.includes('verify') && (
                <TabsTrigger value="verify">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify
                </TabsTrigger>
              )}
              {availableTabs.includes('history') && (
                <TabsTrigger value="history">
                  <History className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
              )}
              {availableTabs.includes('refund') && (
                <TabsTrigger value="refund">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refund
                </TabsTrigger>
              )}
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Payment Summary Card */}
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
                  
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Payment Progress</span>
                      <span>{Math.min(100, Math.round(paymentSummary.percentagePaid))}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={cn(
                          "h-3 rounded-full transition-all",
                          paymentSummary.isOverpaid ? "bg-blue-600" : 
                          paymentSummary.status === 'paid' ? "bg-green-600" : 
                          "bg-orange-600"
                        )}
                        style={{ width: `${Math.min(100, paymentSummary.percentagePaid)}%` }}
                      />
                    </div>
                  </div>

                  {/* Amount Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Total</p>
                      <p className="text-2xl font-bold">{formatAmount(paymentSummary.finalTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatAmountForDisplay(paymentSummary.totalPaid, currency)}
                      </p>
                    </div>
                    {paymentSummary.remaining > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-xl font-semibold text-orange-600">
                          {formatAmountForDisplay(paymentSummary.remaining, currency)}
                        </p>
                      </div>
                    )}
                    {paymentSummary.isOverpaid && (
                      <div>
                        <p className="text-sm text-muted-foreground">Overpaid</p>
                        <p className="text-xl font-semibold text-blue-600">
                          {formatAmountForDisplay(paymentSummary.overpaidAmount, currency)}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* Status and Quick Actions */}
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-sm px-3 py-1", getStatusColor(paymentSummary.status))}>
                      {paymentSummary.status === 'paid' ? 'Fully Paid' : 
                       paymentSummary.status === 'partial' ? 'Partially Paid' : 'Unpaid'}
                    </Badge>
                    
                    <div className="flex gap-2">
                      {paymentSummary.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          onClick={() => setActiveTab('record')}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Record Payment
                        </Button>
                      )}
                      {quote.payment_method === 'bank_transfer' && (
                        <PaymentProofButton
                          quoteId={quote.id}
                          orderId={quote.display_id || quote.id}
                          recipientId={quote.user_id}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Method Info */}
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="font-medium mb-2">Payment Method</h4>
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(quote.payment_method)}
                    <span className="capitalize">
                      {quote.payment_method?.replace(/_/g, ' ') || 'Not specified'}
                    </span>
                  </div>
                </div>
              </TabsContent>

              {/* Record Payment Tab */}
              <TabsContent value="record" className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Record New Payment</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment-method">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger id="payment-method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="payu">PayU (Manual)</SelectItem>
                            <SelectItem value="stripe">Stripe (Manual)</SelectItem>
                            <SelectItem value="esewa">eSewa</SelectItem>
                            <SelectItem value="credit_note">Credit Note</SelectItem>
                            <SelectItem value="check">Check/Cheque</SelectItem>
                            <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payment-date">Payment Date</Label>
                        <Input
                          id="payment-date"
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
                      <Input
                        id="transaction-id"
                        placeholder="Enter transaction reference"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="text"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value) || value === '') {
                              setPaymentAmount(value);
                            }
                          }}
                          className="pl-10"
                        />
                      </div>
                      {parseFloat(paymentAmount) > paymentSummary.remaining && paymentSummary.remaining > 0 && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            This payment exceeds the remaining balance. The order will be marked as overpaid.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any notes about this payment..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={handleRecordPayment}
                      disabled={isRecording || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="w-full"
                    >
                      {isRecording ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Record Payment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Verify Proofs Tab */}
              <TabsContent value="verify" className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Verify Payment Proofs</h3>
                  
                  {/* Gateway-specific info */}
                  {quote.payment_method && (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {quote.payment_method === 'bank_transfer' && 
                          "Review bank transfer receipts uploaded by the customer. Verify the transaction details match the order amount."
                        }
                        {quote.payment_method === 'upi' && 
                          "Verify UPI transaction screenshots. Check the transaction ID and amount."
                        }
                        {quote.payment_method === 'esewa' && 
                          "Verify eSewa payment confirmation. Cross-check with your eSewa merchant account."
                        }
                        {['payu', 'stripe'].includes(quote.payment_method) && 
                          "For online payments, verify the transaction in your payment gateway dashboard before recording manually."
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {proofsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : paymentProofs && paymentProofs.filter(p => !p.verified_at).length > 0 ? (
                    <div className="space-y-4">
                      {/* Unverified Proofs */}
                      <div className="space-y-3">
                        {paymentProofs.filter(p => !p.verified_at).map((proof) => (
                          <div 
                            key={proof.id}
                            className={cn(
                              "p-4 border rounded-lg cursor-pointer transition-colors",
                              verifyProofId === proof.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                            )}
                            onClick={() => {
                              setVerifyProofId(proof.id);
                              setVerifyAmount(quote.final_total?.toString() || '');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Receipt className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">
                                    {proof.file_name || `Proof ${proof.id.slice(0, 8)}`}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Uploaded {format(new Date(proof.created_at), 'MMM dd, yyyy HH:mm')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(proof.attachment_url, '_blank');
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {verifyProofId === proof.id && (
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Verification Form */}
                      {verifyProofId && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="verify-amount">Verified Amount ({currencySymbol})</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="verify-amount"
                                  type="text"
                                  placeholder="0.00"
                                  value={verifyAmount}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*\.?\d*$/.test(value) || value === '') {
                                      setVerifyAmount(value);
                                    }
                                  }}
                                  className="pl-10"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="verify-notes">Verification Notes (Optional)</Label>
                              <Textarea
                                id="verify-notes"
                                placeholder="Add any notes about this verification..."
                                value={verifyNotes}
                                onChange={(e) => setVerifyNotes(e.target.value)}
                                rows={2}
                              />
                            </div>

                            <Button 
                              onClick={handleVerifyProof}
                              disabled={isVerifying || !verifyAmount || parseFloat(verifyAmount) <= 0}
                              className="w-full"
                            >
                              {isVerifying ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Verify & Record Payment
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No unverified payment proofs</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Payment Timeline</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPaymentHistory()}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                  
                  {ledgerLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : !paymentLedger || paymentLedger.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No payment history found</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-border" />
                      
                      {/* Timeline Items */}
                      <div className="space-y-6">
                        {paymentLedger.map((entry, index) => {
                          const isPayment = entry.transaction_type === 'payment';
                          const isRefund = entry.transaction_type === 'refund';
                          const isFirst = index === 0;
                          const isLast = index === paymentLedger.length - 1;
                          
                          return (
                            <div key={entry.id} className="relative flex items-start gap-4">
                              {/* Timeline Dot */}
                              <div className={cn(
                                "relative z-10 flex h-10 w-10 items-center justify-center rounded-full",
                                isPayment ? "bg-green-100 text-green-600" :
                                isRefund ? "bg-red-100 text-red-600" :
                                "bg-gray-100 text-gray-600"
                              )}>
                                {isPayment ? <DollarSign className="h-5 w-5" /> :
                                 isRefund ? <RefreshCw className="h-5 w-5" /> :
                                 <FileText className="h-5 w-5" />}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 pb-6">
                                <div className="rounded-lg border bg-background p-4 shadow-sm">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-medium">
                                        {isPayment ? 'Payment Received' :
                                         isRefund ? 'Refund Processed' :
                                         'Transaction'}
                                      </h4>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {entry.payment_method?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        {entry.gateway_code && ` via ${entry.gateway_code.toUpperCase()}`}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className={cn(
                                        "font-semibold",
                                        isPayment ? "text-green-600" : 
                                        isRefund ? "text-red-600" :
                                        "text-gray-600"
                                      )}>
                                        {isPayment ? '+' : isRefund ? '-' : ''}{currencySymbol}{entry.amount?.toFixed(2)}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Balance: {currencySymbol}{entry.balance_after?.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Additional Details */}
                                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                    {entry.reference_number && (
                                      <div className="flex items-center gap-2">
                                        <Hash className="h-3 w-3" />
                                        <span>Ref: {entry.reference_number}</span>
                                      </div>
                                    )}
                                    {entry.notes && (
                                      <div className="flex items-start gap-2">
                                        <FileText className="h-3 w-3 mt-0.5" />
                                        <span className="line-clamp-2">{entry.notes}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3" />
                                      <span>{format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}</span>
                                    </div>
                                    {entry.created_by_profile && (
                                      <div className="flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        <span>by {entry.created_by_profile.full_name || entry.created_by_profile.email || 'System'}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Order Created Marker */}
                        <div className="relative flex items-start gap-4">
                          <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="rounded-lg border bg-background p-4 shadow-sm">
                              <h4 className="font-medium">Order Created</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Quote #{quote.display_id} - Total: {formatAmount(quote.final_total || 0)}
                              </p>
                              {quote.created_at && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {format(new Date(quote.created_at), 'MMM dd, yyyy HH:mm')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Summary Stats */}
                  {paymentLedger && paymentLedger.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Payments</p>
                          <p className="text-lg font-semibold text-green-600">
                            {currencySymbol}{paymentLedger
                              .filter(e => e.transaction_type === 'payment')
                              .reduce((sum, e) => sum + (e.amount || 0), 0)
                              .toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Refunds</p>
                          <p className="text-lg font-semibold text-red-600">
                            {currencySymbol}{paymentLedger
                              .filter(e => e.transaction_type === 'refund')
                              .reduce((sum, e) => sum + (e.amount || 0), 0)
                              .toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Transactions</p>
                          <p className="text-lg font-semibold">
                            {paymentLedger.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Refund Tab */}
              <TabsContent value="refund" className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
                  
                  {paymentSummary.totalPaid > 0 ? (
                    <div className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Total paid amount: {formatAmountForDisplay(paymentSummary.totalPaid, currency)}
                          {paymentSummary.isOverpaid && (
                            <span className="block mt-1 text-blue-600">
                              Overpaid by: {formatAmountForDisplay(paymentSummary.overpaidAmount, currency)}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        onClick={() => setShowRefundModal(true)}
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Open Refund Manager
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No payments to refund</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Child Modals */}
      {showRefundModal && paymentLedger && (
        <RefundManagementModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          quote={{
            id: quote.id,
            final_total: quote.final_total || 0,
            amount_paid: paymentSummary.totalPaid,
            currency: currency,
            payment_method: quote.payment_method || ''
          }}
          payments={paymentLedger.filter(p => p.transaction_type === 'payment')}
        />
      )}

    </>
  );
};