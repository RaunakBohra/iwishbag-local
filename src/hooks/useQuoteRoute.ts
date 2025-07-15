import { useState, useEffect } from 'react';
import { RouteService } from '@/services/RouteService';

interface RouteInfo {
  origin: string;
  destination: string;
}

/**
 * Unified hook to get quote route information
 * This ensures consistent route determination across all components
 */
export function useQuoteRoute(quote: Record<string, unknown> | null): RouteInfo | null {
  const [route, setRoute] = useState<RouteInfo | null>(null);

  useEffect(() => {
    if (!quote) {
      setRoute(null);
      return;
    }

    async function fetchRoute() {
      try {
        const routeInfo = await RouteService.getQuoteRoute(quote);
        setRoute(routeInfo);
      } catch (error) {
        console.error('Error fetching quote route:', error);
        // Fallback to basic route info
        setRoute({
          origin: quote.origin_country || 'US',
          destination: quote.destination_country || ''
        });
      }
    }

    fetchRoute();
  }, [quote]);

  return route;
}