/**
 * Admin-specific currency formatting utilities
 * Consistent formatting patterns for admin interface
 */

/**
 * Format currency amount for compact displays (metrics, cards)
 * Uses K/M suffixes for space efficiency
 */
export const formatCurrencyCompact = (amount: number, currency = 'USD'): string => {
  const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency === 'NPR' ? 'रू' : currency;
  
  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return `${symbol}${amount.toFixed(0)}`;
};

/**
 * Format currency amount for admin displays
 * Full precision for detailed views
 */
export const formatCurrencyAdmin = (amount: number, currency = 'USD'): string => {
  const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency === 'NPR' ? 'रू' : currency;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format percentage for admin displays
 * Consistent decimal places and % symbol
 */
export const formatPercentageAdmin = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Calculate and format change percentage
 * Returns formatted string with + or - prefix and color indication
 */
export const formatChangePercentage = (
  current: number,
  previous: number
): { change: string; type: 'positive' | 'negative' | 'neutral' } => {
  if (previous === 0) return { change: 'N/A', type: 'neutral' };

  const percentage = ((current - previous) / previous) * 100;
  const sign = percentage > 0 ? '+' : '';

  return {
    change: `${sign}${percentage.toFixed(1)}%`,
    type: percentage > 0 ? 'positive' : percentage < 0 ? 'negative' : 'neutral',
  };
};