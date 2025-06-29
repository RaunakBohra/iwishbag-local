
export const formatAmountForDisplay = (
  amount: number | null | undefined,
  currency: string = 'USD',
  exchangeRate: number = 1,
  options?: Intl.NumberFormatOptions
): string => {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  // Convert amount using exchange rate (amount is in USD, convert to target currency)
  const convertedAmount = amount * exchangeRate;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    ...options
  }).format(convertedAmount);
};
