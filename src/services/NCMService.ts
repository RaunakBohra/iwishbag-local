import { supabase } from '../integrations/supabase/client';

export interface NCMBranch {
  name: string;
  phone: string;
  coveredAreas: string[];
  district: string;
  region: string;
}

export interface NCMDeliveryRate {
  deliveryCharge: number;
  pickupBranch: string;
  destinationBranch: string;
  deliveryType: 'Pickup' | 'Collect';
}

interface NCMRateRequest {
  creation: string;
  destination: string;
  type: 'Pickup' | 'Collect';
  weight?: number; // For future use
}

interface NCMRateResponse {
  service_type: 'pickup' | 'collect';
  rate: number; // in NPR
  estimated_days: number;
  service_name: string;
  available: boolean;
  error?: string;
}

interface NCMMultiRateResponse {
  rates: NCMRateResponse[];
  currency: 'NPR';
  markup_applied: number;
  original_total: number;
  final_total: number;
  cache_used: boolean;
}

export interface NCMOrderDetails {
  orderid: number;
  cod_charge: string;
  delivery_charge: string;
  last_delivery_status: string;
  payment_status: string;
}

export interface NCMOrderComment {
  orderid: number;
  comments: string;
  addedBy: string;
  added_time: string;
}

export interface NCMOrderStatus {
  orderid: number;
  status: string;
  added_time: string;
}

export interface NCMCreateOrderParams {
  name: string;
  phone: string;
  phone2?: string;
  cod_charge: string;
  address: string;
  fbranch: string;
  branch: string;
  package?: string;
  vref_id?: string;
  instruction?: string;
}

export interface NCMCreateOrderResponse {
  Message?: string;
  orderid?: number;
  Error?: Record<string, string>;
}

class NCMService {
  private static instance: NCMService;
  private baseUrl: string = 'https://demo.nepalcanmove.com';
  private apiToken: string = '';
  private headers: HeadersInit = {};
  private initialized = false;
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  // NCM configuration similar to Delhivery
  private readonly NCM_CONFIG = {
    markup_percentage: 15, // 15% markup on NCM rates
    cache_duration: 300, // 5 minutes cache
    fallback_rates: {
      pickup: 250, // NPR 250 base for pickup
      collect: 150 // NPR 150 base for collect
    }
  };

  private constructor() {}
  
  private async initialize() {
    if (this.initialized) return;
    
    // Fetch NCM config from database
    const { data, error } = await supabase
      .from('delivery_provider_configs' as any)
      .select('credentials, settings')
      .eq('code', 'NCM')
      .single() as { data: any, error: any };
      
    if (error || !data) {
      throw new Error('NCM configuration not found');
    }
    
    this.apiToken = data?.credentials?.api_token || '';
    this.baseUrl = data?.settings?.baseUrl || this.baseUrl;
    this.headers = {
      'Authorization': `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
    
    this.initialized = true;
  }

  static getInstance(): NCMService {
    if (!NCMService.instance) {
      NCMService.instance = new NCMService();
    }
    return NCMService.instance;
  }

  private async fetchApi(endpoint: string, options?: RequestInit) {
    await this.initialize();
    
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `NCM API error: ${response.status}`);
    }

    return response.json();
  }

  // Get list of all NCM branches
  async getBranches(): Promise<NCMBranch[]> {
    try {
      const response = await this.fetchApi('/api/v1/branchlist');
      console.log('🔍 [NCM] Raw API response:', response);
      
      let branchData: any[];
      
      // Handle different response formats
      if (Array.isArray(response)) {
        branchData = response;
      } else if (response && response.data) {
        // Handle case where data is wrapped in a data property
        if (typeof response.data === 'string') {
          // Parse JSON string
          try {
            branchData = JSON.parse(response.data);
          } catch (parseError) {
            console.error('❌ [NCM] Failed to parse data string:', parseError);
            throw new Error('Invalid JSON in branch data');
          }
        } else if (Array.isArray(response.data)) {
          branchData = response.data;
        } else {
          console.error('❌ [NCM] Unknown data format:', response);
          throw new Error('Unexpected branch data format');
        }
      } else {
        console.error('❌ [NCM] API response is not in expected format:', response);
        throw new Error('Invalid branch list response format');
      }
      
      // Validate we have an array
      if (!Array.isArray(branchData)) {
        console.error('❌ [NCM] Parsed data is not an array:', branchData);
        throw new Error('Branch data is not an array');
      }
      
      // Transform raw branch data to our NCMBranch format
      const branches: NCMBranch[] = branchData.map((branchArray: any[]) => {
        // NCM API returns arrays like: ["POKHARA", "PKRA", null, "POKHARA LEKHNATH METROPOLITIAN CITY", "KASKI", "R07 - GANDAKI", ...]
        // Array structure: [0]=Branch Name, [1]=Code, [2]=null, [3]=Municipality, [4]=District, [5]=Region
        return {
          name: branchArray[1] || branchArray[0], // Use code (index 1) or name (index 0)
          phone: '015199684', // Default NCM phone
          coveredAreas: [branchArray[3] || branchArray[0]], // Use municipality or name
          district: branchArray[4] || branchArray[0] || 'Unknown', // FIXED: Use district from index 4
          region: branchArray[5] || 'Nepal' // Use region from index 5
        };
      });
      
      console.log(`✅ [NCM] Processed ${branches.length} branches from API`);
      return branches;
      
    } catch (error) {
      console.error('❌ [NCM] Failed to fetch branches from API:', error);
      throw error; // Re-throw to trigger fallback in branch mapping service
    }
  }

  // Calculate delivery charges between branches
  async getDeliveryRate(params: {
    creation: string;
    destination: string;
    type: 'Pickup' | 'Collect';
  }): Promise<NCMDeliveryRate> {
    const queryParams = new URLSearchParams(params);
    return this.fetchApi(`/api/v1/shipping-rate?${queryParams}`);
  }

  /**
   * Get delivery rates for both Pickup and Collect with markup via Edge Function
   * Similar to Delhivery's getDeliveryRates method
   */
  async getDeliveryRates(request: NCMRateRequest): Promise<NCMMultiRateResponse> {
    console.log('🚚 [NCM] Getting delivery rates via Edge Function for:', request);

    const cacheKey = `ncm_rates_${request.creation}_${request.destination}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 [NCM] Using cached rates');
      return { ...cached, cache_used: true };
    }

    try {
      // Call Supabase Edge Function instead of direct API call
      const { supabase } = await import('../integrations/supabase/client');
      
      console.log('🚚 [NCM] Calling Edge Function with request:', request);
      
      const { data, error } = await supabase.functions.invoke('ncm-rates', {
        body: {
          creation: request.creation,
          destination: request.destination,
          type: request.type,
          weight: request.weight || 1
        }
      });

      if (error) {
        console.error('❌ [NCM] Edge Function error:', error);
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from Edge Function');
      }

      console.log('✅ [NCM] Edge Function response:', data);

      // Cache the response
      this.setCache(cacheKey, data);

      return data as NCMMultiRateResponse;

    } catch (error) {
      console.error('❌ [NCM] Edge Function call failed:', error);
      
      // Return fallback rates
      return this.getFallbackRates(request);
    }
  }

  // Get order details
  async getOrderDetails(orderId: string | number): Promise<NCMOrderDetails> {
    return this.fetchApi(`/api/v1/order?id=${orderId}`);
  }

  // Get order comments
  async getOrderComments(orderId: string | number): Promise<NCMOrderComment[]> {
    return this.fetchApi(`/api/v1/order/comment?id=${orderId}`);
  }

  // Get last 25 comments across all orders
  async getBulkComments(): Promise<NCMOrderComment[]> {
    return this.fetchApi('/api/v1/order/getbulkcomments');
  }

  // Get order status history
  async getOrderStatus(orderId: string | number): Promise<NCMOrderStatus[]> {
    return this.fetchApi(`/api/v1/order/status?id=${orderId}`);
  }

  // Create a new order
  async createOrder(params: NCMCreateOrderParams): Promise<NCMCreateOrderResponse> {
    return this.fetchApi('/api/v1/order/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Add comment to an order
  async addOrderComment(orderId: string | number, comment: string): Promise<{ message: string }> {
    return this.fetchApi('/api/v1/comment', {
      method: 'POST',
      body: JSON.stringify({
        orderid: orderId,
        comments: comment,
      }),
    });
  }

  // Helper method to validate phone number format for NCM
  validatePhoneNumber(phone: string): boolean {
    // Nepal phone numbers typically start with 98 or 97 and have 10 digits
    const nepalPhoneRegex = /^9[78]\d{8}$/;
    return nepalPhoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  // Helper method to format COD amount (includes delivery charge)
  formatCODAmount(amount: number): string {
    return amount.toFixed(2);
  }

  // Map NCM delivery status to iwishBag order status
  mapNCMStatusToOrderStatus(ncmStatus: string): string {
    const statusMap: Record<string, string> = {
      'Pickup Order Created': 'preparing',
      'Sent for Pickup': 'preparing',
      'Pickup Complete': 'shipped',
      'Sent for Delivery': 'in_transit',
      'Delivered': 'delivered',
      'Returned': 'returned',
      'Cancelled': 'cancelled',
    };

    return statusMap[ncmStatus] || 'pending';
  }

  /**
   * Get fallback rates when API fails
   */
  private getFallbackRates(request: NCMRateRequest): NCMMultiRateResponse {
    console.log('🔄 [NCM] Using fallback rates');
    
    const pickupRate = this.NCM_CONFIG.fallback_rates.pickup;
    const collectRate = this.NCM_CONFIG.fallback_rates.collect;

    return {
      rates: [
        {
          service_type: 'pickup',
          rate: pickupRate,
          estimated_days: 3,
          service_name: 'NCM Pickup Service',
          available: false,
          error: 'Using fallback rate (API unavailable)'
        },
        {
          service_type: 'collect',
          rate: collectRate,
          estimated_days: 5,
          service_name: 'NCM Collect Service',
          available: false,
          error: 'Using fallback rate (API unavailable)'
        }
      ],
      currency: 'NPR',
      markup_applied: 0, // No markup on fallback
      original_total: pickupRate + collectRate,
      final_total: pickupRate + collectRate,
      cache_used: false
    };
  }

  /**
   * Estimate delivery days based on service type and location
   */
  private estimateDeliveryDays(fromBranch: string, toBranch: string, serviceType: 'pickup' | 'collect'): number {
    // Pickup service is faster
    const basePickupDays = 2;
    const baseCollectDays = 4;
    
    // Same branch/district - faster delivery
    if (fromBranch === toBranch) {
      return serviceType === 'pickup' ? 1 : 2;
    }
    
    // Kathmandu valley deliveries are faster
    const kathmanduBranches = ['TINKUNE', 'KATHMANDU', 'LALITPUR', 'BHAKTAPUR', 'BANEPA', 'DHULIKHEL'];
    if (kathmanduBranches.includes(fromBranch.toUpperCase()) && 
        kathmanduBranches.includes(toBranch.toUpperCase())) {
      return serviceType === 'pickup' ? 1 : 2;
    }
    
    return serviceType === 'pickup' ? basePickupDays : baseCollectDays;
  }

  /**
   * Convert NPR to USD for quote calculations
   */
  async convertToUSD(amountNPR: number): Promise<number> {
    try {
      // Use your existing currency service
      const { currencyService } = await import('./CurrencyService');
      const rate = await currencyService.getExchangeRateByCurrency('NPR', 'USD');
      return amountNPR * (rate || 0.0075); // Fallback: 1 NPR = 0.0075 USD
    } catch (error) {
      console.error('Currency conversion error:', error);
      return amountNPR * 0.0075; // Fallback conversion
    }
  }

  /**
   * Get recommended service for quote calculator
   */
  getRecommendedService(rates: NCMRateResponse[]): NCMRateResponse {
    // Return pickup service as default (faster), or first available
    return rates.find(r => r.service_type === 'pickup') || rates[0];
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.NCM_CONFIG.cache_duration * 1000) {
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
}

export default NCMService;
export type { NCMRateRequest, NCMRateResponse, NCMMultiRateResponse };