import { supabase } from '@/integrations/supabase/client';

// Delhivery API configuration
const DELHIVERY_CONFIG = {
  api_token: '60de581101a9fac9e8194662a7deecb2c71d0d09',
  base_url: 'https://track.delhivery.com/api',
  client_name: '8cf872-iWBnterprises-do',
  pickup_location: {
    name: 'iwishBag Warehouse',
    address: '16/194 Faiz Road, Karol Bagh, Gully 7, New Delhi, India',
    pincode: '110005',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India'
  },
  markup_percentage: 15, // 15% markup on Delhivery rates
  cache_duration: 300 // 5 minutes cache
};

// Delhivery service types mapping
const SERVICE_TYPE_MAPPING = {
  standard: 'S', // Surface
  express: 'E',  // Express
  same_day: 'X'  // Same day (if available)
};

interface DelhiveryRateRequest {
  destination_pincode: string;
  weight: number; // in kg
  cod: boolean;
  service_type?: 'standard' | 'express' | 'same_day';
}

interface DelhiveryRateResponse {
  service_type: string;
  rate: number; // in INR
  estimated_days: number;
  service_name: string;
  available: boolean;
  error?: string;
}

interface DelhiveryMultiRateResponse {
  rates: DelhiveryRateResponse[];
  currency: 'INR';
  markup_applied: number;
  original_total: number;
  final_total: number;
  cache_used: boolean;
}

interface DelhiveryServiceOption {
  value: string;
  label: string;
  rate: number;
  estimated_days: number;
  available: boolean;
  description: string;
}

class DelhiveryService {
  private static instance: DelhiveryService;
  private cache = new Map<string, { data: any; timestamp: number }>();

  static getInstance(): DelhiveryService {
    if (!DelhiveryService.instance) {
      DelhiveryService.instance = new DelhiveryService();
    }
    return DelhiveryService.instance;
  }

  /**
   * Get delivery rates for multiple service types via Supabase Edge Function
   */
  async getDeliveryRates(request: DelhiveryRateRequest): Promise<DelhiveryMultiRateResponse> {
    console.log('🚚 [Delhivery] Getting rates via Edge Function for:', request);

    const cacheKey = `rates_${request.destination_pincode}_${request.weight}_${request.cod}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 [Delhivery] Using cached rates');
      return { ...cached, cache_used: true };
    }

    try {
      // Call Supabase Edge Function instead of direct API call
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('🚚 [Delhivery] Calling Edge Function with request:', request);
      
      const { data, error } = await supabase.functions.invoke('delhivery-rates', {
        body: {
          destination_pincode: request.destination_pincode,
          weight: request.weight,
          cod: request.cod || false,
          service_type: request.service_type || 'standard'
        }
      });

      if (error) {
        console.error('❌ [Delhivery] Edge Function error:', error);
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from Edge Function');
      }

      console.log('✅ [Delhivery] Edge Function response:', data);

      // Cache the response
      this.setCache(cacheKey, data);

      return data as DelhiveryMultiRateResponse;

    } catch (error) {
      console.error('❌ [Delhivery] Edge Function call failed:', error);
      
      // Return fallback rates
      return this.getFallbackRates(request);
    }
  }

  // Note: getSingleRate method removed - now using Supabase Edge Function to avoid CORS

  /**
   * Get fallback rates when API fails
   */
  private getFallbackRates(request: DelhiveryRateRequest): DelhiveryMultiRateResponse {
    console.log('🔄 [Delhivery] Using fallback rates');
    
    const baseRate = this.getFallbackRate('standard');
    const expressRate = this.getFallbackRate('express');

    return {
      rates: [
        {
          service_type: 'standard',
          rate: baseRate,
          estimated_days: 3,
          service_name: 'Standard Delivery',
          available: false,
          error: 'Using fallback rate (API unavailable)'
        },
        {
          service_type: 'express',
          rate: expressRate,
          estimated_days: 1,
          service_name: 'Express Delivery',
          available: false,
          error: 'Using fallback rate (API unavailable)'
        }
      ],
      currency: 'INR',
      markup_applied: 0, // No markup on fallback
      original_total: baseRate + expressRate,
      final_total: baseRate + expressRate,
      cache_used: false
    };
  }

  /**
   * Get fallback rate based on service type and weight
   */
  private getFallbackRate(serviceType: string): number {
    // Base rates in INR (conservative estimates)
    const baseRates = {
      standard: 100, // ₹100 base
      express: 200   // ₹200 base
    };

    return baseRates[serviceType as keyof typeof baseRates] || baseRates.standard;
  }

  /**
   * Get available service options for a specific pincode
   */
  async getAvailableServices(pincode: string, weight: number = 1): Promise<DelhiveryServiceOption[]> {
    if (!DelhiveryService.isValidPincode(pincode)) {
      return [];
    }

    try {
      const rates = await this.getDeliveryRates({
        destination_pincode: pincode,
        weight: weight,
        cod: false
      });

      // Filter only available services and format for UI
      return rates.rates
        .filter(rate => rate.available)
        .map(rate => ({
          value: rate.service_type,
          label: rate.service_name,
          rate: rate.rate,
          estimated_days: rate.estimated_days,
          available: rate.available,
          description: `₹${rate.rate} • ${rate.estimated_days} ${rate.estimated_days === 1 ? 'day' : 'days'}`
        }));

    } catch (error) {
      console.error('❌ [Delhivery] Failed to get available services:', error);
      
      // Return basic options as fallback
      return [
        {
          value: 'standard',
          label: 'Standard Delivery',
          rate: 100,
          estimated_days: 3,
          available: false,
          description: '₹100 • 3 days (estimated)'
        }
      ];
    }
  }

  /**
   * Convert INR to USD for quote calculations
   */
  async convertToUSD(amountINR: number): Promise<number> {
    try {
      // Use your existing currency service
      const { currencyService } = await import('./CurrencyService');
      const rate = await currencyService.getExchangeRateByCurrency('INR', 'USD');
      return amountINR * (rate || 0.012); // Fallback: 1 INR = 0.012 USD
    } catch (error) {
      console.error('Currency conversion error:', error);
      return amountINR * 0.012; // Fallback conversion
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < DELHIVERY_CONFIG.cache_duration * 1000) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Validate Indian pincode
   */
  static isValidPincode(pincode: string): boolean {
    return /^[1-9][0-9]{5}$/.test(pincode);
  }

  /**
   * Get recommended service for quote calculator
   */
  getRecommendedService(rates: DelhiveryRateResponse[]): DelhiveryRateResponse {
    // Return standard service as default, or first available
    return rates.find(r => r.service_type === 'standard') || rates[0];
  }
}

export const delhiveryService = DelhiveryService.getInstance();
export { DelhiveryService };
export type { DelhiveryServiceOption };
export type { DelhiveryRateRequest, DelhiveryRateResponse, DelhiveryMultiRateResponse };