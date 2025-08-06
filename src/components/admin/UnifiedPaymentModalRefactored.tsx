import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp,
  Plus,
  CheckCircle,
  History,
  RefreshCw
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDueAmountInfo } from '@/lib/paymentUtils';
import type { DueAmountInfo } from '@/lib/paymentUtils';
import { CurrencyService } from '@/services/CurrencyService';
import { RefundManagementModal } from '../payment/RefundManagementModal';

// Import our refactored components
import { PaymentOverviewSection } from './unified-payment/PaymentOverviewSection';
import { PaymentRecordSection } from './unified-payment/PaymentRecordSection';
import { PaymentVerificationSection } from './unified-payment/PaymentVerificationSection';
import { PaymentHistorySection } from './unified-payment/PaymentHistorySection';
import { PaymentRefundSection } from './unified-payment/PaymentRefundSection';

interface Quote {
  id: string;
  display_id?: string;
  final_total_usd?: number;
  amount_paid?: number;
  currency?: string;
  payment_method?: string;
  shipping_address?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  customer_name?: string;
  customer_phone?: string;
  email?: string;
  user_id?: string;
  destination_country?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface PaymentSummary {
  totalPaid: number;
  totalRefunds: number;
  remaining: number;
  currencyBreakdown: Record<string, number>;
  hasMultipleCurrencies: boolean;
  recentPayments: number;
  paymentCount: number;
  status: 'paid' | 'partial' | 'unpaid';
  finalTotal: number;
  totalPayments: number;
  isOverpaid: boolean;
  overpaidAmount: number;
  percentagePaid: number;
}

interface UnifiedPaymentModalRefactoredProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
}

type TabValue = 'overview' | 'record' | 'verify' | 'history' | 'refund';

const currencyService = CurrencyService.getInstance();

export const UnifiedPaymentModalRefactored: React.FC<UnifiedPaymentModalRefactoredProps> = ({
  isOpen,
  onClose,
  quote,
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isDueProcessing, setIsDueProcessing] = useState(false);
  
  const queryClient = useQueryClient();

  // Get currency and formatting
  const currency = quote.currency || 'USD';
  const currencySymbol = currencyService.getCurrencySymbol(currency);
  const formatAmount = useCallback((amount: number) => currencyService.formatAmount(amount, currency), [currency]);

  // Fetch payment ledger
  const { data: paymentLedger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['payment-ledger', quote.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          created_by_profile:profiles!payment_transactions_created_by_fkey(
            full_name,
            email
          )
        `)
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch payment proofs for verification
  const { data: paymentProofs } = useQuery({
    queryKey: ['payment-proofs', quote.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            full_name,
            email
          )
        `)
        .eq('quote_id', quote.id)
        .eq('message_type', 'payment_proof')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch payment links
  const { data: paymentLinks, isLoading: linksLoading } = useQuery({
    queryKey: ['payment-links', quote.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Calculate payment summary
  const paymentSummary = useMemo((): PaymentSummary => {
    const finalTotal = parseFloat(quote.final_total_usd?.toString() || '0');
    
    if (!paymentLedger || paymentLedger.length === 0) {
      return {
        totalPaid: 0,
        totalRefunds: 0,
        remaining: finalTotal,
        currencyBreakdown: {},
        hasMultipleCurrencies: false,
        recentPayments: 0,
        paymentCount: 0,
        status: 'unpaid',
        finalTotal,
        totalPayments: 0,
        isOverpaid: false,
        overpaidAmount: 0,
        percentagePaid: 0,
      };
    }

    let totalPayments = 0;
    let totalRefunds = 0;
    const currencyBreakdown: Record<string, number> = {};
    let paymentCount = 0;

    paymentLedger.forEach((entry) => {
      const amount = parseFloat(entry.amount?.toString() || '0');
      const entryCurrency = entry.currency || currency;
      const type = entry.transaction_type || entry.payment_type;
      
      if (!currencyBreakdown[entryCurrency]) {
        currencyBreakdown[entryCurrency] = 0;
      }

      if (type === 'refund' || type === 'partial_refund') {
        totalRefunds += Math.abs(amount);
        currencyBreakdown[entryCurrency] -= Math.abs(amount);
      } else if (entry.status === 'completed' || type === 'payment' || type === 'customer_payment') {
        totalPayments += amount;
        currencyBreakdown[entryCurrency] += amount;
        paymentCount++;
      }
    });

    const totalPaid = totalPayments - totalRefunds;
    const remaining = Math.max(0, finalTotal - totalPaid);
    const hasMultipleCurrencies = Object.keys(currencyBreakdown).length > 1;
    const isOverpaid = totalPaid > finalTotal;
    const overpaidAmount = Math.max(0, totalPaid - finalTotal);
    const percentagePaid = finalTotal > 0 ? (totalPaid / finalTotal) * 100 : 0;
    
    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (totalPaid >= finalTotal) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    return {
      totalPaid,
      totalRefunds,
      remaining,
      currencyBreakdown,
      hasMultipleCurrencies,
      recentPayments: paymentCount,
      paymentCount,
      status,
      finalTotal,
      totalPayments,
      isOverpaid,
      overpaidAmount,
      percentagePaid,
    };
  }, [paymentLedger, quote.final_total_usd, currency]);

  // Get due amount information
  const dueAmountInfo: DueAmountInfo | null = useMemo(() => {
    return getDueAmountInfo(quote, paymentSummary.remaining);
  }, [quote, paymentSummary.remaining]);

  // Handle due amount changes
  const handleDueAmountChange = async (newAmount: number): Promise<void> => {
    setIsDueProcessing(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ final_total_usd: newAmount })
        .eq('id', quote.id);

      if (error) throw error;

      // Refresh payment data
      await queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
    } finally {
      setIsDueProcessing(false);
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
    if (quote.payment_method === 'bank_transfer' && paymentProofs?.some((p) => !p.verified_at)) {
      tabs.splice(tabs.indexOf('record') + 1, 0, 'verify');
    }

    // Show refund tab for paid or overpaid
    if (paymentSummary.totalPaid > 0) {
      tabs.push('refund');
    }

    return tabs;
  }, [paymentSummary, quote.payment_method, paymentProofs]);

  // Refresh payment data
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
    queryClient.invalidateQueries({ queryKey: ['payment-proofs', quote.id] });
    queryClient.invalidateQueries({ queryKey: ['payment-links', quote.id] });
  }, [queryClient, quote.id]);

  // Handle payment recorded
  const handlePaymentRecorded = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Handle proof verification
  const handleProofVerified = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleProofRejected = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Export payment history
  const handleExportHistory = useCallback(() => {
    if (!paymentLedger || paymentLedger.length === 0) {
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
        'Recorded By',
      ];

      // Prepare CSV rows
      const rows = paymentLedger.map((entry) => [
        new Date(entry.created_at || entry.payment_date).toISOString(),
        entry.transaction_type || entry.payment_type || 'payment',
        entry.payment_method || '-',
        entry.gateway_code || '-',
        entry.amount?.toString() || '0.00',
        entry.currency || currency,
        entry.balance_after?.toString() || '0.00',
        entry.reference_number || entry.gateway_transaction_id || '-',
        entry.notes?.replace(/,/g, ';') || '-',
        entry.created_by_profile?.full_name || entry.created_by_profile?.email || 'System',
      ]);

      // Create CSV content
      const csvContent = [
        `Payment History for Order ${quote.display_id}`,
        `Generated on ${new Date().toISOString()}`,
        `Total Amount: ${currency} ${quote.final_total_usd?.toString()}`,
        '',
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payment_history_${quote.display_id}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [paymentLedger, quote, currency]);

  // Handle refund modal actions
  const handleOpenRefundModal = useCallback(() => {
    setShowRefundModal(true);
  }, []);

  const handleCloseRefundModal = useCallback(() => {
    setShowRefundModal(false);
    handleRefresh(); // Refresh data when refund modal closes
  }, [handleRefresh]);

  // Prepare refund modal data
  const refundModalPayments = useMemo(() => {
    if (!paymentLedger) return [];

    return paymentLedger
      .filter((p) => {
        const type = p.transaction_type || p.payment_type;
        const isPayment =
          type === 'payment' ||
          type === 'customer_payment' ||
          type === 'manual_payment' ||
          (p.status === 'completed' && (p.amount || 0) > 0);
        return isPayment;
      })
      .map((p) => {
        const isPayU =
          p.gateway_code === 'payu' ||
          p.payment_method === 'payu' ||
          p.payment_method?.toLowerCase() === 'payu';

        const isPayPal =
          p.gateway_code === 'paypal' ||
          p.payment_method === 'paypal' ||
          p.payment_method?.toLowerCase() === 'paypal';

        return {
          id: p.id,
          amount: Math.abs(p.amount || 0),
          currency: p.currency || currency,
          method: p.payment_method || '',
          gateway: p.gateway_code || p.payment_method || '',
          reference:
            p.gateway_transaction_id ||
            p.reference_number ||
            p.transaction_id ||
            '',
          date: new Date(p.payment_date || p.created_at),
          canRefund: isPayU || isPayPal || p.payment_method === 'bank_transfer',
        };
      });
  }, [paymentLedger, currency]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Payment Management (Refactored) - {quote.display_id}</DialogTitle>
            <DialogDescription>
              Manage all payment activities for this order in one place
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="w-full"
          >
            <TabsList
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)`,
              }}
            >
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
                <PaymentOverviewSection
                  quote={quote}
                  paymentSummary={paymentSummary}
                  currency={currency}
                  currencySymbol={currencySymbol}
                  formatAmount={formatAmount}
                  dueAmountInfo={dueAmountInfo}
                  onDueAmountChange={handleDueAmountChange}
                  isDueProcessing={isDueProcessing}
                />
              </TabsContent>

              {/* Record Tab */}
              <TabsContent value="record" className="space-y-4">
                <PaymentRecordSection
                  quoteId={quote.id}
                  currency={currency}
                  currencySymbol={currencySymbol}
                  remainingAmount={paymentSummary.remaining}
                  formatAmount={formatAmount}
                  onPaymentRecorded={handlePaymentRecorded}
                />
              </TabsContent>

              {/* Verification Tab */}
              <TabsContent value="verify" className="space-y-4">
                <PaymentVerificationSection
                  paymentProofs={paymentProofs || []}
                  currency={currency}
                  currencySymbol={currencySymbol}
                  orderTotal={paymentSummary.finalTotal}
                  currentPaidAmount={paymentSummary.totalPaid}
                  onProofVerified={handleProofVerified}
                  onProofRejected={handleProofRejected}
                />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <PaymentHistorySection
                  paymentLedger={paymentLedger}
                  paymentLinks={paymentLinks}
                  quote={quote}
                  currency={currency}
                  currencySymbol={currencySymbol}
                  paymentSummary={paymentSummary}
                  formatAmount={formatAmount}
                  ledgerLoading={ledgerLoading}
                  linksLoading={linksLoading}
                  onRefresh={handleRefresh}
                  onExportHistory={handleExportHistory}
                  isDueProcessing={isDueProcessing}
                />
              </TabsContent>

              {/* Refund Tab */}
              <TabsContent value="refund" className="space-y-4">
                <PaymentRefundSection
                  quote={quote}
                  paymentSummary={paymentSummary}
                  paymentLedger={paymentLedger}
                  currency={currency}
                  onOpenRefundModal={handleOpenRefundModal}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      {showRefundModal && (
        <RefundManagementModal
          isOpen={showRefundModal}
          onClose={handleCloseRefundModal}
          quote={{
            id: quote.id,
            final_total_usd: quote.final_total_usd || 0,
            amount_paid: paymentSummary.totalPaid,
            currency: currency,
            payment_method: quote.payment_method || '',
          }}
          payments={refundModalPayments}
        />
      )}
    </>
  );
};