import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { 
  getShippingRoutes, 
  upsertShippingRoute, 
  deleteShippingRoute,
  getAutoQuoteSettings,
  getShippingCost,
  calculateUnifiedQuote
} from '../lib/unified-shipping-calculator';
import type { 
  ShippingRoute, 
  AutoQuoteSettings,
  ShippingRouteFormData,
  AutoQuoteSettingsFormData,
  UnifiedQuoteInput,
  UnifiedQuoteResult
} from '../types/shipping';

/**
 * Hook for managing shipping routes
 */
export function useShippingRoutes() {
  const [routes, setRoutes] = useState<ShippingRoute[]>([]);
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
    removeRoute
  };
}

/**
 * Hook for managing auto quote settings
 */
export function useAutoQuoteSettings() {
  const [settings, setSettings] = useState<AutoQuoteSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('auto_quote_settings')
        .select('*')
        .order('country_code', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setSettings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auto quote settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (countryCode: string, settingsData: Partial<AutoQuoteSettingsFormData>) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('auto_quote_settings')
        .upsert({ country_code: countryCode, ...settingsData }, { onConflict: 'country_code' });

      if (updateError) {
        throw new Error(updateError.message);
      }

      await fetchSettings();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const getSettingsForCountry = async (countryCode: string) => {
    try {
      return await getAutoQuoteSettings(countryCode);
    } catch (err) {
      console.error('Error getting settings for country:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    getSettingsForCountry
  };
}

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
    price: number = 0
  ) => {
    try {
      setLoading(true);
      setError(null);
      return await getShippingCost(originCountry, destinationCountry, weight, price);
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
      return await calculateUnifiedQuote(input);
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
    calculateQuote
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

        const uniqueCountries = [...new Set(data?.map(route => route.origin_country) || [])];
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

        const uniqueCountries = [...new Set(data?.map(route => route.destination_country) || [])];
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

/**
 * Fetch a single shipping route by ID
 */
export async function getShippingRouteById(routeId: string | number) {
  const { data, error } = await supabase
    .from('shipping_routes')
    .select('*')
    .eq('id', routeId)
    .single();
  if (error) throw new Error(error.message);
  return data;
} 