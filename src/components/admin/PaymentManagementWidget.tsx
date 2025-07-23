import React, { useState, useMemo } from 'react';
import { getCustomerDisplayData } from '@/lib/customerDisplayUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Receipt,
  Banknote,
  Smartphone,
  ExternalLink,
  FileText,
  User,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UnifiedPaymentModal } from './UnifiedPaymentModal';
import { currencyService } from '@/services/CurrencyService';

interface PaymentManagementWidgetProps {
  quote: Tables<'quotes'>;
}

export const PaymentManagementWidget: React.FC<PaymentManagementWidgetProps> = ({ quote }) => {
  const { toast: _toast } = useToast();
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showUnifiedPaymentModal, setShowUnifiedPaymentModal] = useState(false);

  // Fetch payment transaction details
  const { data: paymentTransaction } = useQuery({
    queryKey: ['payment-transaction', quote.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!quote.payment_transaction_id || quote.payment_status === 'paid',
  });

  // Fetch payment proofs for bank transfers
  const { data: paymentProofs } = useQuery({
    queryKey: ['payment-proofs', quote.id],
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_id', quote.id)
        .eq('message_type', 'payment_proof')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return messages;
    },
    enabled: quote.payment_method === 'bank_transfer',
  });

  // Fetch payment ledger data for calculating totals
  const { data: paymentLedger } = useQuery({
    queryKey: ['payment-ledger-widget', quote.id],
    queryFn: async () => {
      // Fetch from payment_ledger
      const { data: ledgerData } = await supabase
        .from('payment_ledger')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });

      // Fetch from payment_transactions
      const { data: transactionData } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quote.id)
        .in('status', ['completed', 'success'])
        .order('created_at', { ascending: false });

      // Combine both sources
      const combinedData = [];

      if (transactionData && transactionData.length > 0) {
        transactionData.forEach((tx) => {
          const existsInLedger = ledgerData?.some(
            (l) =>
              l.reference_number === tx.transaction_id ||
              (l.payment_type === 'customer_payment' && Math.abs(l.amount - tx.amount) < 0.01),
          );

          if (!existsInLedger) {
            combinedData.push({
              payment_type: 'customer_payment',
              amount: tx.amount,
              status: tx.status,
            });
          }
        });
      }

      if (ledgerData && ledgerData.length > 0) {
        combinedData.push(...ledgerData);
      }

      return combinedData;
    },
    enabled: !!quote.id,
  });

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'bank_transfer':
        return <Banknote className="h-4 w-4" />;
      case 'payu':
        return <Smartphone className="h-4 w-4" />;
      case 'stripe':
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  // Extract payment details from different sources (moved before useMemo)
  const paymentDetails = (quote.payment_details as Record<string, unknown>) || {};
  const transactionData = (paymentTransaction?.gateway_response as Record<string, unknown>) || {};
  const paymentCurrency = paymentTransaction?.currency || quote.destination_currency || 'USD';
  const quoteCurrency = quote.destination_currency || 'USD';
  const hasCurrencyMismatch = paymentCurrency !== quoteCurrency;

  // Calculate payment summary with currency breakdown
  const paymentSummary = useMemo(() => {
    let totalPayments = 0;
    let totalRefunds = 0;
    const currencyBreakdown: Record<string, { payments: number; refunds: number }> = {};

    paymentLedger?.forEach((entry) => {
      const type = entry.payment_type;
      const amount = parseFloat(entry.amount) || 0;
      const entryCurrency = entry.currency || paymentCurrency;

      // Initialize currency in breakdown if not present
      if (!currencyBreakdown[entryCurrency]) {
        currencyBreakdown[entryCurrency] = { payments: 0, refunds: 0 };
      }

      if (
        type === 'payment' ||
        type === 'customer_payment' ||
        (entry.status === 'completed' && amount > 0)
      ) {
        const absAmount = Math.abs(amount);
        totalPayments += absAmount;
        currencyBreakdown[entryCurrency].payments += absAmount;
      } else if (
        type === 'refund' ||
        type === 'partial_refund' ||
        type === 'credit_note' ||
        amount < 0
      ) {
        const absAmount = Math.abs(amount);
        totalRefunds += absAmount;
        currencyBreakdown[entryCurrency].refunds += absAmount;
      }
    });

    const totalPaid = totalPayments - totalRefunds;
    const finalTotal = parseFloat(quote.final_total_usd) || 0;
    const remaining = finalTotal - totalPaid;

    // Determine payment status with refund states
    let status = 'unpaid';
    if (totalPayments === 0) {
      status = 'unpaid';
    } else if (totalRefunds >= totalPayments) {
      status = 'fully_refunded';
    } else if (totalRefunds > 0 && totalPaid >= finalTotal) {
      status = 'partially_refunded';
    } else if (totalPaid >= finalTotal) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    const isOverpaid = totalPaid > finalTotal;
    const hasRefunds = totalRefunds > 0;
    const hasMultipleCurrencies = Object.keys(currencyBreakdown).length > 1;

    return {
      finalTotal,
      totalPaid,
      totalPayments,
      totalRefunds,
      remaining: Math.max(0, remaining),
      overpaidAmount: isOverpaid ? totalPaid - finalTotal : 0,
      status,
      isOverpaid,
      hasRefunds,
      hasMultipleCurrencies,
      currencyBreakdown,
    };
  }, [paymentLedger, quote.final_total_usd, paymentCurrency]);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'unpaid':
        return 'destructive';
      case 'overpaid':
        return 'secondary';
      case 'partially_refunded':
        return 'secondary';
      case 'fully_refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleViewProof = (proofUrl: string) => {
    window.open(proofUrl, '_blank');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Information
            </span>
            {paymentSummary && (
              <Badge variant={getPaymentStatusColor(paymentSummary.status)}>
                {paymentSummary.status === 'paid'
                  ? 'Fully Paid'
                  : paymentSummary.status === 'partial'
                    ? 'Partially Paid'
                    : paymentSummary.status === 'partially_refunded'
                      ? `Partially Refunded (${paymentCurrency} ${paymentSummary.totalRefunds.toFixed(2)})`
                      : paymentSummary.status === 'fully_refunded'
                        ? 'Fully Refunded'
                        : 'Unpaid'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Summary - Professional Display */}
          <div className="space-y-3">
            {/* Order Total */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Total</span>
              <span className="font-semibold">
                {currencyService.formatAmount(paymentSummary.finalTotal, paymentCurrency)}
              </span>
            </div>

            {/* Total Payments */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Payments</span>
              <span
                className={cn(
                  'font-semibold',
                  paymentSummary.totalPayments > 0 ? 'text-green-600' : 'text-gray-500',
                )}
              >
                {currencyService.formatAmount(paymentSummary.totalPayments, paymentCurrency)}
              </span>
            </div>

            {/* Total Refunds (only show if > 0) */}
            {paymentSummary.totalRefunds > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Refunds</span>
                <span className="font-semibold text-red-600">
                  -{currencyService.formatAmount(paymentSummary.totalRefunds, paymentCurrency)}
                </span>
              </div>
            )}

            {/* Separator for totals */}
            {(paymentSummary.totalPayments > 0 || paymentSummary.totalRefunds > 0) && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net Paid</span>
                  <span className="font-bold">
                    {currencyService.formatAmount(paymentSummary.totalPaid, paymentCurrency)}
                  </span>
                </div>
              </div>
            )}

            {/* Balance Due (only show if customer underpaid, not after refunds) */}
            {paymentSummary.remaining > 0 &&
              paymentSummary.totalPayments < paymentSummary.finalTotal && (
                <div className="flex items-center justify-between bg-orange-50 p-2 rounded">
                  <span className="text-sm font-medium text-orange-800">Balance Due</span>
                  <span className="font-bold text-orange-600">
                    {currencyService.formatAmount(paymentSummary.remaining, paymentCurrency)}
                  </span>
                </div>
              )}

            {/* Overpayment (only show if overpaid) */}
            {paymentSummary.isOverpaid && (
              <div className="flex items-center justify-between bg-teal-50 p-2 rounded">
                <span className="text-sm font-medium text-teal-800">Overpayment</span>
                <span className="font-bold text-teal-600">
                  {currencyService.formatAmount(paymentSummary.overpaidAmount, paymentCurrency)}
                </span>
              </div>
            )}

            {/* Multi-Currency Alert */}
            {paymentSummary.hasMultipleCurrencies && (
              <div className="bg-teal-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-teal-800 mb-2">
                  Multi-Currency Payments Detected
                </p>
                <div className="space-y-1 text-sm">
                  {Object.entries(paymentSummary.currencyBreakdown).map(([curr, amounts]) => {
                    const netAmount = amounts.payments - amounts.refunds;
                    if (netAmount === 0) return null;
                    return (
                      <div key={curr} className="flex justify-between">
                        <span className="text-teal-700">{curr}:</span>
                        <span
                          className={cn(
                            'font-medium',
                            netAmount > 0 ? 'text-green-700' : 'text-red-700',
                          )}
                        >
                          {currencyService.formatAmount(Math.abs(netAmount), curr)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-teal-600 mt-2">
                  💡 Refunds must be processed in original payment currencies
                </p>
              </div>
            )}

            <Separator />

            {/* Payment Method Details */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <div className="flex items-center gap-2">
                {getPaymentMethodIcon(quote.payment_method || '')}
                <span className="font-medium">
                  {quote.payment_method
                    ?.replace(/_/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Not specified'}
                </span>
              </div>
            </div>

            {/* Currency Information */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Currency</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{paymentCurrency}</span>
                {hasCurrencyMismatch && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                  >
                    Quote: {quoteCurrency}
                  </Badge>
                )}
              </div>
            </div>

            {/* Currency Mismatch Warning */}
            {hasCurrencyMismatch && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-700">
                  <p className="font-medium">Currency Mismatch Warning</p>
                  <p>
                    Payment was made in {paymentCurrency} but quote was calculated in{' '}
                    {quoteCurrency}. Refunds must be processed in the original payment currency (
                    {paymentCurrency}).
                  </p>
                </div>
              </div>
            )}

            {/* Payment Date - Show for all completed payments */}
            {quote.paid_at && quote.payment_status === 'paid' && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Date</span>
                <span className="text-sm">
                  {format(new Date(quote.paid_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}

            {/* Transaction Details for Online Payments */}
            {(paymentTransaction || quote.payment_transaction_id) && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transaction ID</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 font-mono text-xs"
                    onClick={() => setShowTransactionDetails(true)}
                  >
                    {quote.payment_transaction_id || paymentTransaction?.id || 'View Details'}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </>
            )}

            {/* Bank Transfer Proof Status */}
            {quote.payment_method === 'bank_transfer' &&
              paymentProofs &&
              paymentProofs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Payment Proofs</span>
                    <Badge variant="outline">{paymentProofs.length} submitted</Badge>
                  </div>
                  {/* Info message about bank transfer payments */}
                  {quote.payment_status !== 'paid' && (
                    <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg border border-teal-200">
                      <AlertCircle className="h-4 w-4 text-teal-600 mt-0.5" />
                      <p className="text-xs text-teal-700">
                        Bank transfer payments are verified through the payment proof system. Click
                        "Verify Payment Proofs" below to review and confirm payments.
                      </p>
                    </div>
                  )}
                  {paymentProofs.slice(0, 3).map((proof, index) => (
                    <div key={proof.id} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {proof.attachment_file_name || `Proof ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {proof.verification_status && (
                            <Badge
                              variant={
                                proof.verification_status === 'verified'
                                  ? 'success'
                                  : proof.verification_status === 'rejected'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className="text-xs"
                            >
                              {proof.verification_status}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewProof(proof.attachment_url)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {proof.verified_at && (
                        <div className="text-xs text-muted-foreground">
                          Verified on {format(new Date(proof.verified_at), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowUnifiedPaymentModal(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Payments
            </Button>

            {(paymentTransaction || quote.payment_transaction_id) && (
              <Button variant="outline" size="sm" onClick={() => setShowTransactionDetails(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Transaction Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Transaction Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-sm">
                  {quote.payment_transaction_id || paymentTransaction?.id}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gateway</p>
                <p className="font-medium">{quote.payment_method?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">
                  {currencyService.formatAmount(paymentSummary.totalPaid, paymentCurrency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={paymentTransaction?.status === 'completed' ? 'success' : 'secondary'}
                >
                  {paymentTransaction?.status || 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* Customer Information */}
            {(() => {
              const customerData = getCustomerDisplayData(quote);
              return customerData.name !== 'Unknown Customer' && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                    {customerData.isGuest && (
                      <Badge variant="secondary" className="text-xs">Guest</Badge>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-sm">{customerData.name}</p>
                    </div>
                    {customerData.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{customerData.email}</p>
                      </div>
                    )}
                    {customerData.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-sm">{customerData.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
                </div>
              </div>
            )}

            {/* Gateway Specific Details */}
            {quote.payment_method === 'payu' && paymentDetails.payu_id && (
              <div className="space-y-2">
                <h4 className="font-medium">PayU Details</h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">PayU ID</p>
                    <p className="font-mono text-sm">{paymentDetails.payu_id}</p>
                  </div>
                  {paymentDetails.payment_mode && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Mode</p>
                      <p className="text-sm">{paymentDetails.payment_mode}</p>
                    </div>
                  )}
                  {paymentDetails.bank_ref_num && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Reference</p>
                      <p className="font-mono text-sm">{paymentDetails.bank_ref_num}</p>
                    </div>
                  )}
                  {paymentDetails.card_mask && (
                    <div>
                      <p className="text-sm text-muted-foreground">Card</p>
                      <p className="text-sm">**** {paymentDetails.card_mask}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw Transaction Data (for debugging) */}
            {import.meta.env.DEV && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Raw Transaction Data (Dev Only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify({ paymentDetails, paymentTransaction }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Payment Management Modal */}
      <UnifiedPaymentModal
        isOpen={showUnifiedPaymentModal}
        onClose={() => setShowUnifiedPaymentModal(false)}
        quote={quote}
      />
    </>
  );
};
