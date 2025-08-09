import { currencyService, formatAmount } from '@/services/CurrencyService';

/**
 * Order Currency Display Utilities
 * Handles proper currency formatting for order detail pages with customer payment context
 */

export interface OrderCurrencyContext {
  paymentCurrency: string;
  paymentAmount?: number;
  referenceCurrency?: string;
  referenceAmount?: number;
  exchangeRate?: number;
  paymentGateway?: string;
  paidAt?: string;
}

export interface FormattedOrderAmount {
  customer: string;          // What customer paid: "₹12,450.00"
  reference?: string;        // Business reference: "$149.55"
  context?: string;         // Gateway context: "via PayU India"
  dualDisplay?: string;     // Combined: "₹12,450.00 (~$149.55)"
}

/**
 * Format amount for order display - shows customer payment currency primarily
 */
export function formatOrderAmount(
  amount: number, 
  context: OrderCurrencyContext
): FormattedOrderAmount {
  const result: FormattedOrderAmount = {
    customer: formatAmount(amount, context.paymentCurrency)
  };

  // Add reference currency if different
  if (context.referenceCurrency && 
      context.referenceCurrency !== context.paymentCurrency && 
      context.referenceAmount) {
    result.reference = formatAmount(context.referenceAmount, context.referenceCurrency);
    result.dualDisplay = `${result.customer} (~${result.reference})`;
  }

  // Add payment gateway context
  if (context.paymentGateway && context.paidAt) {
    const gatewayNames = {
      'payu_india': 'PayU India',
      'esewa': 'eSewa',
      'fonepay': 'Fonepay',
      'stripe_us': 'Stripe',
      'khalti': 'Khalti',
      'airwallex': 'Airwallex',
    } as const;

    const gatewayName = gatewayNames[context.paymentGateway as keyof typeof gatewayNames] || 
                       context.paymentGateway;
    
    result.context = `via ${gatewayName}`;
  }

  return result;
}

/**
 * Get currency context from order data
 */
export function getOrderCurrencyContext(order: any): OrderCurrencyContext {
  const paymentCurrency = order.currency || 
                         order.profiles?.preferred_display_currency || 
                         'USD';

  return {
    paymentCurrency,
    paymentAmount: order.current_order_total,
    referenceCurrency: paymentCurrency !== 'USD' ? 'USD' : undefined,
    referenceAmount: order.reference_usd_amount || order.current_order_total,
    exchangeRate: order.exchange_rate_at_payment,
    paymentGateway: order.payment_gateway,
    paidAt: order.paid_at
  };
}

/**
 * Format price variance with proper sign and color indication
 */
export function formatPriceVariance(
  variance: number, 
  currency: string
): {
  formatted: string;
  colorClass: string;
  isIncrease: boolean;
} {
  const isIncrease = variance > 0;
  const absVariance = Math.abs(variance);
  
  return {
    formatted: `${isIncrease ? '+' : '-'}${formatAmount(absVariance, currency)}`,
    colorClass: isIncrease ? 'text-red-600' : 'text-green-600',
    isIncrease
  };
}

/**
 * Format business metrics for admin view
 */
export function formatBusinessMetrics(order: any): {
  customerRevenue: FormattedOrderAmount;
  profitMargin?: string;
  marginPercent?: string;
  costBasis?: string;
} {
  const context = getOrderCurrencyContext(order);
  const customerRevenue = formatOrderAmount(order.current_order_total || 0, context);

  const result: any = { customerRevenue };

  if (order.total_cost_usd && context.referenceAmount) {
    const profit = context.referenceAmount - order.total_cost_usd;
    const marginPercent = context.referenceAmount > 0 
      ? (profit / context.referenceAmount * 100).toFixed(1) 
      : '0.0';

    result.profitMargin = formatAmount(profit, 'USD');
    result.marginPercent = `${marginPercent}%`;
    result.costBasis = formatAmount(order.total_cost_usd, 'USD');
  }

  return result;
}

/**
 * Format payment gateway display name
 */
export function formatPaymentGateway(gateway?: string): string {
  if (!gateway) return 'Unknown Gateway';

  const gatewayDisplayNames = {
    'payu_india': 'PayU India',
    'esewa': 'eSewa Nepal',
    'fonepay': 'Fonepay Nepal',
    'stripe_us': 'Stripe',
    'stripe_in': 'Stripe India',
    'khalti': 'Khalti Nepal',
    'airwallex': 'Airwallex',
    'bank_transfer': 'Bank Transfer',
  } as const;

  return gatewayDisplayNames[gateway as keyof typeof gatewayDisplayNames] || 
         gateway.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get currency symbol for quick display
 */
export function getCurrencySymbol(currencyCode: string): string {
  return currencyService.getCurrencySymbol(currencyCode);
}

/**
 * Format exchange rate context for display
 */
export function formatExchangeRateContext(order: any): string {
  const context = getOrderCurrencyContext(order);
  
  if (!context.exchangeRate || context.paymentCurrency === 'USD') {
    return '';
  }

  return `Rate: ${context.exchangeRate} ${context.paymentCurrency}/USD (locked at payment)`;
}

/**
 * Format date context for payment
 */
export function formatPaymentDate(dateString?: string): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Check if order uses multi-currency display
 */
export function shouldShowDualCurrency(order: any): boolean {
  const context = getOrderCurrencyContext(order);
  return !!(context.referenceCurrency && 
           context.referenceCurrency !== context.paymentCurrency &&
           context.referenceAmount);
}