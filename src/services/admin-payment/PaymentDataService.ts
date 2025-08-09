/**
 * Payment Data Service
 * Handles payment data fetching, filtering, and aggregation
 * Decomposed from PaymentManagementPage for focused data management
 * 
 * RESPONSIBILITIES:
 * - Payment data fetching (bank transfers + webhook payments)
 * - Advanced filtering and search functionality
 * - Payment statistics and analytics
 * - Data pagination and sorting
 * - Payment data transformation and normalization
 * - Cross-reference data joining (quotes, profiles)
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface PaymentProofData {
  id: string;
  quote_id: string;
  sender_id: string;
  attachment_url: string;
  attachment_file_name: string;
  created_at: string;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  admin_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  // Joined data
  order_display_id: string;
  final_total_origincurrency: number;
  destination_currency?: string;
  payment_method: string;
  payment_status: string;
  customer_email: string;
  customer_name: string;
  amount_paid?: number;
  // Payment type indicator
  payment_type: 'bank_transfer_proof' | 'webhook_payment';
  // Webhook payment specific fields
  transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  gateway_name?: string;
}

export interface PaymentDataFilter {
  statusFilter: 'all' | 'pending' | 'verified' | 'rejected';
  paymentMethodFilter: 'all' | 'bank_transfer' | 'payu' | 'stripe' | 'esewa';
  searchQuery: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  currentPage: number;
  pageSize: number;
}

export interface PaymentDataResult {
  data: PaymentProofData[];
  totalCount: number;
  filteredCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaymentStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  totalAmount: number;
  averageAmount: number;
  topPaymentMethods: Array<{
    method: string;
    count: number;
    totalAmount: number;
  }>;
}

export class PaymentDataService {
  private static instance: PaymentDataService;
  private dataCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes cache for payment data

  constructor() {
    logger.info('PaymentDataService initialized');
  }

  static getInstance(): PaymentDataService {
    if (!PaymentDataService.instance) {
      PaymentDataService.instance = new PaymentDataService();
    }
    return PaymentDataService.instance;
  }

  /**
   * Fetch payment data with filtering and pagination
   */
  async fetchPaymentData(filter: PaymentDataFilter): Promise<PaymentDataResult> {
    try {
      const cacheKey = this.createCacheKey('payment_data', filter);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached payment data');
        return cached;
      }

      logger.info('Fetching payment data with filters:', filter);

      let allPaymentData: PaymentProofData[] = [];

      // Fetch bank transfer payment proofs if needed
      if (filter.paymentMethodFilter === 'all' || filter.paymentMethodFilter === 'bank_transfer') {
        const bankTransferData = await this.fetchBankTransferData(filter);
        allPaymentData.push(...bankTransferData);
      }

      // Fetch webhook payments if needed
      if (
        filter.paymentMethodFilter === 'all' ||
        ['payu', 'stripe', 'esewa'].includes(filter.paymentMethodFilter)
      ) {
        const webhookData = await this.fetchWebhookPaymentData(filter);
        allPaymentData.push(...webhookData);
      }

      // Apply search filtering
      if (filter.searchQuery.trim()) {
        allPaymentData = this.applySearchFilter(allPaymentData, filter.searchQuery);
      }

      // Sort by creation date (newest first)
      allPaymentData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Calculate pagination
      const totalCount = allPaymentData.length;
      const startIndex = (filter.currentPage - 1) * filter.pageSize;
      const endIndex = startIndex + filter.pageSize;
      const paginatedData = allPaymentData.slice(startIndex, endIndex);

      const result: PaymentDataResult = {
        data: paginatedData,
        totalCount,
        filteredCount: totalCount,
        hasNextPage: endIndex < totalCount,
        hasPreviousPage: filter.currentPage > 1
      };

      this.setCache(cacheKey, result);
      logger.info(`Fetched ${paginatedData.length}/${totalCount} payment records`);
      return result;

    } catch (error) {
      logger.error('Failed to fetch payment data:', error);
      return {
        data: [],
        totalCount: 0,
        filteredCount: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(filter?: Partial<PaymentDataFilter>): Promise<PaymentStats> {
    try {
      const cacheKey = this.createCacheKey('payment_stats', filter || {});
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached payment stats');
        return cached;
      }

      logger.info('Calculating payment statistics');

      let bankTransferStats = { total: 0, pending: 0, verified: 0, rejected: 0 };
      let webhookStats = { total: 0, pending: 0, verified: 0, rejected: 0 };

      // Get bank transfer stats
      if (!filter?.paymentMethodFilter || 
          filter.paymentMethodFilter === 'all' || 
          filter.paymentMethodFilter === 'bank_transfer') {
        bankTransferStats = await this.getBankTransferStats(filter);
      }

      // Get webhook payment stats
      if (!filter?.paymentMethodFilter ||
          filter.paymentMethodFilter === 'all' ||
          ['payu', 'stripe', 'esewa'].includes(filter.paymentMethodFilter)) {
        webhookStats = await this.getWebhookPaymentStats(filter);
      }

      // Get payment amounts and methods
      const paymentAmounts = await this.getPaymentAmounts(filter);
      const paymentMethods = await this.getTopPaymentMethods(filter);

      const stats: PaymentStats = {
        total: bankTransferStats.total + webhookStats.total,
        pending: bankTransferStats.pending + webhookStats.pending,
        verified: bankTransferStats.verified + webhookStats.verified,
        rejected: bankTransferStats.rejected + webhookStats.rejected,
        totalAmount: paymentAmounts.total,
        averageAmount: paymentAmounts.average,
        topPaymentMethods: paymentMethods
      };

      this.setCache(cacheKey, stats);
      logger.info('Generated payment statistics:', stats);
      return stats;

    } catch (error) {
      logger.error('Failed to get payment stats:', error);
      return {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        totalAmount: 0,
        averageAmount: 0,
        topPaymentMethods: []
      };
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string, paymentType: 'bank_transfer_proof' | 'webhook_payment'): Promise<PaymentProofData | null> {
    try {
      const cacheKey = this.createCacheKey('payment_by_id', { paymentId, paymentType });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached payment by ID');
        return cached;
      }

      let payment: PaymentProofData | null = null;

      if (paymentType === 'bank_transfer_proof') {
        payment = await this.getBankTransferById(paymentId);
      } else {
        payment = await this.getWebhookPaymentById(paymentId);
      }

      this.setCache(cacheKey, payment);
      return payment;

    } catch (error) {
      logger.error('Failed to get payment by ID:', error);
      return null;
    }
  }

  /**
   * Fetch bank transfer data
   */
  private async fetchBankTransferData(filter: PaymentDataFilter): Promise<PaymentProofData[]> {
    let messagesQuery = supabase
      .from('messages')
      .select('*')
      .eq('message_type', 'payment_proof')
      .order('created_at', { ascending: false });

    if (filter.statusFilter !== 'all') {
      messagesQuery = messagesQuery.eq('verification_status', filter.statusFilter);
    }

    if (filter.dateRange.from && filter.dateRange.to) {
      messagesQuery = messagesQuery
        .gte('created_at', filter.dateRange.from.toISOString())
        .lte('created_at', filter.dateRange.to.toISOString());
    }

    const { data: messages, error: messagesError } = await messagesQuery;
    if (messagesError) throw messagesError;

    if (!messages || messages.length === 0) {
      return [];
    }

    // Get unique quote IDs and sender IDs
    const quoteIds = [...new Set(messages.map(m => m.quote_id).filter(Boolean))];
    const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))];

    // Fetch quotes data
    let quotesData: Tables<'quotes'>[] = [];
    if (quoteIds.length > 0) {
      const { data } = await supabase
        .from('quotes_v2')
        .select(
          'id, order_display_id, final_total_origincurrency, destination_currency, payment_method, payment_status, email, amount_paid, user_id'
        )
        .in('id', quoteIds);
      quotesData = data || [];
    }

    // Fetch profiles data
    let profilesData: Tables<'profiles'>[] = [];
    if (senderIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);
      profilesData = data || [];
    }

    // Create lookup maps
    const quotesMap = new Map(quotesData.map(q => [q.id, q]));
    const profilesMap = new Map(profilesData.map(p => [p.id, p]));

    // Transform bank transfer data
    return messages.map(item => {
      const quote = quotesMap.get(item.quote_id);
      const profile = profilesMap.get(item.sender_id);

      return {
        id: item.id,
        quote_id: item.quote_id,
        sender_id: item.sender_id,
        attachment_url: item.attachment_url,
        attachment_file_name: item.attachment_file_name,
        created_at: item.created_at,
        verification_status: item.verification_status,
        admin_notes: item.admin_notes,
        verified_at: item.verified_at,
        verified_by: item.verified_by,
        // Joined data
        order_display_id: quote?.order_display_id || 'N/A',
        final_total_origincurrency: quote?.final_total_origincurrency || 0,
        destination_currency: quote?.destination_currency || 'USD',
        payment_method: quote?.payment_method || 'bank_transfer',
        payment_status: quote?.payment_status || 'unpaid',
        customer_email: quote?.email || 'N/A',
        customer_name: profile?.full_name || 'Unknown Customer',
        amount_paid: quote?.amount_paid || 0,
        // Payment type indicator
        payment_type: 'bank_transfer_proof' as const
      };
    });
  }

  /**
   * Fetch webhook payment data
   */
  private async fetchWebhookPaymentData(filter: PaymentDataFilter): Promise<PaymentProofData[]> {
    let transactionsQuery = supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by specific gateway if not 'all'
    if (filter.paymentMethodFilter !== 'all') {
      transactionsQuery = transactionsQuery.eq('payment_method', filter.paymentMethodFilter);
    }

    // Map status for webhook payments
    if (filter.statusFilter !== 'all') {
      const webhookStatusMap = {
        pending: 'pending',
        verified: 'completed',
        rejected: 'failed'
      };
      const mappedStatus = webhookStatusMap[filter.statusFilter as keyof typeof webhookStatusMap];
      if (mappedStatus) {
        transactionsQuery = transactionsQuery.eq('status', mappedStatus);
      }
    }

    if (filter.dateRange.from && filter.dateRange.to) {
      transactionsQuery = transactionsQuery
        .gte('created_at', filter.dateRange.from.toISOString())
        .lte('created_at', filter.dateRange.to.toISOString());
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery;
    if (transactionsError) throw transactionsError;

    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Get unique quote IDs and user IDs
    const quoteIds = [...new Set(transactions.map(t => t.quote_id).filter(Boolean))];
    const userIds = [...new Set(transactions.map(t => t.user_id).filter(Boolean))];

    // Fetch quotes data
    let quotesData: Tables<'quotes'>[] = [];
    if (quoteIds.length > 0) {
      const { data } = await supabase
        .from('quotes_v2')
        .select(
          'id, order_display_id, final_total_origincurrency, destination_currency, payment_method, payment_status, email, amount_paid, user_id'
        )
        .in('id', quoteIds);
      quotesData = data || [];
    }

    // Fetch profiles data
    let profilesData: Tables<'profiles'>[] = [];
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profilesData = data || [];
    }

    // Create lookup maps
    const quotesMap = new Map(quotesData.map(q => [q.id, q]));
    const profilesMap = new Map(profilesData.map(p => [p.id, p]));

    // Transform webhook payment data
    return transactions.map(item => {
      const quote = quotesMap.get(item.quote_id);
      const profile = profilesMap.get(item.user_id);

      // Map webhook status to verification status
      const getVerificationStatus = (status: string) => {
        switch (status) {
          case 'completed':
            return 'verified';
          case 'failed':
            return 'rejected';
          default:
            return 'pending';
        }
      };

      return {
        id: item.id,
        quote_id: item.quote_id,
        sender_id: item.user_id,
        attachment_url: '', // Webhook payments don't have attachments
        attachment_file_name: '',
        created_at: item.created_at,
        verification_status: getVerificationStatus(item.status),
        admin_notes: null,
        verified_at: item.status === 'completed' ? item.updated_at : null,
        verified_by: null, // Auto-verified
        // Joined data
        order_display_id: quote?.order_display_id || 'N/A',
        final_total_origincurrency: quote?.final_total_origincurrency || 0,
        destination_currency: quote?.destination_currency || 'USD',
        payment_method: item.payment_method || 'webhook',
        payment_status: quote?.payment_status || 'unpaid',
        customer_email: quote?.email || 'N/A',
        customer_name: profile?.full_name || 'Unknown Customer',
        amount_paid: item.amount || 0,
        // Payment type indicator
        payment_type: 'webhook_payment' as const,
        // Webhook-specific fields
        transaction_id: item.transaction_id,
        gateway_response: item.gateway_response as Record<string, unknown>,
        gateway_name: item.payment_method
      };
    });
  }

  /**
   * Apply search filter to payment data
   */
  private applySearchFilter(data: PaymentProofData[], searchQuery: string): PaymentProofData[] {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return data;

    return data.filter(payment => 
      payment.order_display_id.toLowerCase().includes(query) ||
      payment.customer_email.toLowerCase().includes(query) ||
      payment.customer_name.toLowerCase().includes(query) ||
      payment.payment_method.toLowerCase().includes(query) ||
      (payment.transaction_id && payment.transaction_id.toLowerCase().includes(query)) ||
      (payment.admin_notes && payment.admin_notes.toLowerCase().includes(query))
    );
  }

  /**
   * Get bank transfer statistics
   */
  private async getBankTransferStats(filter?: Partial<PaymentDataFilter>) {
    let query = supabase
      .from('messages')
      .select('verification_status')
      .eq('message_type', 'payment_proof');

    if (filter?.dateRange?.from && filter?.dateRange?.to) {
      query = query
        .gte('created_at', filter.dateRange.from.toISOString())
        .lte('created_at', filter.dateRange.to.toISOString());
    }

    const { data: allProofs, error } = await query;
    
    if (error || !allProofs) {
      return { total: 0, pending: 0, verified: 0, rejected: 0 };
    }

    return {
      total: allProofs.length,
      pending: allProofs.filter(p => !p.verification_status || p.verification_status === 'pending').length,
      verified: allProofs.filter(p => p.verification_status === 'verified').length,
      rejected: allProofs.filter(p => p.verification_status === 'rejected').length
    };
  }

  /**
   * Get webhook payment statistics
   */
  private async getWebhookPaymentStats(filter?: Partial<PaymentDataFilter>) {
    let query = supabase
      .from('payment_transactions')
      .select('status, payment_method');

    if (filter?.paymentMethodFilter && filter.paymentMethodFilter !== 'all' && filter.paymentMethodFilter !== 'bank_transfer') {
      query = query.eq('payment_method', filter.paymentMethodFilter);
    }

    if (filter?.dateRange?.from && filter?.dateRange?.to) {
      query = query
        .gte('created_at', filter.dateRange.from.toISOString())
        .lte('created_at', filter.dateRange.to.toISOString());
    }

    const { data: allTransactions, error } = await query;

    if (error || !allTransactions) {
      return { total: 0, pending: 0, verified: 0, rejected: 0 };
    }

    return {
      total: allTransactions.length,
      pending: allTransactions.filter(t => t.status === 'pending').length,
      verified: allTransactions.filter(t => t.status === 'completed').length,
      rejected: allTransactions.filter(t => t.status === 'failed').length
    };
  }

  /**
   * Get payment amounts statistics
   */
  private async getPaymentAmounts(filter?: Partial<PaymentDataFilter>) {
    try {
      // Get amounts from quotes that have payments
      let query = supabase
        .from('quotes_v2')
        .select('final_total_origincurrency, amount_paid')
        .gt('amount_paid', 0);

      if (filter?.dateRange?.from && filter?.dateRange?.to) {
        query = query
          .gte('updated_at', filter.dateRange.from.toISOString())
          .lte('updated_at', filter.dateRange.to.toISOString());
      }

      const { data: paidQuotes } = await query;

      if (!paidQuotes || paidQuotes.length === 0) {
        return { total: 0, average: 0 };
      }

      const total = paidQuotes.reduce((sum, quote) => sum + (quote.amount_paid || 0), 0);
      const average = total / paidQuotes.length;

      return { total, average };

    } catch (error) {
      logger.warn('Failed to get payment amounts:', error);
      return { total: 0, average: 0 };
    }
  }

  /**
   * Get top payment methods
   */
  private async getTopPaymentMethods(filter?: Partial<PaymentDataFilter>) {
    try {
      // Aggregate from both bank transfers and webhook payments
      const methods = new Map<string, { count: number; totalAmount: number }>();

      // Get bank transfer methods
      const { data: bankTransfers } = await supabase
        .from('messages')
        .select('quote_id')
        .eq('message_type', 'payment_proof')
        .eq('verification_status', 'verified');

      if (bankTransfers) {
        const quoteIds = bankTransfers.map(bt => bt.quote_id).filter(Boolean);
        if (quoteIds.length > 0) {
          const { data: quotes } = await supabase
            .from('quotes_v2')
            .select('payment_method, amount_paid')
            .in('id', quoteIds);

          if (quotes) {
            quotes.forEach(quote => {
              const method = quote.payment_method || 'bank_transfer';
              const amount = quote.amount_paid || 0;
              const existing = methods.get(method) || { count: 0, totalAmount: 0 };
              methods.set(method, {
                count: existing.count + 1,
                totalAmount: existing.totalAmount + amount
              });
            });
          }
        }
      }

      // Get webhook payment methods
      const { data: webhookPayments } = await supabase
        .from('payment_transactions')
        .select('payment_method, amount')
        .eq('status', 'completed');

      if (webhookPayments) {
        webhookPayments.forEach(payment => {
          const method = payment.payment_method || 'webhook';
          const amount = payment.amount || 0;
          const existing = methods.get(method) || { count: 0, totalAmount: 0 };
          methods.set(method, {
            count: existing.count + 1,
            totalAmount: existing.totalAmount + amount
          });
        });
      }

      // Convert to array and sort by count
      return Array.from(methods.entries())
        .map(([method, stats]) => ({
          method,
          count: stats.count,
          totalAmount: stats.totalAmount
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 methods

    } catch (error) {
      logger.warn('Failed to get top payment methods:', error);
      return [];
    }
  }

  /**
   * Get bank transfer by ID
   */
  private async getBankTransferById(paymentId: string): Promise<PaymentProofData | null> {
    const { data: message, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', paymentId)
      .eq('message_type', 'payment_proof')
      .single();

    if (error || !message) {
      return null;
    }

    // Get related quote and profile data
    const [{ data: quote }, { data: profile }] = await Promise.all([
      supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', message.quote_id)
        .single(),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', message.sender_id)
        .single()
    ]);

    return {
      id: message.id,
      quote_id: message.quote_id,
      sender_id: message.sender_id,
      attachment_url: message.attachment_url,
      attachment_file_name: message.attachment_file_name,
      created_at: message.created_at,
      verification_status: message.verification_status,
      admin_notes: message.admin_notes,
      verified_at: message.verified_at,
      verified_by: message.verified_by,
      order_display_id: quote?.order_display_id || 'N/A',
      final_total_origincurrency: quote?.final_total_origincurrency || 0,
      destination_currency: quote?.destination_currency || 'USD',
      payment_method: quote?.payment_method || 'bank_transfer',
      payment_status: quote?.payment_status || 'unpaid',
      customer_email: quote?.email || 'N/A',
      customer_name: profile?.full_name || 'Unknown Customer',
      amount_paid: quote?.amount_paid || 0,
      payment_type: 'bank_transfer_proof' as const
    };
  }

  /**
   * Get webhook payment by ID
   */
  private async getWebhookPaymentById(paymentId: string): Promise<PaymentProofData | null> {
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !transaction) {
      return null;
    }

    // Get related quote and profile data
    const [{ data: quote }, { data: profile }] = await Promise.all([
      supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', transaction.quote_id)
        .single(),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', transaction.user_id)
        .single()
    ]);

    const getVerificationStatus = (status: string) => {
      switch (status) {
        case 'completed': return 'verified';
        case 'failed': return 'rejected';
        default: return 'pending';
      }
    };

    return {
      id: transaction.id,
      quote_id: transaction.quote_id,
      sender_id: transaction.user_id,
      attachment_url: '',
      attachment_file_name: '',
      created_at: transaction.created_at,
      verification_status: getVerificationStatus(transaction.status),
      admin_notes: null,
      verified_at: transaction.status === 'completed' ? transaction.updated_at : null,
      verified_by: null,
      order_display_id: quote?.order_display_id || 'N/A',
      final_total_origincurrency: quote?.final_total_origincurrency || 0,
      destination_currency: quote?.destination_currency || 'USD',
      payment_method: transaction.payment_method || 'webhook',
      payment_status: quote?.payment_status || 'unpaid',
      customer_email: quote?.email || 'N/A',
      customer_name: profile?.full_name || 'Unknown Customer',
      amount_paid: transaction.amount || 0,
      payment_type: 'webhook_payment' as const,
      transaction_id: transaction.transaction_id,
      gateway_response: transaction.gateway_response as Record<string, unknown>,
      gateway_name: transaction.payment_method
    };
  }

  /**
   * Cache management
   */
  private createCacheKey(prefix: string, params: any = {}): string {
    const keyParts = [prefix];
    
    Object.keys(params)
      .sort()
      .forEach(key => {
        const value = params[key];
        if (typeof value === 'object' && value !== null) {
          keyParts.push(`${key}:${JSON.stringify(value)}`);
        } else {
          keyParts.push(`${key}:${value}`);
        }
      });

    return keyParts.join('|');
  }

  private getFromCache(key: string): any | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.dataCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear payment data cache
   */
  clearCache(): void {
    this.dataCache.clear();
    logger.info('Payment data cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.dataCache.size,
      entries: Array.from(this.dataCache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.dataCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.dataCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired payment data cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('PaymentDataService disposed');
  }
}

export default PaymentDataService;