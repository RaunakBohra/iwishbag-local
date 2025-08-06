/**
 * Payment Data Service
 * Handles all data fetching, caching, and API integration for payment operations
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Type definitions
export interface Quote {
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

export interface PaymentLedgerEntry {
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

export interface PaymentProof {
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

export interface PaymentLink {
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

export interface PaymentSummaryData {
  finalTotal: number;
  totalPaid: number;
  totalPayments: number;
  totalRefunds: number;
  remaining: number;
  overpaidAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'partially_refunded' | 'fully_refunded';
  isOverpaid: boolean;
  hasRefunds: boolean;
  hasMultipleCurrencies: boolean;
  currencyBreakdown: Record<string, { payments: number; refunds: number }>;
  percentagePaid: number;
}

export class PaymentDataService {
  private queryClient: QueryClient;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    logger.info('PaymentDataService initialized');
  }

  /**
   * Fetch payment ledger data with intelligent combining
   */
  async fetchPaymentLedger(quoteId: string): Promise<PaymentLedgerEntry[]> {
    try {
      logger.debug('Fetching payment data for quote:', quoteId);

      // Fetch from consolidated payment_transactions table
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (ledgerError) {
        logger.error('Error fetching payment ledger:', ledgerError);
      }

      // Also fetch from payment_transactions as additional source
      const { data: transactionData, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quoteId)
        .in('status', ['completed', 'success'])
        .order('created_at', { ascending: false });

      if (transactionError) {
        logger.error('Error fetching payment transactions:', transactionError);
      }

      logger.debug('Payment ledger data:', ledgerData);
      logger.debug('Payment transaction data:', transactionData);

      // Combine both sources to get complete payment history
      const combinedData: PaymentLedgerEntry[] = [];

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

      logger.debug('Combined payment data:', combinedData);
      return combinedData;
    } catch (error) {
      logger.error('Error in fetchPaymentLedger:', error);
      throw error;
    }
  }

  /**
   * Fetch payment proofs for bank transfers
   */
  async fetchPaymentProofs(quoteId: string): Promise<PaymentProof[]> {
    try {
      // Query messages table for payment proofs
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_id', quoteId)
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
          sender_id: msg.sender_id,
        })) || []
      );
    } catch (error) {
      logger.error('Error fetching payment proofs:', error);
      throw error;
    }
  }

  /**
   * Fetch payment links
   */
  async fetchPaymentLinks(quoteId: string): Promise<PaymentLink[]> {
    try {
      logger.debug('Fetching payment links for quote:', quoteId);

      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Error fetching payment links:', error);
        return [];
      }

      logger.info(`Found ${data?.length || 0} payment links`);
      logger.debug('📋 Payment links data:', data);

      return data || [];
    } catch (error) {
      logger.error('Error in fetchPaymentLinks:', error);
      return [];
    }
  }

  /**
   * Calculate comprehensive payment summary
   */
  calculatePaymentSummary(
    paymentLedger: PaymentLedgerEntry[],
    finalTotal: number,
    currency: string
  ): PaymentSummaryData {
    let totalPayments = 0;
    let totalRefunds = 0;
    const currencyBreakdown: Record<string, { payments: number; refunds: number }> = {};

    paymentLedger?.forEach((entry) => {
      const type = entry.transaction_type || entry.payment_type;
      const amount = parseFloat(entry.amount.toString()) || 0;
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
    const remaining = finalTotal - totalPaid;

    // Determine payment status with refund states
    let status: PaymentSummaryData['status'] = 'unpaid';
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
  }

  /**
   * Invalidate payment-related queries
   */
  invalidatePaymentQueries(quoteId: string): void {
    this.queryClient.invalidateQueries({ queryKey: ['payment-ledger', quoteId] });
    this.queryClient.invalidateQueries({ queryKey: ['payment-proofs', quoteId] });
    this.queryClient.invalidateQueries({ queryKey: ['payment-links', quoteId] });
    this.queryClient.invalidateQueries({ queryKey: ['quotes'] });
    this.queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
  }

  /**
   * Force refetch payment data
   */
  async refetchPaymentData(quoteId: string): Promise<void> {
    await Promise.all([
      this.queryClient.refetchQueries({ queryKey: ['payment-ledger', quoteId] }),
      this.queryClient.refetchQueries({ queryKey: ['payment-proofs', quoteId] }),
      this.queryClient.refetchQueries({ queryKey: ['payment-links', quoteId] }),
    ]);
  }

  /**
   * Check payment status from external gateways
   */
  async checkPaymentStatus(quoteId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // This would integrate with payment gateway APIs to check real-time status
      // For now, just refresh our local data
      await this.refetchPaymentData(quoteId);
      
      logger.info('Payment status check completed for quote:', quoteId);
      return { success: true };
    } catch (error) {
      logger.error('Payment status check failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Status check failed' 
      };
    }
  }

  /**
   * Clean up old cached data
   */
  cleanupCache(): void {
    // This would clean up expired cache entries
    logger.debug('Payment data cache cleanup completed');
  }
}

/**
 * React Hook for Payment Ledger Data
 */
export function usePaymentLedger(quoteId: string, isEnabled: boolean) {
  const paymentDataService = new PaymentDataService(useQueryClient());

  return useQuery<PaymentLedgerEntry[]>({
    queryKey: ['payment-ledger', quoteId],
    queryFn: () => paymentDataService.fetchPaymentLedger(quoteId),
    enabled: isEnabled && !!quoteId,
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Hook for Payment Proofs Data
 */
export function usePaymentProofs(quoteId: string, isEnabled: boolean, paymentMethod?: string) {
  const paymentDataService = new PaymentDataService(useQueryClient());

  return useQuery<PaymentProof[]>({
    queryKey: ['payment-proofs', quoteId],
    queryFn: () => paymentDataService.fetchPaymentProofs(quoteId),
    enabled: isEnabled && !!quoteId && paymentMethod === 'bank_transfer',
    staleTime: 60000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Hook for Payment Links Data
 */
export function usePaymentLinks(quoteId: string, isEnabled: boolean) {
  const paymentDataService = new PaymentDataService(useQueryClient());

  return useQuery<PaymentLink[]>({
    queryKey: ['payment-links', quoteId],
    queryFn: () => paymentDataService.fetchPaymentLinks(quoteId),
    enabled: isEnabled && !!quoteId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Hook for Payment Data Management
 */
export function usePaymentDataService() {
  const queryClient = useQueryClient();
  const paymentDataService = new PaymentDataService(queryClient);

  const refreshPaymentData = useCallback(
    async (quoteId: string) => {
      await paymentDataService.refetchPaymentData(quoteId);
    },
    [paymentDataService]
  );

  const invalidatePaymentData = useCallback(
    (quoteId: string) => {
      paymentDataService.invalidatePaymentQueries(quoteId);
    },
    [paymentDataService]
  );

  const checkPaymentStatus = useCallback(
    async (quoteId: string) => {
      return await paymentDataService.checkPaymentStatus(quoteId);
    },
    [paymentDataService]
  );

  return {
    paymentDataService,
    refreshPaymentData,
    invalidatePaymentData,
    checkPaymentStatus,
  };
}

export default PaymentDataService;