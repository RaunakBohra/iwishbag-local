import React, { useState, useEffect, useMemo } from 'react';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  Plus,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  Receipt,
  History,
  TrendingUp,
  RefreshCw,
  Eye,
  X,
  Calendar,
  User,
  FileText,
  Loader2,
  Download,
  Smartphone,
  Hash,
  Info,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { getCurrencySymbol, getDestinationCountryFromQuote } from '@/lib/currencyUtils';
import { currencyService } from '@/services/CurrencyService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RefundManagementModal } from './RefundManagementModal';
import { PaymentProofButton } from '../payment/PaymentProofButton';
import { EnhancedPaymentLinkGenerator } from '../payment/EnhancedPaymentLinkGenerator';
import { DueAmountNotification } from '../payment/DueAmountNotification';
import { useDueAmountManager } from '@/hooks/useDueAmountManager';
import { usePaymentStatusSync } from '@/hooks/usePaymentStatusSync';
import { DueAmountInfo } from '@/lib/paymentUtils';

// Quote interface for payment modal
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
  [key: string]: unknown; // For other properties
}

// Payment ledger entry interface
interface PaymentLedgerEntry {
  id: string;
  quote_id: string;
  payment_type?: string;
  transaction_type?: string;
  payment_method?: string;
  amount: number;
  currency?: string;
  status?: string;
  reference_number?: string;
  gateway_transaction_id?: string;
  transaction_id?: string;
  gateway_code?: string;
  payment_date?: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  balance_after?: number;
  created_by?: string | null;
  created_by_profile?: {
    full_name?: string;
    email?: string;
  };
  gateway_response?: Record<string, unknown>;
}

// Payment proof interface
interface PaymentProof {
  id: string;
  quote_id: string;
  file_name: string;
  attachment_url: string;
  created_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  verified_amount?: number | null;
  verification_notes?: string | null;
  verification_status?: string | null;
  sender_id?: string;
}

// Payment link interface
interface PaymentLink {
  id: string;
  quote_id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  api_version?: string;
  created_at: string;
  expires_at?: string;
  payment_url?: string;
}

// Payment method type
type PaymentMethodType =
  | 'bank_transfer'
  | 'cash'
  | 'upi'
  | 'payu'
  | 'stripe'
  | 'esewa'
  | 'credit_note'
  | 'check'
  | 'wire_transfer'
  | 'other';

interface UnifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
}

type TabValue = 'overview' | 'record' | 'verify' | 'history' | 'refund';

export const UnifiedPaymentModal: React.FC<UnifiedPaymentModalProps> = ({
  isOpen,
  onClose,
  quote,
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const { formatAmount } = useQuoteCurrency(quote);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get currency information
  const destinationCountry = quote ? getDestinationCountryFromQuote(quote) : 'US';
  const currency = currencyService.getCurrencyForCountrySync(destinationCountry);
  const currencySymbol = getCurrencySymbol(currency);

  // Fetch payment data
  const { data: paymentLedger, isLoading: ledgerLoading } = useQuery<PaymentLedgerEntry[]>({
    queryKey: ['payment-ledger', quote.id],
    queryFn: async () => {
      console.log('Fetching payment data for quote:', quote.id);

      // Fetch from consolidated payment_transactions table
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });

      if (ledgerError) {
        logger.error('Error fetching payment ledger:', ledgerError);
        // Table might not exist or have different structure
      }

      // Also fetch from payment_transactions as additional source
      const { data: transactionData, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quote.id)
        .in('status', ['completed', 'success']) // Only fetch successful payments
        .order('created_at', { ascending: false });

      if (transactionError) {
        logger.error('Error fetching payment transactions:', transactionError);
      }

      console.log('Payment ledger data:', ledgerData);
      console.log('Payment transaction data:', transactionData);

      // Combine both sources to get complete payment history
      const combinedData = [];

      // Add payment transactions (original payments)
      if (transactionData && transactionData.length > 0) {
        transactionData.forEach((tx) => {
          // Check if this payment is already in ledger
          const existsInLedger = ledgerData?.some(
            (l) =>
              l.reference_number === tx.transaction_id ||
              (l.payment_type === 'customer_payment' && Math.abs(l.amount - tx.amount) < 0.01),
          );

          if (!existsInLedger) {
            combinedData.push({
              id: tx.id,
              quote_id: tx.quote_id,
              payment_type: 'customer_payment',
              transaction_type: 'customer_payment',
              amount: tx.amount,
              currency: tx.currency || 'USD',
              payment_method: tx.payment_method || 'unknown',
              reference_number: tx.transaction_id,
              gateway_transaction_id: tx.transaction_id,
              status: tx.status,
              created_at: tx.created_at,
              payment_date: tx.created_at,
              updated_at: tx.updated_at,
              notes: tx.gateway_response?.notes || '',
              balance_after: 0,
              gateway_code: tx.payment_method,
              created_by: null,
              gateway_response: tx.gateway_response,
            });
          }
        });
      }

      // Add all ledger entries (including refunds)
      if (ledgerData && ledgerData.length > 0) {
        combinedData.push(...ledgerData);
      }

      // Sort by date (oldest first)
      combinedData.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      console.log('Combined payment data:', combinedData);
      return combinedData;
    },
    enabled: isOpen && !!quote.id,
  });

  const { data: paymentProofs, isLoading: proofsLoading } = useQuery<PaymentProof[]>({
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
      return (
        messages?.map((msg) => ({
          id: msg.id,
          quote_id: msg.quote_id,
          file_name: msg.attachment_file_name || 'Payment Proof',
          attachment_url: msg.attachment_url || '',
          created_at: msg.created_at,
          verified_at: msg.verified_at,
          verified_by: msg.verified_by,
          verified_amount: msg.verified_amount,
          verification_notes: msg.admin_notes,
          verification_status: msg.verification_status,
        })) || []
      );
    },
    enabled: isOpen && !!quote.id && quote.payment_method === 'bank_transfer',
  });

  // Fetch payment links for this quote
  const { data: paymentLinks, isLoading: linksLoading } = useQuery<PaymentLink[]>({
    queryKey: ['payment-links', quote.id],
    queryFn: async () => {
      logger.debug(quote.id);

      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Error fetching payment links:', error);
        return [];
      }

      logger.info(data?.length || 0, 'links found');
      console.log('📋 Payment links data:', data);

      return data || [];
    },
    enabled: isOpen && !!quote.id,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Calculate payment summary with currency breakdown
  const paymentSummary = useMemo(() => {
    let totalPayments = 0;
    let totalRefunds = 0;
    const currencyBreakdown: Record<string, { payments: number; refunds: number }> = {};

    paymentLedger?.forEach((entry) => {
      const type = entry.transaction_type || entry.payment_type;
      const amount = parseFloat(entry.amount) || 0;
      const entryCurrency = entry.currency || currency;

      // Initialize currency in breakdown if not present
      if (!currencyBreakdown[entryCurrency]) {
        currencyBreakdown[entryCurrency] = { payments: 0, refunds: 0 };
      }

      // Handle different payment types
      if (
        type === 'payment' ||
        type === 'customer_payment' ||
        (entry.status === 'completed' && !type && amount > 0)
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
      percentagePaid: finalTotal > 0 ? (totalPaid / finalTotal) * 100 : 0,
    };
  }, [paymentLedger, quote.final_total_usd, currency]);

  // Payment recording state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bank_transfer');
  const [paymentCurrency, setPaymentCurrency] = useState<string>(currency); // Currency for this specific payment
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Reset payment form when modal opens
  useEffect(() => {
    if (isOpen && paymentSummary.remaining > 0) {
      setPaymentAmount(paymentSummary.remaining.toFixed(2));
    }
    if (isOpen) {
      // Reset payment currency to quote's expected currency
      setPaymentCurrency(currency);
    }
  }, [isOpen, paymentSummary.remaining, currency]);

  // Payment verification state
  const [verifyProofId, setVerifyProofId] = useState<string | null>(null);
  const [verifyAmount, setVerifyAmount] = useState<string>('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [previewImageLoading, setPreviewImageLoading] = useState(false);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [_showPreviewModal, _setShowPreviewModal] = useState(false);
  const [dueAmountInfo, setDueAmountInfo] = useState<DueAmountInfo | null>(null);

  // Due amount management
  const { handleOrderValueChange, isProcessing: isDueProcessing } = useDueAmountManager({
    quoteId: quote.id,
    currency,
    autoGenerateLinks: false, // Manual generation for admin
    onDueAmountDetected: (dueInfo) => {
      setDueAmountInfo(dueInfo);
    },
    onPaymentLinkCreated: (_link) => {
      toast({
        title: 'Payment Link Created',
        description: 'Payment link has been generated and sent to customer.',
      });
    },
  });

  // Real-time payment status synchronization
  const { isMonitoring, checkPaymentStatus } = usePaymentStatusSync({
    quoteId: quote.id,
    enabled: isOpen,
    onPaymentConfirmed: (_transaction) => {
      toast({
        title: 'Payment Confirmed',
        description: `Payment confirmed for ${currencyService.formatAmount(_transaction.amount, currency)}`,
      });
      // Switch to history tab to show the updated payment
      setActiveTab('history');
    },
    onPaymentFailed: (_transaction) => {
      toast({
        title: 'Payment Failed',
        description: 'Payment attempt failed. Customer may need to try again.',
        variant: 'destructive',
      });
    },
  });

  // Monitor quote changes for due amount detection
  useEffect(() => {
    if (quote?.final_total_usd) {
      handleOrderValueChange(parseFloat(quote.final_total_usd), quote);
    }
  }, [quote?.final_total_usd, handleOrderValueChange]);

  // Utility functions for verification
  const isImage = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'payment-proof';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate payment balance for verification
  const calculatePaymentBalance = () => {
    const currentPaid = paymentSummary?.totalPaid || 0;
    const orderTotal = paymentSummary?.finalTotal || 0;
    const newAmount = parseFloat(verifyAmount) || 0;
    const newTotal = currentPaid + newAmount;

    let newStatus = 'unpaid';
    if (newTotal >= orderTotal) {
      newStatus = newTotal > orderTotal ? 'overpaid' : 'paid';
    } else if (newTotal > 0) {
      newStatus = 'partial';
    }

    return {
      currentPaid: currentPaid || 0,
      orderTotal: orderTotal || 0,
      newAmount: newAmount || 0,
      newTotal: newTotal || 0,
      newStatus,
      overpayment: newTotal > orderTotal ? newTotal - orderTotal : 0,
    };
  };

  // Handle payment recording
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsRecording(true);

    try {
      const { data: _data, error } = await supabase.rpc('record_payment_with_ledger_and_triggers', {
        p_quote_id: quote.id,
        p_amount: amount,
        p_currency: paymentCurrency, // Use selected payment currency
        p_payment_method: paymentMethod,
        p_transaction_reference: transactionId || `MANUAL-${Date.now()}`,
        p_notes: paymentNotes,
        p_recorded_by: (await supabase.auth.getUser()).data.user?.id || null,
        p_payment_date: paymentDate,
      });

      if (error) throw error;

      toast({
        title: 'Payment Recorded',
        description: `Successfully recorded ${currencyService.formatAmount(amount, paymentCurrency)} payment.`,
      });

      // Reset form
      setPaymentAmount('');
      setPaymentCurrency(currency); // Reset to quote currency
      setTransactionId('');
      setPaymentNotes('');

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });

      // Switch to history tab
      setActiveTab('history');
    } catch (error) {
      logger.error('Error recording payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to record payment';
      toast({
        title: 'Error',
        description: errorMessage + '.',
        variant: 'destructive',
      });
    } finally {
      setIsRecording(false);
    }
  };

  // Handle payment proof verification
  const handleVerifyProof = async () => {
    if (!verifyProofId || !verifyAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please select a proof and enter the amount.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(verifyAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Record the payment using quote currency (payment proofs should match quote currency)
      const { error: paymentError } = await supabase.rpc(
        'record_payment_with_ledger_and_triggers',
        {
          p_quote_id: quote.id,
          p_amount: amount,
          p_currency: currency, // Use quote currency for payment proofs
          p_payment_method: 'bank_transfer',
          p_transaction_reference: `PROOF-${verifyProofId}`,
          p_notes: verifyNotes || 'Payment verified from uploaded proof',
          p_recorded_by: (await supabase.auth.getUser()).data.user?.id || null,
          p_payment_date: new Date().toISOString().split('T')[0],
        },
      );

      if (paymentError) throw paymentError;

      // Update proof status in messages table
      const { error: proofError } = await supabase
        .from('messages')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_amount: amount,
          verification_notes: verifyNotes,
          verification_status: 'verified',
        })
        .eq('id', verifyProofId);

      if (proofError) throw proofError;

      toast({
        title: 'Payment Verified',
        description: `Successfully verified payment of ${currencyService.formatAmount(amount, currency)}.`,
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
    } catch (error) {
      logger.error('Error verifying payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment';
      toast({
        title: 'Error',
        description: errorMessage + '.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle proof rejection
  const handleRejectProof = async () => {
    if (!verifyProofId || !rejectionReason) {
      toast({
        title: 'Missing Information',
        description: 'Please select a proof and provide a rejection reason.',
        variant: 'destructive',
      });
      return;
    }

    setIsRejecting(true);

    try {
      // Update proof status to rejected
      const { error: proofError } = await supabase
        .from('messages')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verification_status: 'rejected',
          admin_notes: rejectionReason,
        })
        .eq('id', verifyProofId);

      if (proofError) throw proofError;

      // Send rejection notification to customer
      const { data: user } = await supabase.auth.getUser();
      const proofMessage = paymentProofs?.find((p) => p.id === verifyProofId);

      if (proofMessage && user.user) {
        await supabase.from('messages').insert({
          sender_id: user.user.id,
          recipient_id: proofMessage.sender_id,
          quote_id: quote.id,
          subject: 'Payment Proof Rejected',
          content: `Your payment proof has been rejected. Reason: ${rejectionReason}\n\nPlease submit a new payment proof or contact support for assistance.`,
          message_type: 'payment_verification_result',
        });
      }

      toast({
        title: 'Proof Rejected',
        description: 'Payment proof has been rejected and customer notified.',
      });

      // Reset form
      setVerifyProofId(null);
      setRejectionReason('');
      setVerifyNotes('');

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['payment-proofs', quote.id] });
    } catch (error) {
      logger.error('Error rejecting proof:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject proof';
      toast({
        title: 'Error',
        description: errorMessage + '.',
        variant: 'destructive',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // Export payment history to CSV
  const handleExportPaymentHistory = () => {
    if (!paymentLedger || paymentLedger.length === 0) {
      toast({
        title: 'No Data',
        description: 'No payment history to export.',
        variant: 'destructive',
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
        'Recorded By',
      ];

      // Prepare CSV rows
      const rows = paymentLedger.map((entry) => [
        format(new Date(entry.created_at || entry.payment_date), 'yyyy-MM-dd HH:mm:ss'),
        entry.transaction_type || entry.payment_type || 'payment',
        entry.payment_method || '-',
        entry.gateway_code || '-',
        entry.amount?.toFixed(2) || '0.00',
        currency,
        entry.balance_after?.toFixed(2) || '0.00',
        entry.reference_number || entry.gateway_transaction_id || '-',
        entry.notes?.replace(/,/g, ';') || '-',
        entry.created_by_profile?.full_name || entry.created_by_profile?.email || 'System',
      ]);

      // Create CSV content
      const csvContent = [
        `Payment History for Order ${quote.display_id}`,
        `Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
        `Total Amount: ${currency} ${quote.final_total_usd?.toFixed(2)}`,
        '',
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payment_history_${quote.display_id}_${format(new Date(), 'yyyyMMdd')}.csv`;
      link.click();

      toast({
        title: 'Export Successful',
        description: 'Payment history exported to CSV.',
      });
    } catch (error) {
      logger.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export payment history.',
        variant: 'destructive',
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
    if (quote.payment_method === 'bank_transfer' && paymentProofs?.some((p) => !p.verified_at)) {
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
        return <Banknote className="w-5 h-5 text-teal-500" />;
      case 'payu':
      case 'stripe':
      case 'credit_card':
        return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'cash':
        return <DollarSign className="w-5 h-5 text-gray-500" />;
      case 'upi':
      case 'esewa':
        return <Smartphone className="w-5 h-5 text-orange-500" />;
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
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'partial':
        return 'text-orange-600 bg-orange-50';
      case 'unpaid':
        return 'text-red-600 bg-red-50';
      case 'partially_refunded':
        return 'text-orange-600 bg-orange-50';
      case 'fully_refunded':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Keyboard shortcuts for verification
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when verify tab is active and a proof is selected
      if (activeTab !== 'verify' || !verifyProofId) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (verifyAmount && parseFloat(verifyAmount) > 0 && !isVerifying) {
            handleVerifyProof();
          }
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          if (rejectionReason && !isRejecting) {
            handleRejectProof();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, verifyProofId, verifyAmount, rejectionReason, isVerifying, isRejecting]);

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
                {/* Due Amount Notification */}
                {dueAmountInfo &&
                  (dueAmountInfo.hasDueAmount || dueAmountInfo.changeType !== 'none') && (
                    <DueAmountNotification
                      dueInfo={dueAmountInfo}
                      currency={currency}
                      currencySymbol={currencySymbol}
                      quote={quote}
                      onPaymentLinkCreated={(_link) => {
                        toast({
                          title: 'Payment Link Created',
                          description: 'Payment link has been generated and copied to clipboard.',
                        });
                        // Refresh payment data
                        queryClient.invalidateQueries({
                          queryKey: ['payment-ledger', quote.id],
                        });
                      }}
                      showActions={true}
                    />
                  )}

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
                          'h-3 rounded-full transition-all',
                          paymentSummary.isOverpaid
                            ? 'bg-teal-600'
                            : paymentSummary.status === 'paid'
                              ? 'bg-green-600'
                              : 'bg-orange-600',
                        )}
                        style={{
                          width: `${Math.min(100, paymentSummary.percentagePaid)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Amount Details - Professional Display */}
                  <div className="space-y-3">
                    {/* Order Total */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Order Total</p>
                      <p className="text-lg font-bold">{formatAmount(paymentSummary.finalTotal)}</p>
                    </div>

                    {/* Total Payments */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Total Payments</p>
                      <p className="text-lg font-semibold text-green-600">
                        {currencyService.formatAmount(paymentSummary.totalPayments, currency)}
                      </p>
                    </div>

                    {/* Total Refunds (only show if > 0) */}
                    {paymentSummary.totalRefunds > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Total Refunds</p>
                        <p className="text-lg font-semibold text-red-600">
                          -{currencyService.formatAmount(paymentSummary.totalRefunds, currency)}
                        </p>
                      </div>
                    )}

                    {/* Separator for totals */}
                    {(paymentSummary.totalPayments > 0 || paymentSummary.totalRefunds > 0) && (
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Net Paid</p>
                          <p className="text-xl font-bold">
                            {currencyService.formatAmount(paymentSummary.totalPaid, currency)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Currency Breakdown - Show if multiple currencies */}
                    {paymentSummary.hasMultipleCurrencies && (
                      <div className="bg-teal-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-teal-800 mb-2">
                          Multi-Currency Breakdown
                        </p>
                        <div className="space-y-1 text-sm">
                          {Object.entries(paymentSummary.currencyBreakdown).map(
                            ([curr, amounts]) => {
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
                                    {getCurrencySymbol(curr)}
                                    {Math.abs(netAmount).toFixed(2)}
                                    {curr !== currency && (
                                      <Badge variant="outline" className="ml-1 text-xs py-0">
                                        {curr}
                                      </Badge>
                                    )}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                        {paymentSummary.hasMultipleCurrencies && (
                          <Alert variant="default" className="mt-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Multiple currencies detected. Refunds must be processed in the
                              original payment currency.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* Balance Due (only show if customer underpaid, not after refunds) */}
                    {paymentSummary.remaining > 0 &&
                      paymentSummary.totalPayments < paymentSummary.finalTotal && (
                        <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-orange-800">Balance Due</p>
                          <p className="text-xl font-bold text-orange-600">
                            {currencyService.formatAmount(paymentSummary.remaining, currency)}
                          </p>
                        </div>
                      )}

                    {/* Overpayment (only show if overpaid) */}
                    {paymentSummary.isOverpaid && (
                      <div className="flex items-center justify-between bg-teal-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-teal-800">Overpayment</p>
                        <p className="text-xl font-bold text-teal-600">
                          {currencyService.formatAmount(paymentSummary.overpaidAmount, currency)}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* Status and Quick Actions */}
                  <div className="flex items-center justify-between">
                    <Badge
                      className={cn('text-sm px-3 py-1', getStatusColor(paymentSummary.status))}
                    >
                      {paymentSummary.status === 'paid'
                        ? 'Fully Paid'
                        : paymentSummary.status === 'partial'
                          ? 'Partially Paid'
                          : paymentSummary.status === 'partially_refunded'
                            ? `Partially Refunded (${currencySymbol}${paymentSummary.totalRefunds.toFixed(2)})`
                            : paymentSummary.status === 'fully_refunded'
                              ? 'Fully Refunded'
                              : 'Unpaid'}
                    </Badge>

                    <div className="flex items-center gap-2">
                      {isMonitoring && (
                        <Badge variant="outline" className="text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                          Live Updates
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {paymentSummary.status !== 'paid' && (
                        <Button size="sm" onClick={() => setActiveTab('record')}>
                          <Plus className="w-4 h-4 mr-1" />
                          Record Payment
                        </Button>
                      )}
                      {paymentSummary.remaining > 0 && (
                        <EnhancedPaymentLinkGenerator
                          quoteId={quote.id}
                          amount={paymentSummary.remaining}
                          currency="USD"
                          quote={quote}
                          customerInfo={(() => {
                            const customerData = customerDisplayUtils.getCustomerDisplayData(quote, quote.profiles);
                            return {
                              name: customerData.name,
                              email: customerData.email || '',
                              phone: customerData.phone || quote.customer_phone || '',
                            };
                          })()}
                          onLinkCreated={(link) => {
                            toast({
                              title: 'Enhanced Payment Link Created',
                              description: `${link.apiVersion?.includes('rest') ? 'Advanced' : 'Legacy'} payment link for ${currencyService.formatAmount(paymentSummary.remaining, currency)} has been created.`,
                            });
                            // Refresh payment data after link creation
                            queryClient.invalidateQueries({
                              queryKey: ['payment-ledger', quote.id],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ['payment-links', quote.id],
                            });
                            // Force immediate refetch
                            queryClient.refetchQueries({
                              queryKey: ['payment-links', quote.id],
                            });
                          }}
                        />
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
                        <Select
                          value={paymentMethod}
                          onValueChange={(value) => setPaymentMethod(value as PaymentMethodType)}
                        >
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment-currency">Payment Currency</Label>
                        <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                          <SelectTrigger id="payment-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                            <SelectItem value="NPR">NPR - Nepalese Rupee</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                            <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          </SelectContent>
                        </Select>
                        {paymentCurrency !== currency && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              <strong>Warning:</strong> Payment currency ({paymentCurrency}) differs
                              from quote currency ({currency}). Ensure this is correct to avoid
                              refund issues.
                            </AlertDescription>
                          </Alert>
                        )}
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ({getCurrencySymbol(paymentCurrency)})</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="text"
                          placeholder={`0.00 ${paymentCurrency}`}
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
                      {parseFloat(paymentAmount) > paymentSummary.remaining &&
                        paymentSummary.remaining > 0 && (
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              This payment exceeds the remaining balance. The order will be marked
                              as overpaid.
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
                          'Review bank transfer receipts uploaded by the customer. Verify the transaction details match the order amount.'}
                        {quote.payment_method === 'upi' &&
                          'Verify UPI transaction screenshots. Check the transaction ID and amount.'}
                        {quote.payment_method === 'esewa' &&
                          'Verify eSewa payment confirmation. Cross-check with your eSewa merchant account.'}
                        {['payu', 'stripe'].includes(quote.payment_method) &&
                          'For online payments, verify the transaction in your payment gateway dashboard before recording manually.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {proofsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : paymentProofs && paymentProofs.filter((p) => !p.verified_at).length > 0 ? (
                    <div className="space-y-4">
                      {/* Unverified Proofs */}
                      <div className="space-y-3">
                        {paymentProofs
                          .filter((p) => !p.verified_at)
                          .map((proof) => (
                            <div
                              key={proof.id}
                              className={cn(
                                'p-4 border rounded-lg cursor-pointer transition-colors',
                                verifyProofId === proof.id
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:bg-muted/50',
                              )}
                              onClick={() => {
                                setVerifyProofId(proof.id);
                                setVerifyAmount(quote.final_total_usd?.toString() || '');
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
                                      Uploaded{' '}
                                      {format(new Date(proof.created_at), 'MMM dd, yyyy HH:mm')}
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

                      {/* Enhanced Verification Form */}
                      {verifyProofId &&
                        (() => {
                          const selectedProof = paymentProofs?.find((p) => p.id === verifyProofId);
                          const balance = calculatePaymentBalance();

                          return (
                            <>
                              <Separator />

                              {/* Image Preview Section */}
                              {selectedProof && (
                                <div className="bg-gray-50 rounded-lg p-4 relative">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm">Payment Proof Preview</h4>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          downloadFile(
                                            selectedProof.attachment_url,
                                            selectedProof.file_name || 'payment-proof',
                                          )
                                        }
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          window.open(selectedProof.attachment_url, '_blank')
                                        }
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="min-h-[200px] max-h-[300px] flex items-center justify-center bg-white rounded border">
                                    {selectedProof.file_name && isImage(selectedProof.file_name) ? (
                                      <div className="w-full h-full flex items-center justify-center">
                                        {previewImageLoading && (
                                          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                        )}
                                        {previewImageError ? (
                                          <div className="text-center text-gray-500">
                                            <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                                            <p className="text-sm">Unable to load preview</p>
                                          </div>
                                        ) : (
                                          <img
                                            src={selectedProof.attachment_url}
                                            alt="Payment proof"
                                            className="max-w-full max-h-full object-contain rounded"
                                            onLoad={() => setPreviewImageLoading(false)}
                                            onError={() => {
                                              setPreviewImageLoading(false);
                                              setPreviewImageError(true);
                                            }}
                                            style={{
                                              display: previewImageLoading ? 'none' : 'block',
                                            }}
                                          />
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-500">
                                        <FileText className="h-10 w-10 mx-auto mb-2" />
                                        <p className="text-sm">{selectedProof.file_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Click eye icon to view
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Payment Balance Calculation */}
                              <Alert className="border-teal-200 bg-teal-50">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span>Order Total:</span>
                                      <span className="font-medium">
                                        {currencySymbol}
                                        {balance.orderTotal.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Already Paid:</span>
                                      <span className="font-medium">
                                        {currencySymbol}
                                        {balance.currentPaid.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>New Amount:</span>
                                      <span className="font-medium">
                                        {currencySymbol}
                                        {balance.newAmount.toFixed(2)}
                                      </span>
                                    </div>
                                    <Separator className="my-1" />
                                    <div className="flex justify-between font-semibold">
                                      <span>Total After:</span>
                                      <span
                                        className={cn(
                                          balance.newTotal > balance.orderTotal
                                            ? 'text-orange-600'
                                            : balance.newTotal === balance.orderTotal
                                              ? 'text-green-600'
                                              : 'text-orange-600',
                                        )}
                                      >
                                        {currencySymbol}
                                        {balance.newTotal.toFixed(2)} ({balance.newStatus})
                                      </span>
                                    </div>
                                    {balance.overpayment > 0 && (
                                      <div className="text-orange-600 text-xs">
                                        Overpayment: {currencySymbol}
                                        {balance.overpayment.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </AlertDescription>
                              </Alert>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="verify-amount">
                                    Verified Amount ({currencySymbol})
                                  </Label>
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
                                  <Label htmlFor="rejection-reason">Rejection Reason</Label>
                                  <Select
                                    value={rejectionReason}
                                    onValueChange={setRejectionReason}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select if rejecting..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="invalid_amount">
                                        Amount doesn't match
                                      </SelectItem>
                                      <SelectItem value="unclear_proof">
                                        Proof unclear/unreadable
                                      </SelectItem>
                                      <SelectItem value="wrong_account">
                                        Wrong bank account
                                      </SelectItem>
                                      <SelectItem value="duplicate">
                                        Duplicate submission
                                      </SelectItem>
                                      <SelectItem value="insufficient_details">
                                        Missing transaction details
                                      </SelectItem>
                                      <SelectItem value="other">Other reason</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="verify-notes">Admin Notes</Label>
                                <Textarea
                                  id="verify-notes"
                                  placeholder="Add verification notes or detailed rejection reason..."
                                  value={verifyNotes}
                                  onChange={(e) => setVerifyNotes(e.target.value)}
                                  rows={2}
                                />
                              </div>

                              {/* Keyboard shortcuts reminder */}
                              <Alert className="border-gray-200">
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  <kbd className="font-mono bg-gray-100 px-1 rounded mr-2">
                                    Ctrl+Enter
                                  </kbd>
                                  to approve •
                                  <kbd className="font-mono bg-gray-100 px-1 rounded mx-2">
                                    Ctrl+R
                                  </kbd>
                                  to reject
                                </AlertDescription>
                              </Alert>

                              <div className="flex gap-2">
                                <Button
                                  onClick={handleVerifyProof}
                                  disabled={
                                    isVerifying || !verifyAmount || parseFloat(verifyAmount) <= 0
                                  }
                                  className="flex-1 bg-green-600 hover:bg-green-700"
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

                                <Button
                                  onClick={handleRejectProof}
                                  disabled={isRejecting || !rejectionReason}
                                  variant="outline"
                                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  {isRejecting ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Rejecting...
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-4 h-4 mr-2" />
                                      Reject Proof
                                    </>
                                  )}
                                </Button>
                              </div>
                            </>
                          );
                        })()}
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkPaymentStatus}
                        disabled={isDueProcessing}
                      >
                        {isDueProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPaymentHistory()}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {ledgerLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : !paymentLedger || paymentLedger.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No payment history found</p>
                      <p className="text-xs mt-2">Quote ID: {quote.id}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={async () => {
                          console.log('Manually checking payment data...');
                          const { data: ledger, error: ledgerErr } = await supabase
                            .from('payment_transactions')
                            .select('*')
                            .eq('quote_id', quote.id)
                            .order('created_at', { ascending: false });
                          console.log('Direct payment transactions query:', {
                            data: ledger,
                            error: ledgerErr,
                          });

                          const { data: transactions, error: txErr } = await supabase
                            .from('payment_transactions')
                            .select('*')
                            .eq('quote_id', quote.id);
                          console.log('Direct transactions query:', {
                            data: transactions,
                            error: txErr,
                          });
                        }}
                      >
                        Debug: Check Payment Data
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-border" />

                      {/* Timeline Items */}
                      <div className="space-y-6">
                        {paymentLedger.map((entry, index) => {
                          const type = entry.transaction_type || entry.payment_type;
                          const isPayment =
                            type === 'payment' ||
                            type === 'customer_payment' ||
                            (entry.status === 'completed' && !type);
                          const isRefund = type === 'refund' || type === 'partial_refund';
                          const _isFirst = index === 0;
                          const _isLast = index === paymentLedger.length - 1;
                          const entryAmount = parseFloat(entry.amount) || 0;

                          return (
                            <div key={entry.id} className="relative flex items-start gap-4">
                              {/* Timeline Dot */}
                              <div
                                className={cn(
                                  'relative z-10 flex h-10 w-10 items-center justify-center rounded-full',
                                  isPayment
                                    ? 'bg-green-100 text-green-600'
                                    : isRefund
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-gray-100 text-gray-600',
                                )}
                              >
                                {isPayment ? (
                                  <DollarSign className="h-5 w-5" />
                                ) : isRefund ? (
                                  <RefreshCw className="h-5 w-5" />
                                ) : (
                                  <FileText className="h-5 w-5" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 pb-6">
                                <div className="rounded-lg border bg-background p-4 shadow-sm">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-medium">
                                        {isPayment
                                          ? 'Payment Received'
                                          : isRefund
                                            ? 'Refund Processed'
                                            : 'Transaction'}
                                      </h4>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {entry.payment_method
                                          ?.replace(/_/g, ' ')
                                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                                        {entry.gateway_code &&
                                          ` via ${entry.gateway_code.toUpperCase()}`}
                                        {entry.currency && entry.currency !== currency && (
                                          <Badge variant="outline" className="ml-2 text-xs py-0">
                                            {entry.currency} Payment
                                          </Badge>
                                        )}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p
                                        className={cn(
                                          'font-semibold',
                                          isPayment
                                            ? 'text-green-600'
                                            : isRefund
                                              ? 'text-red-600'
                                              : 'text-gray-600',
                                        )}
                                      >
                                        {isPayment ? '+' : isRefund ? '-' : ''}
                                        {getCurrencySymbol(entry.currency || currency)}
                                        {Math.abs(entryAmount).toFixed(2)}
                                        {entry.currency && entry.currency !== currency && (
                                          <span className="text-xs text-orange-600 ml-1">
                                            ({entry.currency})
                                          </span>
                                        )}
                                      </p>
                                      {entry.balance_after !== undefined && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Balance: {currencySymbol}
                                          {(parseFloat(entry.balance_after) || 0).toFixed(2)}
                                        </p>
                                      )}
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
                                      <span>
                                        {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                                      </span>
                                    </div>
                                    {entry.created_by && (
                                      <div className="flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        <span>
                                          by{' '}
                                          {entry.created_by.full_name ||
                                            entry.created_by.email ||
                                            'System'}
                                        </span>
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
                                Quote #{quote.display_id} - Total:{' '}
                                {formatAmount(quote.final_total_usd || 0)}
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
                            {currencyService.formatAmount(paymentSummary.totalPayments, currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Refunds</p>
                          <p className="text-lg font-semibold text-red-600">
                            {currencyService.formatAmount(paymentSummary.totalRefunds, currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Transactions</p>
                          <p className="text-lg font-semibold">{paymentLedger.length}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Links Section */}
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Payment Links</h3>
                    <Badge variant="outline" className="text-xs">
                      {paymentLinks?.length || 0} Links
                    </Badge>
                  </div>

                  {linksLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : paymentLinks && paymentLinks.length > 0 ? (
                    <div className="space-y-3">
                      {paymentLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                link.status === 'active'
                                  ? 'bg-green-500'
                                  : link.status === 'completed'
                                    ? 'bg-teal-500'
                                    : link.status === 'expired'
                                      ? 'bg-orange-500'
                                      : 'bg-gray-400',
                              )}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {currencyService.formatAmount(link.amount, link.currency)}
                                </p>
                                {link.api_version === 'v2_rest' && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-green-50 text-green-700"
                                  >
                                    Enhanced
                                  </Badge>
                                )}
                                {link.api_version === 'v1_legacy' && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-teal-50 text-teal-700"
                                  >
                                    Legacy
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {link.description || 'Payment Link'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created {format(new Date(link.created_at), 'MMM dd, yyyy HH:mm')}
                                {link.expires_at && (
                                  <span>
                                    {' '}
                                    • Expires {format(new Date(link.expires_at), 'MMM dd, yyyy')}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                link.status === 'active'
                                  ? 'default'
                                  : link.status === 'completed'
                                    ? 'outline'
                                    : link.status === 'expired'
                                      ? 'secondary'
                                      : 'secondary'
                              }
                              className="text-xs"
                            >
                              {link.status}
                            </Badge>

                            {link.payment_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(link.payment_url);
                                  toast({
                                    title: 'Link Copied!',
                                    description: 'Payment link has been copied to clipboard',
                                  });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}

                            {link.payment_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(link.payment_url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No payment links generated yet</p>
                      <p className="text-xs">Payment links will appear here when created</p>
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
                          Total paid amount:{' '}
                          {currencyService.formatAmount(paymentSummary.totalPaid, currency)}
                          {paymentSummary.isOverpaid && (
                            <span className="block mt-1 text-teal-600">
                              Overpaid by:{' '}
                              {currencyService.formatAmount(
                                paymentSummary.overpaidAmount,
                                currency,
                              )}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>

                      <Button onClick={() => setShowRefundModal(true)} className="w-full">
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
      {showRefundModal &&
        (() => {
          console.log('Refund Modal Debug:', {
            showRefundModal: showRefundModal,
            paymentLedger: paymentLedger,
            paymentLedgerLength: paymentLedger?.length || 0,
          });

          if (!paymentLedger || paymentLedger.length === 0) {
            return (
              <RefundManagementModal
                isOpen={showRefundModal}
                onClose={() => setShowRefundModal(false)}
                quote={{
                  id: quote.id,
                  final_total_usd: quote.final_total_usd || 0,
                  amount_paid: paymentSummary.totalPaid,
                  currency: currency,
                  payment_method: quote.payment_method || '',
                }}
                payments={[]}
              />
            );
          }

          const eligiblePayments = paymentLedger
            .filter((p) => {
              const type = p.transaction_type || p.payment_type;
              const isPayment =
                type === 'payment' ||
                type === 'customer_payment' ||
                type === 'manual_payment' ||
                (p.status === 'completed' && p.amount > 0);
              console.log('Payment eligibility check:', {
                id: p.id,
                type: type,
                status: p.status,
                amount: p.amount,
                isPayment: isPayment,
              });
              return isPayment;
            })
            .map((p) => {
              // Check if this is a PayU payment by multiple methods
              const isPayU =
                p.gateway_code === 'payu' ||
                p.payment_method === 'payu' ||
                p.payment_method?.toLowerCase() === 'payu' ||
                (p.gateway_response &&
                  typeof p.gateway_response === 'object' &&
                  p.gateway_response.key?.includes('JP'));

              // Check if this is a PayPal payment
              const isPayPal =
                p.gateway_code === 'paypal' ||
                p.payment_method === 'paypal' ||
                p.payment_method?.toLowerCase() === 'paypal' ||
                (p.gateway_response &&
                  typeof p.gateway_response === 'object' &&
                  p.gateway_response.id &&
                  p.gateway_response.status);

              const payment = {
                id: p.id,
                amount: Math.abs(p.amount || 0),
                currency: p.currency || currency, // Use payment currency if available, fallback to quote currency
                method: p.payment_method || '',
                gateway: p.gateway_code || p.payment_method || '',
                reference:
                  p.gateway_transaction_id ||
                  p.reference_number ||
                  p.transaction_id ||
                  p.gateway_response?.payu_id || // PayU specific - this is the mihpayid
                  p.gateway_response?.mihpayid || // PayU fallback
                  p.gateway_response?.gateway_transaction_id ||
                  '',
                date: new Date(p.payment_date || p.created_at),
                canRefund: isPayU || isPayPal || p.payment_method === 'bank_transfer', // PayU, PayPal and bank transfers can be refunded
              };
              console.log('Mapped payment for refund:', {
                ...payment,
                original_gateway_code: p.gateway_code,
                original_payment_method: p.payment_method,
                original_reference_number: p.reference_number,
                original_gateway_transaction_id: p.gateway_transaction_id,
                original_transaction_id: p.transaction_id,
                gateway_response: p.gateway_response,
                isPayU: isPayU,
                isPayPal: isPayPal,
              });
              return payment;
            });

          console.log('Eligible payments for refund:', eligiblePayments);

          return (
            <RefundManagementModal
              isOpen={showRefundModal}
              onClose={() => setShowRefundModal(false)}
              quote={{
                id: quote.id,
                final_total_usd: quote.final_total_usd || 0,
                amount_paid: paymentSummary.totalPaid,
                currency: currency,
                payment_method: quote.payment_method || '',
              }}
              payments={eligiblePayments}
            />
          );
        })()}
    </>
  );
};
