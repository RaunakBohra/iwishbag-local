import { env } from '../config/env';

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
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly headers: HeadersInit;

  private constructor() {
    this.baseUrl = env.NCM_API_BASE_URL;
    this.apiToken = env.NCM_API_TOKEN;
    this.headers = {
      'Authorization': `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  static getInstance(): NCMService {
    if (!NCMService.instance) {
      NCMService.instance = new NCMService();
    }
    return NCMService.instance;
  }

  private async fetchApi(endpoint: string, options?: RequestInit) {
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
    return this.fetchApi('/api/v1/branchlist');
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
}

export default NCMService;