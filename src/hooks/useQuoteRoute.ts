// =============================================
// Quote Route Hook
// =============================================
// Hook to get route information (origin and destination) for quotes/orders.
// Provides shipping route data for display components.
// Created: 2025-07-24
// =============================================

import { useMemo } from 'react';
import { Tables } from '@/integrations/supabase/types';

interface QuoteRoute {
  origin: string;
  destination: string;
}

/**
 * Hook to get route information for a quote/order
 */
export const useQuoteRoute = (quote?: Tables<'quotes'> | null): QuoteRoute => {
  const route = useMemo(() => {
    if (!quote) {
      return {
        origin: 'Unknown',
        destination: 'Unknown',
      };
    }

    // Get origin country from quote data
    // Priority: origin_country -> 'US' (default for most international shopping)
    const origin = quote.origin_country || 'US';

    // Get destination country from quote data
    // Priority: destination_country -> shipping_address country -> 'IN' (default)
    let destination = quote.destination_country;

    if (!destination && quote.shipping_address) {
      try {
        const shippingAddress =
          typeof quote.shipping_address === 'string'
            ? JSON.parse(quote.shipping_address)
            : quote.shipping_address;
        destination = shippingAddress?.country;
      } catch (error) {
        console.warn('Failed to parse shipping address:', error);
      }
    }

    // Default to India if no destination found
    destination = destination || 'IN';

    return {
      origin,
      destination,
    };
  }, [quote]);

  return route;
};
