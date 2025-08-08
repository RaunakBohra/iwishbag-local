import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';

export interface PaymentSummary {
  finalTotal: number; // Local currency amount (for display)
  finalTotalUsd: number; // USD amount (for reconciliation)
  totalPaid: number; // Local currency amount paid
  totalPaidUsd: number; // USD equivalent of all payments (for reconciliation)
  remaining: number; // Remaining in local currency
  remainingUsd: number; // Remaining in USD
  overpaidAmount: number; // Overpaid in local currency
  overpaidAmountUsd: number; // Overpaid in USD
  status: 'paid' | 'partial' | 'unpaid';
  isOverpaid: boolean;
  percentagePaid: number;
  currency: string; // Local currency
  exchangeRate: number; // Current exchange rate USD -> local
}

export interface DueAmountInfo {
  hasDueAmount: boolean;
  dueAmount: number;
  oldTotal: number;
  newTotal: number;
  changeAmount: number;
  changeType: 'increase' | 'decrease' | 'none';
}

/**
 * Calculate payment summary with USD reconciliation for a quote
 */
export async function calculatePaymentSummary(
  quoteId: string,
  finalTotal: number,
  finalTotalUsd: number,
  currency: string,
): Promise<PaymentSummary> {
  try {
    // Get current exchange rate for calculations
    const currencyInfo = await currencyService.getAllCurrencies();
    const targetCurrency = currencyInfo.find(c => c.code === currency);
    const exchangeRate = targetCurrency?.rate_from_usd || 1;

    // Fetch payment transactions from consolidated table
    const { data: paymentLedger, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment transactions:', error);
      // Return empty totals if there's an error
      return calculateSummary(
        finalTotal,
        finalTotalUsd,
        0,
        0,
        currency,
        exchangeRate,
      );
    }

    // Handle the case where paymentLedger exists but could be null
    if (!paymentLedger) {
      const totals = { localPaid: 0, usdPaid: 0 };
      return calculateSummary(
        finalTotal,
        finalTotalUsd,
        totals.localPaid,
        totals.usdPaid,
        currency,
        exchangeRate,
      );
    }

    const totals = paymentLedger.reduce(
        (acc, tx) => {
          const localAmount = parseFloat(tx.amount) || 0;

          // Use stored USD equivalent if available, otherwise calculate
          let usdAmount = parseFloat(tx.usd_equivalent) || 0;
          if (!usdAmount && localAmount > 0) {
            const txExchangeRate = parseFloat(tx.exchange_rate_at_payment) || exchangeRate;
            usdAmount = localAmount / txExchangeRate;
          }

          return {
            localPaid: acc.localPaid + localAmount,
            usdPaid: acc.usdPaid + usdAmount,
          };
        },
        { localPaid: 0, usdPaid: 0 },
      );

    return calculateSummary(
      finalTotal,
      finalTotalUsd,
      totals.localPaid,
      totals.usdPaid,
      currency,
      exchangeRate,
    );
      (acc, entry) => {
        const type = entry.transaction_type || entry.payment_type;
        const localAmount = parseFloat(entry.amount) || 0;

        // Calculate USD equivalent if not stored
        let usdAmount = parseFloat(entry.usd_equivalent) || 0;
        if (!usdAmount && localAmount > 0) {
          const entryExchangeRate = parseFloat(entry.exchange_rate_at_payment) || exchangeRate;
          usdAmount = localAmount / entryExchangeRate;
        }

        // Handle different payment types
        if (
          type === 'payment' ||
          type === 'customer_payment' ||
          (entry.status === 'completed' && !type)
        ) {
          return {
            localPaid: acc.localPaid + localAmount,
            usdPaid: acc.usdPaid + usdAmount,
          };
        }
        if (type === 'refund' || type === 'partial_refund') {
          return {
            localPaid: acc.localPaid - localAmount,
            usdPaid: acc.usdPaid - usdAmount,
          };
        }
        return acc;
      },
      { localPaid: 0, usdPaid: 0 },
    );

    return calculateSummary(
      finalTotal,
      finalTotalUsd,
      totals.localPaid,
      totals.usdPaid,
      currency,
      exchangeRate,
    );
  } catch (error) {
    console.error('Error calculating payment summary:', error);
    const fallbackExchangeRate = 1.0;
    return calculateSummary(finalTotal, finalTotalUsd, 0, 0, currency, fallbackExchangeRate);
  }
}

/**
 * Helper function to calculate payment summary from totals with USD reconciliation
 */
function calculateSummary(
  finalTotal: number,
  finalTotalUsd: number,
  totalPaid: number,
  totalPaidUsd: number,
  currency: string,
  exchangeRate: number,
): PaymentSummary {
  // Calculate remaining amounts in both currencies
  const remaining = Math.max(0, finalTotal - totalPaid);
  const remainingUsd = Math.max(0, finalTotalUsd - totalPaidUsd);

  // Use USD amounts for precise payment status determination (avoids exchange rate drift)
  const status = remainingUsd <= 0.01 ? 'paid' : totalPaidUsd > 0.01 ? 'partial' : 'unpaid';
  const isOverpaid = totalPaidUsd > finalTotalUsd + 0.01; // Small tolerance for floating point

  return {
    finalTotal,
    finalTotalUsd,
    totalPaid,
    totalPaidUsd,
    remaining,
    remainingUsd,
    overpaidAmount: isOverpaid ? totalPaid - finalTotal : 0,
    overpaidAmountUsd: isOverpaid ? totalPaidUsd - finalTotalUsd : 0,
    status,
    isOverpaid,
    percentagePaid: finalTotalUsd > 0 ? (totalPaidUsd / finalTotalUsd) * 100 : 0,
    currency,
    exchangeRate,
  };
}

/**
 * Detect if there's a due amount when order value changes
 */
export async function detectDueAmount(
  quoteId: string,
  oldTotal: number,
  newTotal: number,
): Promise<DueAmountInfo> {
  const changeAmount = newTotal - oldTotal;
  const changeType = changeAmount > 0 ? 'increase' : changeAmount < 0 ? 'decrease' : 'none';

  if (changeAmount === 0) {
    return {
      hasDueAmount: false,
      dueAmount: 0,
      oldTotal,
      newTotal,
      changeAmount: 0,
      changeType: 'none',
    };
  }

  // Get current payment status (simplified for backward compatibility)
  // For due amount detection, we need to fetch quote details to get USD amounts
  const { data: quote } = await supabase
    .from('quotes_v2')
    .select('final_total_origincurrency, currency')
    .eq('id', quoteId)
    .single();

  const paymentSummary = await calculatePaymentSummary(
    quoteId,
    newTotal,
    quote?.final_total_origincurrency || newTotal,
    quote?.currency || 'USD',
  );

  return {
    hasDueAmount: paymentSummary.remaining > 0,
    dueAmount: paymentSummary.remaining,
    oldTotal,
    newTotal,
    changeAmount,
    changeType,
  };
}

/**
 * Check if payment link should be automatically generated
 */
export function shouldGeneratePaymentLink(
  dueInfo: DueAmountInfo,
  autoThreshold: number = 0,
): boolean {
  return (
    dueInfo.hasDueAmount && dueInfo.dueAmount > autoThreshold && dueInfo.changeType === 'increase'
  );
}

/**
 * Format due amount message for notifications
 */
export function formatDueAmountMessage(dueInfo: DueAmountInfo, currency: string): string {
  if (!dueInfo.hasDueAmount) {
    return '';
  }

  const symbol = getCurrencySymbol(currency);

  if (dueInfo.changeType === 'increase') {
    return `Order total increased by ${symbol}${Math.abs(dueInfo.changeAmount).toFixed(2)}. Outstanding amount: ${symbol}${dueInfo.dueAmount.toFixed(2)}`;
  } else if (dueInfo.changeType === 'decrease') {
    return `Order total decreased by ${symbol}${Math.abs(dueInfo.changeAmount).toFixed(2)}. Outstanding amount: ${symbol}${dueInfo.dueAmount.toFixed(2)}`;
  }

  return `Outstanding payment: ${symbol}${dueInfo.dueAmount.toFixed(2)}`;
}

/**
 * Get currency symbol helper
 */
function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    NPR: '₨',
    CAD: 'C$',
    AUD: 'A$',
    SGD: 'S$',
  };

  return symbols[currency] || currency + ' ';
}

/**
 * Record payment with USD equivalent for perfect reconciliation
 */
export async function recordPaymentWithUsdEquivalent(
  quoteId: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  transactionId?: string,
): Promise<{ success: boolean; usdEquivalent?: number; error?: string }> {
  try {
    // Get exchange rate for USD equivalent
    const currencyInfo = await currencyService.getAllCurrencies();
    const targetCurrency = currencyInfo.find(c => c.code === currency);
    const exchangeRate = targetCurrency?.rate_from_usd || 1;
    const usdEquivalent = amount / exchangeRate;

    // Record in payment_transactions with USD equivalent
    const { error: transactionError } = await supabase.from('payment_transactions').insert({
      quote_id: quoteId,
      amount: amount.toString(),
      currency,
      usd_equivalent: usdEquivalent,
      exchange_rate_at_payment: exchangeRate,
      local_currency: currency,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    if (transactionError) {
      console.error('Error recording payment transaction:', transactionError);
      return { success: false, error: transactionError.message };
    }

    // No need for separate ledger entry as payment_ledger is consolidated into payment_transactions

    return { success: true, usdEquivalent };
  } catch (error) {
    console.error('Error recording payment with USD equivalent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get customer information from quote for payment link
 */
export function extractCustomerInfo(quote: Record<string, unknown>) {
  return {
    name:
      quote.shipping_address?.fullName ||
      quote.shipping_address?.name ||
      quote.profiles?.full_name ||
      quote.user?.full_name ||
      quote.customer_name ||
      '',
    email:
      quote.shipping_address?.email ||
      quote.profiles?.email ||
      quote.user?.email ||
      quote.email ||
      quote.customer_email ||
      '',
    phone: quote.shipping_address?.phone || quote.user?.phone || quote.customer_phone || '',
  };
}

/**
 * Validate minimum payment amount for currency
 */
export function validatePaymentAmount(
  amount: number,
  currency: string,
): { valid: boolean; message?: string } {
  const minimums: { [key: string]: number } = {
    USD: 1,
    INR: 1,
    EUR: 1,
    GBP: 1,
    NPR: 10,
    CAD: 1,
    AUD: 1,
    SGD: 1,
  };

  const minimum = minimums[currency] || 1;

  if (amount < minimum) {
    return {
      valid: false,
      message: `Minimum payment amount is ${getCurrencySymbol(currency)}${minimum} ${currency}`,
    };
  }

  return { valid: true };
}
