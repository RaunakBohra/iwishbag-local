/**
 * NCM Order Tracking Service
 * Comprehensive tracking service for NCM (Nepal Can Move) orders
 * Handles order status tracking, customer notifications, and integration with iwishBag orders
 */

import { supabase } from '../integrations/supabase/client';
import NCMService, { NCMOrderDetails, NCMOrderStatus, NCMOrderComment } from './NCMService';
import { TrackingService } from './TrackingService';

export interface NCMTrackingData {
  ncm_order_id: number;
  iwishbag_order_id: string;
  tracking_id: string;
  current_status: string;
  last_updated: string;
  customer_phone: string;
  delivery_address: string;
  cod_amount?: number;
  estimated_delivery?: string;
  pickup_branch: string;
  destination_branch: string;
  service_type: 'Pickup' | 'Collect';
}

export interface NCMTrackingUpdate {
  order_id: number;
  status: string;
  timestamp: string;
  location?: string;
  remarks?: string;
  updated_by?: string;
}

export interface NCMCustomerTrackingInfo {
  tracking_id: string;
  current_status: string;
  status_display: string;
  progress_percentage: number;
  estimated_delivery: string | null;
  timeline: Array<{
    status: string;
    display: string;
    timestamp: string;
    location?: string;
    remarks?: string;
  }>;
  delivery_info: {
    pickup_branch: string;
    destination_branch: string;
    service_type: string;
    cod_amount?: number;
  };
  can_modify: boolean;
  contact_info: {
    ncm_phone: string;
    support_email: string;
  };
}

class NCMOrderTrackingService {
  private static instance: NCMOrderTrackingService;
  private ncmService: NCMService;
  private trackingService: TrackingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 300000; // 5 minutes

  private constructor() {
    this.ncmService = NCMService.getInstance();
    this.trackingService = TrackingService.getInstance();
  }

  static getInstance(): NCMOrderTrackingService {
    if (!NCMOrderTrackingService.instance) {
      NCMOrderTrackingService.instance = new NCMOrderTrackingService();
    }
    return NCMOrderTrackingService.instance;
  }

  /**
   * Create tracking record when NCM order is created
   */
  async createTrackingRecord(params: {
    ncm_order_id: number;
    iwishbag_order_id: string;
    customer_phone: string;
    delivery_address: string;
    pickup_branch: string;
    destination_branch: string;
    service_type: 'Pickup' | 'Collect';
    cod_amount?: number;
  }): Promise<NCMTrackingData> {
    console.log('📦 [NCM Tracking] Creating tracking record:', params);

    try {
      // Generate iwishBag tracking ID
      const tracking_id = await this.trackingService.generateTrackingId();

      const trackingData: NCMTrackingData = {
        ncm_order_id: params.ncm_order_id,
        iwishbag_order_id: params.iwishbag_order_id,
        tracking_id,
        current_status: 'pending',
        last_updated: new Date().toISOString(),
        customer_phone: params.customer_phone,
        delivery_address: params.delivery_address,
        pickup_branch: params.pickup_branch,
        destination_branch: params.destination_branch,
        service_type: params.service_type,
        cod_amount: params.cod_amount
      };

      // Store in database
      const { data, error } = await supabase
        .from('ncm_order_tracking')
        .insert(trackingData)
        .select()
        .single();

      if (error) {
        console.error('❌ [NCM Tracking] Failed to create tracking record:', error);
        throw new Error(`Failed to create tracking record: ${error.message}`);
      }

      console.log('✅ [NCM Tracking] Tracking record created:', tracking_id);
      return data as NCMTrackingData;

    } catch (error) {
      console.error('❌ [NCM Tracking] Error creating tracking record:', error);
      throw error;
    }
  }

  /**
   * Update tracking status from NCM API
   */
  async updateTrackingStatus(ncm_order_id: number): Promise<NCMTrackingUpdate[]> {
    console.log(`🔄 [NCM Tracking] Updating status for NCM order: ${ncm_order_id}`);

    try {
      // Get current status from NCM API
      const [orderDetails, orderStatus] = await Promise.all([
        this.ncmService.getOrderDetails(ncm_order_id),
        this.ncmService.getOrderStatus(ncm_order_id)
      ]);

      if (!orderStatus || orderStatus.length === 0) {
        console.warn('⚠️ [NCM Tracking] No status updates from NCM API');
        return [];
      }

      // Update our tracking record
      const latestStatus = orderStatus[orderStatus.length - 1];
      const iwishbagStatus = this.ncmService.mapNCMStatusToOrderStatus(latestStatus.status);

      const { error: updateError } = await supabase
        .from('ncm_order_tracking')
        .update({
          current_status: iwishbagStatus,
          last_updated: new Date().toISOString()
        })
        .eq('ncm_order_id', ncm_order_id);

      if (updateError) {
        console.error('❌ [NCM Tracking] Failed to update tracking status:', updateError);
      }

      // Store status history
      const updates: NCMTrackingUpdate[] = orderStatus.map(status => ({
        order_id: ncm_order_id,
        status: status.status,
        timestamp: status.added_time,
        updated_by: 'NCM API'
      }));

      // Store in tracking history table
      const { error: historyError } = await supabase
        .from('ncm_tracking_history')
        .upsert(
          updates.map(update => ({
            ncm_order_id: update.order_id,
            status: update.status,
            iwishbag_status: this.ncmService.mapNCMStatusToOrderStatus(update.status),
            timestamp: update.timestamp,
            updated_by: update.updated_by
          })),
          { onConflict: 'ncm_order_id,timestamp' }
        );

      if (historyError) {
        console.error('❌ [NCM Tracking] Failed to store tracking history:', historyError);
      }

      console.log(`✅ [NCM Tracking] Updated ${updates.length} status entries`);
      return updates;

    } catch (error) {
      console.error(`❌ [NCM Tracking] Failed to update status for order ${ncm_order_id}:`, error);
      throw error;
    }
  }

  /**
   * Get customer-facing tracking information
   */
  async getCustomerTrackingInfo(tracking_id: string): Promise<NCMCustomerTrackingInfo | null> {
    console.log(`🔍 [NCM Tracking] Getting customer tracking info for: ${tracking_id}`);

    try {
      // Get tracking record
      const { data: trackingData, error: trackingError } = await supabase
        .from('ncm_order_tracking')
        .select('*')
        .eq('tracking_id', tracking_id)
        .single();

      if (trackingError || !trackingData) {
        console.warn('⚠️ [NCM Tracking] Tracking ID not found:', tracking_id);
        return null;
      }

      // Get status history
      const { data: historyData, error: historyError } = await supabase
        .from('ncm_tracking_history')
        .select('*')
        .eq('ncm_order_id', trackingData.ncm_order_id)
        .order('timestamp', { ascending: true });

      const timeline = historyData?.map(entry => ({
        status: entry.iwishbag_status,
        display: this.getStatusDisplayName(entry.iwishbag_status),
        timestamp: entry.timestamp,
        location: entry.location,
        remarks: entry.remarks
      })) || [];

      // Calculate progress percentage
      const progress = this.calculateProgressPercentage(trackingData.current_status);

      const customerInfo: NCMCustomerTrackingInfo = {
        tracking_id: trackingData.tracking_id,
        current_status: trackingData.current_status,
        status_display: this.getStatusDisplayName(trackingData.current_status),
        progress_percentage: progress,
        estimated_delivery: trackingData.estimated_delivery || null,
        timeline,
        delivery_info: {
          pickup_branch: trackingData.pickup_branch,
          destination_branch: trackingData.destination_branch,
          service_type: trackingData.service_type,
          cod_amount: trackingData.cod_amount
        },
        can_modify: ['pending', 'preparing'].includes(trackingData.current_status),
        contact_info: {
          ncm_phone: '015199684',
          support_email: 'support@iwishbag.com'
        }
      };

      return customerInfo;

    } catch (error) {
      console.error('❌ [NCM Tracking] Failed to get customer tracking info:', error);
      throw error;
    }
  }

  /**
   * Get all active trackings for admin dashboard
   */
  async getActiveTrackings(limit: number = 50): Promise<NCMTrackingData[]> {
    try {
      const { data, error } = await supabase
        .from('ncm_order_tracking')
        .select('*')
        .not('current_status', 'in', '(delivered,cancelled,returned)')
        .order('last_updated', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [NCM Tracking] Failed to get active trackings:', error);
        throw error;
      }

      return data as NCMTrackingData[];
    } catch (error) {
      console.error('❌ [NCM Tracking] Error getting active trackings:', error);
      throw error;
    }
  }

  /**
   * Start background polling for status updates
   */
  startStatusPolling(): void {
    if (this.pollingInterval) {
      console.log('⚠️ [NCM Tracking] Polling already running');
      return;
    }

    console.log('🔄 [NCM Tracking] Starting status polling service');

    this.pollingInterval = setInterval(async () => {
      try {
        const activeTrackings = await this.getActiveTrackings(20); // Poll top 20 active orders
        
        console.log(`🔄 [NCM Tracking] Polling ${activeTrackings.length} active orders`);

        for (const tracking of activeTrackings) {
          try {
            await this.updateTrackingStatus(tracking.ncm_order_id);
            // Add small delay to avoid overwhelming NCM API
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`❌ [NCM Tracking] Failed to poll order ${tracking.ncm_order_id}:`, error);
          }
        }

      } catch (error) {
        console.error('❌ [NCM Tracking] Polling service error:', error);
      }
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * Stop background polling
   */
  stopStatusPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🛑 [NCM Tracking] Status polling stopped');
    }
  }

  /**
   * Manual refresh of specific tracking
   */
  async refreshTracking(tracking_id: string): Promise<NCMCustomerTrackingInfo | null> {
    console.log(`🔄 [NCM Tracking] Manual refresh for: ${tracking_id}`);

    try {
      // Get NCM order ID
      const { data: trackingData, error } = await supabase
        .from('ncm_order_tracking')
        .select('ncm_order_id')
        .eq('tracking_id', tracking_id)
        .single();

      if (error || !trackingData) {
        return null;
      }

      // Update from NCM API
      await this.updateTrackingStatus(trackingData.ncm_order_id);

      // Return fresh tracking info
      return await this.getCustomerTrackingInfo(tracking_id);

    } catch (error) {
      console.error('❌ [NCM Tracking] Failed to refresh tracking:', error);
      throw error;
    }
  }

  // Helper methods
  private getStatusDisplayName(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Order Placed',
      preparing: 'Preparing for Pickup',
      shipped: 'In Transit',
      in_transit: 'In Transit', 
      delivered: 'Delivered',
      returned: 'Returned',
      cancelled: 'Cancelled'
    };

    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  }

  private calculateProgressPercentage(status: string): number {
    const progressMap: Record<string, number> = {
      pending: 10,
      preparing: 25,
      shipped: 50,
      in_transit: 75,
      delivered: 100,
      returned: 0,
      cancelled: 0
    };

    return progressMap[status] || 0;
  }

  /**
   * Get delivery time estimates based on service type and branches
   */
  private estimateDeliveryTime(
    pickup_branch: string, 
    destination_branch: string, 
    service_type: 'Pickup' | 'Collect'
  ): string {
    // Base delivery days
    const baseDays = service_type === 'Pickup' ? 2 : 4;
    
    // Kathmandu valley is faster
    const kathmanduBranches = ['TINKUNE', 'KATHMANDU', 'LALITPUR', 'BHAKTAPUR'];
    const isKathmanduDelivery = kathmanduBranches.some(branch => 
      destination_branch.toUpperCase().includes(branch)
    );

    const estimatedDays = isKathmanduDelivery ? Math.max(1, baseDays - 1) : baseDays;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);

    return deliveryDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }
}

export const ncmOrderTrackingService = NCMOrderTrackingService.getInstance();
export { NCMOrderTrackingService };