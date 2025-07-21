import { useDualCurrency } from '@/hooks/useCurrency';

/**
 * Hook for admin currency display - shows both USD and destination currency
 * Replacement for deleted hook after currency system simplification
 */
export const useAdminCurrencyDisplay = (quote?: {
  destination_currency?: string;
  origin_country?: string;
  destination_country?: string;
}) => {
  const destinationCurrency = quote?.destination_currency || 'USD';
  const { formatDualAmount } = useDualCurrency(
    destinationCurrency,
    quote?.origin_country,
    quote?.destination_country,
  );

  return {
    formatAmount: formatDualAmount,
    currency: destinationCurrency,
  };
};
