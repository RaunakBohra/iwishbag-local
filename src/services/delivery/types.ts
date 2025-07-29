// Core delivery provider types and interfaces

export interface DeliveryAddress {
  name: string;
  phone: string;
  alternatePhone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
}

export interface DeliveryRate {
  provider: string;
  service: string;
  amount: number;
  currency: string;
  estimatedDays: number;
  cutoffTime?: string;
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
  rawStatus?: string; // Provider's original status
}

export interface DeliveryOrder {
  orderId: string;
  providerOrderId?: string;
  trackingNumber?: string;
  status: DeliveryStatus;
  events: TrackingEvent[];
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  proof?: {
    signature?: string;
    photo?: string;
    receivedBy?: string;
  };
}

export enum DeliveryStatus {
  PENDING = 'pending',
  PICKUP_SCHEDULED = 'pickup_scheduled',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
  CANCELLED = 'cancelled'
}

export interface DeliveryProvider {
  // Provider metadata
  name: string;
  code: string;
  supportedCountries: string[];
  capabilities: ProviderCapabilities;
  
  // Core operations
  checkServiceability(from: DeliveryAddress, to: DeliveryAddress): Promise<boolean>;
  calculateRates(from: DeliveryAddress, to: DeliveryAddress, weight: number, dimensions?: PackageDimensions): Promise<DeliveryRate[]>;
  createOrder(orderData: CreateOrderData): Promise<DeliveryOrder>;
  trackOrder(trackingNumber: string): Promise<DeliveryOrder>;
  cancelOrder(providerOrderId: string, reason?: string): Promise<boolean>;
  
  // Webhook handling
  handleWebhook?(payload: any): Promise<TrackingEvent>;
  
  // Optional operations
  schedulePickup?(pickupData: PickupData): Promise<string>;
  printLabel?(providerOrderId: string): Promise<Buffer>;
  getProofOfDelivery?(providerOrderId: string): Promise<any>;
}

export interface ProviderCapabilities {
  realTimeTracking: boolean;
  proofOfDelivery: boolean;
  cashOnDelivery: boolean;
  insurance: boolean;
  reversePickup: boolean;
  labelGeneration: boolean;
  pickupScheduling: boolean;
  webhooks: boolean;
  multiPiece: boolean;
}

export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'inch';
}

export interface CreateOrderData {
  orderId: string;
  from: DeliveryAddress;
  to: DeliveryAddress;
  weight: number;
  dimensions?: PackageDimensions;
  value: number;
  currency: string;
  service: string;
  reference?: string;
  invoice?: {
    number: string;
    date: Date;
    items: Array<{
      description: string;
      quantity: number;
      value: number;
    }>;
  };
  cod?: {
    amount: number;
    currency: string;
  };
  insurance?: boolean;
  instructions?: string;
}

export interface PickupData {
  address: DeliveryAddress;
  date: Date;
  timeSlot: {
    start: string;
    end: string;
  };
  packages: number;
  contact: {
    name: string;
    phone: string;
  };
}

// Provider configuration stored in database
export interface ProviderConfig {
  code: string;
  credentials: Record<string, any>; // Encrypted in DB
  settings: {
    baseUrl?: string;
    webhookSecret?: string;
    rateMultiplier?: number;
    enabled: boolean;
    testMode: boolean;
  };
  countryOverrides?: Record<string, any>;
}