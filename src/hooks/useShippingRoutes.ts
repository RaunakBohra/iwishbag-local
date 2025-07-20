import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import {
  getShippingRoutes,
  upsertShippingRoute,
  deleteShippingRoute,
  getShippingRouteById,
} from '../services/ShippingRoutesService';
import { smartCalculationEngine } from '../services/SmartCalculationEngine';
import type {
  ShippingRoute,
  ShippingRouteDB,
  ShippingRouteFormData,
  UnifiedQuoteInput,
  UnifiedQuoteResult,
} from '../types/shipping';

/**
 * Hook for managing shipping routes
 */
export function useShippingRoutes() {
  const [routes, setRoutes] = useState<ShippingRouteDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getShippingRoutes();
      setRoutes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipping routes');
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async (routeData: ShippingRouteFormData) => {
    try {
      setError(null);
      const result = await upsertShippingRoute(routeData);
      if (result.success) {
        await fetchRoutes();
        return { success: true };
      } else {
        setError(result.error || 'Failed to create route');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create route';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const updateRoute = async (id: number, routeData: Partial<ShippingRouteFormData>) => {
    try {
      setError(null);
      const result = await upsertShippingRoute({ id, ...routeData });
      if (result.success) {
        await fetchRoutes();
        return { success: true };
      } else {
        setError(result.error || 'Failed to update route');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update route';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const removeRoute = async (id: number) => {
    try {
      setError(null);
      const result = await deleteShippingRoute(id);
      if (result.success) {
        await fetchRoutes();
        return { success: true };
      } else {
        setError(result.error || 'Failed to delete route');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete route';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  return {
    routes,
    loading,
    error,
    fetchRoutes,
    createRoute,
    updateRoute,
    removeRoute,
  };
}

// Export individual function for AdminQuoteDetailPage
export { getShippingRouteById };

/**
 * Hook for calculating shipping costs
 */
export function useShippingCalculator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateShipping = async (
    originCountry: string,
    destinationCountry: string,
    weight: number,
    price: number = 0,
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use SmartCalculationEngine to get shipping options
      const mockQuote = {
        id: 'temp',
        items: [{ id: 'temp', price_usd: price, weight_kg: weight, quantity: 1, name: 'temp' }],
        origin_country: originCountry,
        destination_country: destinationCountry,
        currency: 'USD',
        final_total_usd: 0,
        calculation_data: { breakdown: { items_total: price, shipping: 0, customs: 0, taxes: 0, fees: 0, discount: 0 } },
        operational_data: {},
        optimization_score: 0,
      };

      const result = await smartCalculationEngine.calculateWithShippingOptions({
        quote: mockQuote,
        preferences: { speed_priority: 'medium', cost_priority: 'medium', show_all_options: true },
      });

      if (result.success && result.shipping_options.length > 0) {
        return {
          cost: result.shipping_options[0].cost_usd,
          options: result.shipping_options,
        };
      } else {
        throw new Error('No shipping options found');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to calculate shipping';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const calculateQuote = async (input: UnifiedQuoteInput) => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert input to SmartCalculationEngine format
      const quote = {
        id: input.id || 'temp',
        items: input.items,
        origin_country: input.originCountry,
        destination_country: input.destinationCountry,
        currency: input.currency || 'USD',
        final_total_usd: 0,
        calculation_data: { breakdown: { items_total: 0, shipping: 0, customs: 0, taxes: 0, fees: 0, discount: 0 } },
        operational_data: {},
        optimization_score: 0,
      };

      const result = await smartCalculationEngine.calculateWithShippingOptions({
        quote,
        preferences: { speed_priority: 'medium', cost_priority: 'medium', show_all_options: true },
      });

      if (result.success) {
        return {
          success: true,
          quote: result.updated_quote,
          shipping_options: result.shipping_options,
          recommendations: result.smart_recommendations,
        };
      } else {
        throw new Error(result.error || 'Calculation failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to calculate quote';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    calculateShipping,
    calculateQuote,
  };
}

/**
 * Hook for getting available origin countries
 */
export function useOriginCountries() {
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOriginCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('shipping_routes')
          .select('origin_country')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching origin countries:', error);
          return;
        }

        const uniqueCountries = [...new Set(data?.map((route) => route.origin_country) || [])];
        setCountries(uniqueCountries.sort());
      } catch (err) {
        console.error('Error fetching origin countries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOriginCountries();
  }, []);

  return { countries, loading };
}

/**
 * Hook for getting available destination countries
 */
export function useDestinationCountries() {
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDestinationCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('shipping_routes')
          .select('destination_country')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching destination countries:', error);
          return;
        }

        const uniqueCountries = [...new Set(data?.map((route) => route.destination_country) || [])];
        setCountries(uniqueCountries.sort());
      } catch (err) {
        console.error('Error fetching destination countries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDestinationCountries();
  }, []);

  return { countries, loading };
}

