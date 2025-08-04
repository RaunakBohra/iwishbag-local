import { 
  DeliveryProvider, 
  DeliveryAddress, 
  DeliveryRate, 
  DeliveryOrder,
  DeliveryStatus,
  CreateOrderData,
  TrackingEvent,
  ProviderCapabilities,
  PackageDimensions
} from '../types';
import NCMService from '../../NCMService';

export class NCMProvider implements DeliveryProvider {
  name = 'Nepal Can Move';
  code = 'NCM';
  supportedCountries = ['NP'];
  
  capabilities: ProviderCapabilities = {
    realTimeTracking: true,
    proofOfDelivery: false,
    cashOnDelivery: true,
    insurance: false,
    reversePickup: false,
    labelGeneration: false,
    pickupScheduling: true,
    webhooks: false,
    multiPiece: false
  };

  private ncmService: NCMService;

  constructor(private config: any) {
    this.ncmService = NCMService.getInstance();
  }

  async checkServiceability(from: DeliveryAddress, to: DeliveryAddress): Promise<boolean> {
    if (to.country !== 'NP') return false;
    
    try {
      const branches = await this.ncmService.getBranches();
      const fromBranch = this.findNearestBranch(from, branches);
      const toBranch = this.findNearestBranch(to, branches);
      
      return !!(fromBranch && toBranch);
    } catch {
      return false;
    }
  }

  async calculateRates(
    from: DeliveryAddress, 
    to: DeliveryAddress, 
    weight: number,
    dimensions?: PackageDimensions
  ): Promise<DeliveryRate[]> {
    const branches = await this.ncmService.getBranches();
    const fromBranch = this.findNearestBranch(from, branches);
    const toBranch = this.findNearestBranch(to, branches);
    
    if (!fromBranch || !toBranch) {
      throw new Error('Service not available for these locations');
    }

    const rates = await this.ncmService.getDeliveryRates({
      creation: fromBranch.district,
      destination: toBranch.district,
      type: 'Pickup'
    });

    // Return both pickup and collect options
    return rates.rates.map(rate => ({
      provider: this.code,
      service: rate.service_type === 'pickup' ? 'NCM Pickup' : 'NCM Collect',
      amount: rate.rate,
      currency: rates.currency,
      estimatedDays: rate.estimated_days,
      cutoffTime: '17:00',
      available: rate.available
    }));
  }

  async createOrder(orderData: CreateOrderData): Promise<DeliveryOrder> {
    const branches = await this.ncmService.getBranches();
    const fromBranch = this.findNearestBranch(orderData.from, branches);
    const toBranch = this.findNearestBranch(orderData.to, branches);
    
    if (!fromBranch || !toBranch) {
      throw new Error('Service not available for these locations');
    }

    const ncmOrder = await this.ncmService.createOrder({
      name: orderData.to.name,
      phone: this.formatPhoneForNCM(orderData.to.phone),
      phone2: orderData.to.alternatePhone ? this.formatPhoneForNCM(orderData.to.alternatePhone) : undefined,
      cod_charge: orderData.cod ? orderData.cod.amount.toFixed(2) : '0',
      address: `${orderData.to.addressLine1}, ${orderData.to.addressLine2 || ''}, ${orderData.to.city}`,
      fbranch: fromBranch.district,
      branch: toBranch.district,
      package: orderData.invoice?.items.map(i => i.description).join(', '),
      vref_id: orderData.reference || orderData.orderId,
      instruction: orderData.instructions
    });

    if (ncmOrder.Error) {
      throw new Error(Object.values(ncmOrder.Error).join(', '));
    }

    return {
      orderId: orderData.orderId,
      providerOrderId: ncmOrder.orderid?.toString(),
      status: DeliveryStatus.PENDING,
      events: [{
        timestamp: new Date(),
        status: 'Order Created',
        description: 'Order has been created with NCM'
      }]
    };
  }

  async trackOrder(trackingNumber: string): Promise<DeliveryOrder> {
    const [details, statuses] = await Promise.all([
      this.ncmService.getOrderDetails(trackingNumber),
      this.ncmService.getOrderStatus(trackingNumber)
    ]);

    const events: TrackingEvent[] = statuses.map(status => ({
      timestamp: new Date(status.added_time),
      status: this.mapNCMStatus(status.status),
      description: status.status,
      rawStatus: status.status
    }));

    return {
      orderId: '',
      providerOrderId: trackingNumber,
      trackingNumber: trackingNumber,
      status: this.mapNCMStatusToDeliveryStatus(details.last_delivery_status),
      events: events.reverse() // NCM returns in desc order
    };
  }

  async cancelOrder(providerOrderId: string, reason?: string): Promise<boolean> {
    // NCM doesn't have cancel API, would need to add comment
    await this.ncmService.addOrderComment(
      providerOrderId, 
      `Cancellation requested: ${reason || 'Customer request'}`
    );
    return true;
  }

  // Helper methods
  private findNearestBranch(address: DeliveryAddress, branches: any[]): any {
    // Simple implementation - in production, use geocoding
    return branches.find(b => 
      b.district.toLowerCase() === address.city.toLowerCase() ||
      b.covered_areas?.some((area: string) => 
        address.addressLine1.toLowerCase().includes(area.toLowerCase())
      )
    );
  }

  private formatPhoneForNCM(phone: string): string {
    // Remove country code and formatting
    return phone.replace(/^\+977/, '').replace(/\D/g, '');
  }

  private calculateEstimatedDays(fromDistrict: string, toDistrict: string): number {
    if (fromDistrict === toDistrict) return 1;
    if (['Kathmandu', 'Lalitpur', 'Bhaktapur'].includes(fromDistrict) && 
        ['Kathmandu', 'Lalitpur', 'Bhaktapur'].includes(toDistrict)) return 1;
    return 3; // Inter-district
  }

  private mapNCMStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'Pickup Order Created': 'Order Created',
      'Sent for Pickup': 'Pickup Scheduled',
      'Pickup Complete': 'Package Picked Up',
      'Sent for Delivery': 'Out for Delivery',
      'Delivered': 'Delivered Successfully',
      'Returned': 'Package Returned',
      'Cancelled': 'Order Cancelled'
    };
    return statusMap[status] || status;
  }

  private mapNCMStatusToDeliveryStatus(ncmStatus: string): DeliveryStatus {
    const statusMap: Record<string, DeliveryStatus> = {
      'Pickup Order Created': DeliveryStatus.PENDING,
      'Sent for Pickup': DeliveryStatus.PICKUP_SCHEDULED,
      'Pickup Complete': DeliveryStatus.PICKED_UP,
      'Sent for Delivery': DeliveryStatus.OUT_FOR_DELIVERY,
      'Delivered': DeliveryStatus.DELIVERED,
      'Returned': DeliveryStatus.RETURNED,
      'Cancelled': DeliveryStatus.CANCELLED
    };
    return statusMap[ncmStatus] || DeliveryStatus.IN_TRANSIT;
  }
}