import { supabase } from '../../integrations/supabase/client';
import { DeliveryProviderRegistry } from './DeliveryProviderRegistry';
import { 
  DeliveryProvider, 
  DeliveryAddress, 
  DeliveryRate,
  CreateOrderData,
  DeliveryOrder,
  ProviderConfig
} from './types';

export class DeliveryService {
  private static instance: DeliveryService;
  private registry: DeliveryProviderRegistry;
  private initialized = false;

  private constructor() {
    this.registry = DeliveryProviderRegistry.getInstance();
  }

  static getInstance(): DeliveryService {
    if (!DeliveryService.instance) {
      DeliveryService.instance = new DeliveryService();
    }
    return DeliveryService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load provider configurations from database
    const { data: configs, error } = await supabase
      .from('delivery_provider_configs')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    // Initialize each provider
    for (const config of configs || []) {
      try {
        await this.registry.initializeProvider({
          code: config.code,
          credentials: config.credentials, // Should be decrypted
          settings: config.settings,
          countryOverrides: config.country_overrides
        } as ProviderConfig);
      } catch (err) {
        console.error(`Failed to initialize provider ${config.code}:`, err);
      }
    }

    this.initialized = true;
  }

  // Get available delivery options for a shipment
  async getDeliveryOptions(params: {
    from: DeliveryAddress;
    to: DeliveryAddress;
    weight: number;
    value: number;
    requiresCOD?: boolean;
  }): Promise<{
    provider: string;
    rates: DeliveryRate[];
  }[]> {
    await this.initialize();

    const providers = this.registry.getProvidersForCountry(params.to.country);
    const options = [];

    for (const provider of providers) {
      try {
        const serviceable = await provider.checkServiceability(params.from, params.to);
        if (!serviceable) continue;

        if (params.requiresCOD && !provider.capabilities.cashOnDelivery) continue;

        const rates = await provider.calculateRates(
          params.from,
          params.to,
          params.weight
        );

        options.push({
          provider: provider.code,
          rates
        });
      } catch (err) {
        console.error(`Error getting rates from ${provider.code}:`, err);
      }
    }

    // Sort by lowest rate
    return options.sort((a, b) => 
      Math.min(...a.rates.map(r => r.amount)) - 
      Math.min(...b.rates.map(r => r.amount))
    );
  }

  // Create shipment with specific provider
  async createShipment(
    providerCode: string,
    orderData: CreateOrderData
  ): Promise<DeliveryOrder> {
    await this.initialize();

    const provider = this.registry.getProvider(providerCode);
    if (!provider) {
      throw new Error(`Provider ${providerCode} not found or not active`);
    }

    const order = await provider.createOrder(orderData);

    // Store in database
    await this.storeDeliveryOrder(providerCode, order, orderData);

    return order;
  }

  // Create shipment with auto-selection
  async createShipmentAuto(
    orderData: CreateOrderData,
    preferences?: {
      preferredProvider?: string;
      maxCost?: number;
      maxDays?: number;
    }
  ): Promise<{ provider: string; order: DeliveryOrder }> {
    await this.initialize();

    const provider = await this.registry.getBestProvider(
      orderData.from,
      orderData.to,
      {
        ...preferences,
        requiresCOD: !!orderData.cod,
        requiresTracking: true
      }
    );

    if (!provider) {
      throw new Error('No delivery provider available for this route');
    }

    const order = await provider.createOrder(orderData);
    await this.storeDeliveryOrder(provider.code, order, orderData);

    return { provider: provider.code, order };
  }

  // Track shipment
  async trackShipment(trackingNumber: string, providerCode?: string): Promise<DeliveryOrder> {
    await this.initialize();

    // If provider not specified, look up in database
    if (!providerCode) {
      const { data } = await supabase
        .from('delivery_orders')
        .select('provider_code')
        .eq('tracking_number', trackingNumber)
        .single();

      if (!data) throw new Error('Tracking number not found');
      providerCode = data.provider_code;
    }

    const provider = this.registry.getProvider(providerCode);
    if (!provider) {
      throw new Error(`Provider ${providerCode} not found`);
    }

    const trackingInfo = await provider.trackOrder(trackingNumber);

    // Update database with latest status
    await this.updateTrackingStatus(trackingNumber, trackingInfo);

    return trackingInfo;
  }

  // Handle webhook from any provider
  async handleWebhook(providerCode: string, payload: any): Promise<void> {
    await this.initialize();

    const provider = this.registry.getProvider(providerCode);
    if (!provider || !provider.handleWebhook) {
      throw new Error(`Provider ${providerCode} does not support webhooks`);
    }

    const event = await provider.handleWebhook(payload);
    
    // Update tracking in database
    if (event) {
      await this.addTrackingEvent(payload.tracking_number || payload.order_id, event);
    }
  }

  // Private helper methods
  private async storeDeliveryOrder(
    providerCode: string,
    order: DeliveryOrder,
    originalData: CreateOrderData
  ): Promise<void> {
    await supabase.from('delivery_orders').insert({
      order_id: order.orderId,
      provider_code: providerCode,
      provider_order_id: order.providerOrderId,
      tracking_number: order.trackingNumber,
      status: order.status,
      from_address: originalData.from,
      to_address: originalData.to,
      shipment_data: originalData,
      events: order.events,
      created_at: new Date()
    });
  }

  private async updateTrackingStatus(
    trackingNumber: string,
    trackingInfo: DeliveryOrder
  ): Promise<void> {
    await supabase
      .from('delivery_orders')
      .update({
        status: trackingInfo.status,
        events: trackingInfo.events,
        estimated_delivery: trackingInfo.estimatedDelivery,
        actual_delivery: trackingInfo.actualDelivery,
        proof: trackingInfo.proof,
        updated_at: new Date()
      })
      .eq('tracking_number', trackingNumber);
  }

  private async addTrackingEvent(identifier: string, event: any): Promise<void> {
    const { data } = await supabase
      .from('delivery_orders')
      .select('events')
      .or(`tracking_number.eq.${identifier},provider_order_id.eq.${identifier}`)
      .single();

    if (data) {
      const events = [...(data.events || []), event];
      await supabase
        .from('delivery_orders')
        .update({ events, updated_at: new Date() })
        .or(`tracking_number.eq.${identifier},provider_order_id.eq.${identifier}`);
    }
  }
}