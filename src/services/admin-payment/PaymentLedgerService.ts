/**
 * Payment Ledger Service
 * Manages payment transactions, ledger operations, and balance calculations
 * Extracted from UnifiedPaymentModal for clean transaction management
 * 
 * RESPONSIBILITIES:
 * - Payment transaction recording and validation
 * - Payment status tracking and updates
 * - Balance calculations and reconciliation
 * - Transaction history and audit trails
 * - Gateway integration and response handling
 * - Duplicate payment prevention
 * - Transaction search and filtering
 * - Payment analytics and reporting
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

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

export interface PaymentTransaction {
  id: string;
  quote_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  status: string;
  created_at: string;
  gateway_response?: Record<string, unknown>;
}

export interface PaymentSummary {
  totalPaid: number;
  totalDue: number;
  balance: number;
  currency: string;
  lastPaymentDate?: string;
  paymentCount: number;
  refundCount: number;
  totalRefunded: number;
}

export interface TransactionQuery {
  quote_id?: string;
  payment_method?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  transaction_type?: string;
  limit?: number;
  offset?: number;
}

export interface RecordPaymentInput {
  quote_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference_number?: string;
  gateway_transaction_id?: string;
  payment_date?: string;
  notes?: string;
  created_by?: string;
  gateway_response?: Record<string, unknown>;
}

export class PaymentLedgerService {
  private static instance: PaymentLedgerService;
  private ledgerCache = new Map<string, { data: PaymentLedgerEntry[]; timestamp: number }>();
  private summaryCache = new Map<string, { summary: PaymentSummary; timestamp: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    logger.info('PaymentLedgerService initialized');
  }

  static getInstance(): PaymentLedgerService {
    if (!PaymentLedgerService.instance) {
      PaymentLedgerService.instance = new PaymentLedgerService();
    }
    return PaymentLedgerService.instance;
  }

  /**
   * Get comprehensive payment ledger for a quote
   */
  async getPaymentLedger(quoteId: string, forceRefresh: boolean = false): Promise<PaymentLedgerEntry[]> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.getLedgerFromCache(quoteId);
        if (cached) {
          logger.debug('Payment ledger cache hit for quote:', quoteId);
          return cached;
        }
      }

      logger.info('Fetching payment ledger for quote:', quoteId);

      // Fetch from payment_transactions table (consolidated)
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          created_by_profile:profiles!payment_transactions_created_by_fkey(full_name, email)
        `)
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (ledgerError && ledgerError.code !== 'PGRST116') { // Ignore "not found" errors
        logger.error('Error fetching payment ledger:', ledgerError);
      }

      // Fetch from payment_transactions as additional source
      const { data: transactionData, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quoteId)
        .in('status', ['completed', 'success'])
        .order('created_at', { ascending: false });

      if (transactionError && transactionError.code !== 'PGRST116') {
        logger.error('Error fetching payment transactions:', transactionError);
      }

      // Combine and deduplicate data sources
      const combinedData = this.combinePaymentSources(ledgerData || [], transactionData || []);

      // Calculate running balances
      const processedData = this.calculateRunningBalances(combinedData);

      // Cache the result
      this.setLedgerCache(quoteId, processedData);

      logger.info(`Payment ledger loaded: ${processedData.length} entries for quote ${quoteId}`);
      return processedData;

    } catch (error) {
      logger.error('Failed to get payment ledger:', error);
      throw error;
    }
  }

  /**
   * Record a new payment transaction
   */
  async recordPayment(paymentData: RecordPaymentInput): Promise<PaymentLedgerEntry> {
    try {
      logger.info('Recording payment:', { 
        quote_id: paymentData.quote_id, 
        amount: paymentData.amount,
        method: paymentData.payment_method 
      });

      // Validate payment data
      this.validatePaymentInput(paymentData);

      // Check for duplicate payments
      const isDuplicate = await this.checkDuplicatePayment(paymentData);
      if (isDuplicate) {
        throw new Error('Duplicate payment detected');
      }

      // Get current balance
      const currentSummary = await this.getPaymentSummary(paymentData.quote_id);
      const newBalance = currentSummary.balance + paymentData.amount;

      // Prepare transaction data
      const transactionData = {
        quote_id: paymentData.quote_id,
        payment_type: 'payment',
        transaction_type: 'customer_payment',
        payment_method: paymentData.payment_method,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'completed',
        reference_number: paymentData.reference_number,
        gateway_transaction_id: paymentData.gateway_transaction_id,
        payment_date: paymentData.payment_date || new Date().toISOString(),
        notes: paymentData.notes,
        balance_after: newBalance,
        created_by: paymentData.created_by,
        gateway_response: paymentData.gateway_response,
        created_at: new Date().toISOString()
      };

      // Insert into database
      const { data: savedTransaction, error } = await supabase
        .from('payment_transactions')
        .insert(transactionData)
        .select(`
          *,
          created_by_profile:profiles!payment_transactions_created_by_fkey(full_name, email)
        `)
        .single();

      if (error) throw error;

      // Clear cache for this quote
      this.clearQuoteCache(paymentData.quote_id);

      // Log the transaction
      await this.logPaymentActivity({
        quote_id: paymentData.quote_id,
        action: 'payment_recorded',
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        created_by: paymentData.created_by
      });

      logger.info('Payment recorded successfully:', savedTransaction.id);
      return savedTransaction;

    } catch (error) {
      logger.error('Failed to record payment:', error);
      throw error;
    }
  }

  /**
   * Get payment summary for a quote
   */
  async getPaymentSummary(quoteId: string, forceRefresh: boolean = false): Promise<PaymentSummary> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.getSummaryFromCache(quoteId);
        if (cached) {
          logger.debug('Payment summary cache hit for quote:', quoteId);
          return cached;
        }
      }

      const ledgerData = await this.getPaymentLedger(quoteId, forceRefresh);
      
      // Calculate summary from ledger data
      const summary = this.calculatePaymentSummary(ledgerData, quoteId);

      // Cache the result
      this.setSummaryCache(quoteId, summary);

      return summary;

    } catch (error) {
      logger.error('Failed to get payment summary:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    transactionId: string, 
    status: string, 
    notes?: string,
    gatewayResponse?: Record<string, unknown>
  ): Promise<PaymentLedgerEntry> {
    try {
      logger.info('Updating payment status:', { transactionId, status });

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) updateData.notes = notes;
      if (gatewayResponse) updateData.gateway_response = gatewayResponse;

      const { data: updatedTransaction, error } = await supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select(`
          *,
          created_by_profile:profiles!payment_transactions_created_by_fkey(full_name, email)
        `)
        .single();

      if (error) throw error;

      // Clear cache for affected quote
      this.clearQuoteCache(updatedTransaction.quote_id);

      logger.info('Payment status updated successfully');
      return updatedTransaction;

    } catch (error) {
      logger.error('Failed to update payment status:', error);
      throw error;
    }
  }

  /**
   * Search transactions with filters
   */
  async searchTransactions(query: TransactionQuery): Promise<PaymentLedgerEntry[]> {
    try {
      let supabaseQuery = supabase
        .from('payment_transactions')
        .select(`
          *,
          created_by_profile:profiles!payment_transactions_created_by_fkey(full_name, email)
        `);

      // Apply filters
      if (query.quote_id) {
        supabaseQuery = supabaseQuery.eq('quote_id', query.quote_id);
      }

      if (query.payment_method) {
        supabaseQuery = supabaseQuery.eq('payment_method', query.payment_method);
      }

      if (query.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }

      if (query.transaction_type) {
        supabaseQuery = supabaseQuery.eq('transaction_type', query.transaction_type);
      }

      if (query.date_from) {
        supabaseQuery = supabaseQuery.gte('created_at', query.date_from);
      }

      if (query.date_to) {
        supabaseQuery = supabaseQuery.lte('created_at', query.date_to);
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }

      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
      }

      // Order by most recent first
      supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      logger.info(`Transaction search completed: ${data?.length || 0} results`);
      return data || [];

    } catch (error) {
      logger.error('Transaction search failed:', error);
      throw error;
    }
  }

  /**
   * Get payment analytics for date range
   */
  async getPaymentAnalytics(dateFrom: string, dateTo: string): Promise<{
    totalRevenue: number;
    transactionCount: number;
    averageTransaction: number;
    paymentMethodBreakdown: Record<string, { count: number; amount: number }>;
    dailyTrends: Array<{ date: string; amount: number; count: number }>;
  }> {
    try {
      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_type', 'customer_payment')
        .eq('status', 'completed')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      const analytics = this.calculateAnalytics(transactions || []);
      logger.info('Payment analytics calculated for date range');

      return analytics;

    } catch (error) {
      logger.error('Failed to get payment analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private combinePaymentSources(
    ledgerData: any[], 
    transactionData: any[]
  ): PaymentLedgerEntry[] {
    const combined: PaymentLedgerEntry[] = [];
    const seenIds = new Set<string>();

    // Add ledger data first (primary source)
    ledgerData.forEach(entry => {
      combined.push(entry);
      seenIds.add(entry.id);
      
      // Also track by reference number to prevent duplicates
      if (entry.reference_number) {
        seenIds.add(entry.reference_number);
      }
    });

    // Add transaction data that's not already in ledger
    transactionData.forEach(tx => {
      const isDuplicate = seenIds.has(tx.id) || 
                         (tx.transaction_id && seenIds.has(tx.transaction_id));

      if (!isDuplicate) {
        combined.push({
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
          gateway_response: tx.gateway_response
        });
      }
    });

    return combined.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  private calculateRunningBalances(transactions: PaymentLedgerEntry[]): PaymentLedgerEntry[] {
    let runningBalance = 0;

    // Process in reverse chronological order to calculate running balances
    const reversedTransactions = [...transactions].reverse();
    
    reversedTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'refund') {
        runningBalance -= Math.abs(transaction.amount);
      } else {
        runningBalance += transaction.amount;
      }
      transaction.balance_after = runningBalance;
    });

    // Return in original order (most recent first)
    return reversedTransactions.reverse();
  }

  private calculatePaymentSummary(ledgerData: PaymentLedgerEntry[], quoteId: string): PaymentSummary {
    let totalPaid = 0;
    let totalRefunded = 0;
    let paymentCount = 0;
    let refundCount = 0;
    let lastPaymentDate: string | undefined;

    ledgerData.forEach(entry => {
      if (entry.status === 'completed' || entry.status === 'success') {
        if (entry.transaction_type === 'refund') {
          totalRefunded += Math.abs(entry.amount);
          refundCount++;
        } else {
          totalPaid += entry.amount;
          paymentCount++;
          
          if (!lastPaymentDate || entry.created_at > lastPaymentDate) {
            lastPaymentDate = entry.created_at;
          }
        }
      }
    });

    // Note: totalDue would need to be calculated from quote data
    const balance = totalPaid - totalRefunded;

    return {
      totalPaid,
      totalDue: 0, // Would be calculated from quote total
      balance,
      currency: ledgerData[0]?.currency || 'USD',
      lastPaymentDate,
      paymentCount,
      refundCount,
      totalRefunded
    };
  }

  private validatePaymentInput(paymentData: RecordPaymentInput): void {
    if (!paymentData.quote_id) {
      throw new Error('Quote ID is required');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Valid payment amount is required');
    }

    if (!paymentData.currency) {
      throw new Error('Currency is required');
    }

    if (!paymentData.payment_method) {
      throw new Error('Payment method is required');
    }
  }

  private async checkDuplicatePayment(paymentData: RecordPaymentInput): Promise<boolean> {
    try {
      if (!paymentData.reference_number && !paymentData.gateway_transaction_id) {
        return false; // Can't check for duplicates without reference
      }

      let query = supabase
        .from('payment_transactions')
        .select('id')
        .eq('quote_id', paymentData.quote_id)
        .eq('amount', paymentData.amount);

      if (paymentData.reference_number) {
        query = query.eq('reference_number', paymentData.reference_number);
      }

      if (paymentData.gateway_transaction_id) {
        query = query.eq('gateway_transaction_id', paymentData.gateway_transaction_id);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        logger.warn('Error checking for duplicate payments:', error);
        return false; // Don't block on error
      }

      return (data?.length || 0) > 0;

    } catch (error) {
      logger.error('Duplicate payment check failed:', error);
      return false; // Don't block on error
    }
  }

  private async logPaymentActivity(activity: {
    quote_id: string;
    action: string;
    amount: number;
    payment_method: string;
    created_by?: string;
  }): Promise<void> {
    try {
      await supabase
        .from('payment_activity_logs')
        .insert({
          ...activity,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to log payment activity:', error);
      // Don't throw, as this is non-critical
    }
  }

  private calculateAnalytics(transactions: any[]): any {
    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const transactionCount = transactions.length;
    const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { count: number; amount: number }> = {};
    transactions.forEach(tx => {
      const method = tx.payment_method || 'unknown';
      if (!paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method] = { count: 0, amount: 0 };
      }
      paymentMethodBreakdown[method].count++;
      paymentMethodBreakdown[method].amount += tx.amount;
    });

    // Daily trends (simplified)
    const dailyTrends: Array<{ date: string; amount: number; count: number }> = [];
    const dailyMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach(tx => {
      const date = tx.created_at.split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { amount: 0, count: 0 });
      }
      const day = dailyMap.get(date)!;
      day.amount += tx.amount;
      day.count++;
    });

    dailyMap.forEach((value, date) => {
      dailyTrends.push({ date, ...value });
    });

    return {
      totalRevenue,
      transactionCount,
      averageTransaction,
      paymentMethodBreakdown,
      dailyTrends: dailyTrends.sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  // Cache management methods
  private getLedgerFromCache(quoteId: string): PaymentLedgerEntry[] | null {
    const cached = this.ledgerCache.get(quoteId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    if (cached) {
      this.ledgerCache.delete(quoteId);
    }
    
    return null;
  }

  private setLedgerCache(quoteId: string, data: PaymentLedgerEntry[]): void {
    this.ledgerCache.set(quoteId, {
      data,
      timestamp: Date.now()
    });
  }

  private getSummaryFromCache(quoteId: string): PaymentSummary | null {
    const cached = this.summaryCache.get(quoteId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.summary;
    }
    
    if (cached) {
      this.summaryCache.delete(quoteId);
    }
    
    return null;
  }

  private setSummaryCache(quoteId: string, summary: PaymentSummary): void {
    this.summaryCache.set(quoteId, {
      summary,
      timestamp: Date.now()
    });
  }

  private clearQuoteCache(quoteId: string): void {
    this.ledgerCache.delete(quoteId);
    this.summaryCache.delete(quoteId);
  }

  /**
   * Public utility methods
   */
  clearAllCache(): void {
    this.ledgerCache.clear();
    this.summaryCache.clear();
    logger.info('Payment ledger cache cleared');
  }

  getCacheStats(): { 
    ledgerCacheSize: number; 
    summaryCacheSize: number; 
    totalCacheEntries: number;
  } {
    return {
      ledgerCacheSize: this.ledgerCache.size,
      summaryCacheSize: this.summaryCache.size,
      totalCacheEntries: this.ledgerCache.size + this.summaryCache.size
    };
  }

  dispose(): void {
    this.ledgerCache.clear();
    this.summaryCache.clear();
    logger.info('PaymentLedgerService disposed');
  }
}

export default PaymentLedgerService;