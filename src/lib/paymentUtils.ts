import { supabase } from '@/integrations/supabase/client';

export interface PaymentSummary {
  finalTotal: number;
  totalPaid: number;
  remaining: number;
  overpaidAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  isOverpaid: boolean;
  percentagePaid: number;
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
 * Calculate payment summary for a quote
 */
export async function calculatePaymentSummary(quoteId: string, finalTotal: number): Promise<PaymentSummary> {
  try {
    // Fetch payment ledger
    const { data: paymentLedger, error } = await supabase
      .from('payment_ledger')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment ledger:', error);
      // Fallback to payment_transactions
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('status', 'completed');

      const totalPaid = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0) || 0;
      return calculateSummary(finalTotal, totalPaid);
    }

    const totalPaid = paymentLedger?.reduce((sum, entry) => {
      const type = entry.transaction_type || entry.payment_type;
      const amount = parseFloat(entry.amount) || 0;
      
      // Handle different payment types
      if (type === 'payment' || type === 'customer_payment' || 
          (entry.status === 'completed' && !type)) {
        return sum + amount;
      }
      if (type === 'refund' || type === 'partial_refund') {
        return sum - amount;
      }
      return sum;
    }, 0) || 0;

    return calculateSummary(finalTotal, totalPaid);
  } catch (error) {
    console.error('Error calculating payment summary:', error);
    return calculateSummary(finalTotal, 0);
  }
}

/**
 * Helper function to calculate payment summary from totals
 */
function calculateSummary(finalTotal: number, totalPaid: number): PaymentSummary {
  const remaining = Math.max(0, finalTotal - totalPaid);
  const status = remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
  const isOverpaid = totalPaid > finalTotal;

  return {
    finalTotal,
    totalPaid,
    remaining,
    overpaidAmount: isOverpaid ? totalPaid - finalTotal : 0,
    status,
    isOverpaid,
    percentagePaid: finalTotal > 0 ? (totalPaid / finalTotal) * 100 : 0,
  };
}

/**
 * Detect if there's a due amount when order value changes
 */
export async function detectDueAmount(quoteId: string, oldTotal: number, newTotal: number): Promise<DueAmountInfo> {
  const changeAmount = newTotal - oldTotal;
  const changeType = changeAmount > 0 ? 'increase' : changeAmount < 0 ? 'decrease' : 'none';
  
  if (changeAmount === 0) {
    return {
      hasDueAmount: false,
      dueAmount: 0,
      oldTotal,
      newTotal,
      changeAmount: 0,
      changeType: 'none'
    };
  }

  // Get current payment status
  const paymentSummary = await calculatePaymentSummary(quoteId, newTotal);
  
  return {
    hasDueAmount: paymentSummary.remaining > 0,
    dueAmount: paymentSummary.remaining,
    oldTotal,
    newTotal,
    changeAmount,
    changeType
  };
}

/**
 * Check if payment link should be automatically generated
 */
export function shouldGeneratePaymentLink(dueInfo: DueAmountInfo, autoThreshold: number = 0): boolean {
  return dueInfo.hasDueAmount && 
         dueInfo.dueAmount > autoThreshold && 
         dueInfo.changeType === 'increase';
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
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'NPR': 'Rs.',
    'CAD': 'C$',
    'AUD': 'A$',
    'SGD': 'S$',
  };
  
  return symbols[currency] || currency + ' ';
}

/**
 * Get customer information from quote for payment link
 */
export function extractCustomerInfo(quote: any) {
  return {
    name: quote.shipping_address?.fullName || 
          quote.shipping_address?.name || 
          quote.profiles?.full_name ||
          quote.user?.full_name || 
          quote.customer_name || 
          '',
    email: quote.shipping_address?.email || 
           quote.profiles?.email ||
           quote.user?.email || 
           quote.email ||
           quote.customer_email || 
           '',
    phone: quote.shipping_address?.phone || 
           quote.profiles?.phone ||
           quote.user?.phone || 
           quote.customer_phone || 
           ''
  };
}

/**
 * Validate minimum payment amount for currency
 */
export function validatePaymentAmount(amount: number, currency: string): { valid: boolean; message?: string } {
  const minimums: { [key: string]: number } = {
    'USD': 1,
    'INR': 1,
    'EUR': 1,
    'GBP': 1,
    'NPR': 10,
    'CAD': 1,
    'AUD': 1,
    'SGD': 1,
  };

  const minimum = minimums[currency] || 1;
  
  if (amount < minimum) {
    return {
      valid: false,
      message: `Minimum payment amount is ${getCurrencySymbol(currency)}${minimum} ${currency}`
    };
  }

  return { valid: true };
}