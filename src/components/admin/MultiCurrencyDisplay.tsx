import { useDualCurrency } from '@/hooks/useCurrency';

interface MultiCurrencyDisplayProps {
  amount: number;
  currency?: string;
  originCountry?: string;
  destinationCountry?: string;
  className?: string;
}

/**
 * Component for displaying amounts in both USD and destination currency
 * Replacement for deleted component after currency system simplification
 */
export const MultiCurrencyDisplay = ({
  amount,
  currency = 'USD',
  originCountry,
  destinationCountry,
  className,
}: MultiCurrencyDisplayProps) => {
  const { formatDualAmount } = useDualCurrency(currency, originCountry, destinationCountry);

  return <span className={className}>{formatDualAmount(amount)}</span>;
};
