import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAllCountries } from './useAllCountries';
import { getQuoteRouteCountries } from '@/lib/route-specific-customs';
import { extractShippingAddressFromNotes } from '@/lib/addressUpdates';

interface RouteInfo {
  origin: string;
  destination: string;
}

/**
 * Unified hook to get quote route information
 * This ensures consistent route determination across all components
 */
export function useQuoteRoute(quote: any): RouteInfo | null {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const { data: countries } = useAllCountries();

  useEffect(() => {
    if (!quote) {
      setRoute(null);
      return;
    }

    async function fetchRoute() {
      // Extract shipping address from quote
      let shippingAddress = null;
      if (quote.shipping_address) {
        try {
          shippingAddress = typeof quote.shipping_address === 'string'
            ? JSON.parse(quote.shipping_address)
            : quote.shipping_address;
        } catch (e) {
          console.warn('Failed to parse shipping address:', e);
        }
      } else if (quote.internal_notes) {
        shippingAddress = extractShippingAddressFromNotes(quote.internal_notes);
      }

      // Function to fetch route from DB
      const fetchRouteById = async (routeId: string) => {
        const { data } = await supabase
          .from('shipping_routes')
          .select('origin_country, destination_country')
          .eq('id', routeId)
          .single();
        return data;
      };

      // Get route using centralized logic
      const routeInfo = await getQuoteRouteCountries(
        quote,
        shippingAddress,
        countries || [],
        fetchRouteById
      );

      setRoute(routeInfo);
    }

    fetchRoute();
  }, [quote, countries]);

  return route;
}