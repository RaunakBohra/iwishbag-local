/**
 * Hook to extract route information from a quote/order
 * Used for displaying shipping route information
 */
export interface QuoteRoute {
  origin: string;
  destination: string;
}

export const useQuoteRoute = (order: any): QuoteRoute | null => {
  if (!order) return null;

  return {
    origin: order.origin_country || 'US',
    destination: order.destination_country || order.customer_data?.address?.country || 'Unknown'
  };
};