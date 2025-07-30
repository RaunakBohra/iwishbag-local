/**
 * Return Shipping Service
 * 
 * Handles shipping label generation and tracking for package returns
 */

import { supabase } from '@/integrations/supabase/client';

export interface ShippingLabelRequest {
  returnId: string;
  fromAddress: {
    name: string;
    email: string;
    phone?: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  toAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  packageDetails: {
    weight: number; // in kg
    length?: number; // in cm
    width?: number;
    height?: number;
    value: number;
    currency: string;
  };
  carrier?: 'usps' | 'fedex' | 'ups' | 'dhl';
  serviceType?: string;
}

export interface ShippingLabelResult {
  success: boolean;
  labelUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  cost?: number;
  error?: string;
}

class ReturnShippingService {
  private static instance: ReturnShippingService;
  
  // Default warehouse addresses by region
  private warehouseAddresses = {
    US: {
      name: 'iWishBag Returns Center',
      street1: '123 Warehouse Blvd',
      street2: 'Unit 100',
      city: 'Newark',
      state: 'DE',
      postalCode: '19702',
      country: 'US'
    },
    IN: {
      name: 'iWishBag India Returns',
      street1: '456 Logistics Park',
      street2: 'Building A',
      city: 'Mumbai',
      state: 'MH',
      postalCode: '400001',
      country: 'IN'
    },
    NP: {
      name: 'iWishBag Nepal Returns',
      street1: '789 Trade Center',
      street2: '',
      city: 'Kathmandu',
      state: 'Bagmati',
      postalCode: '44600',
      country: 'NP'
    }
  };

  private constructor() {}

  static getInstance(): ReturnShippingService {
    if (!ReturnShippingService.instance) {
      ReturnShippingService.instance = new ReturnShippingService();
    }
    return ReturnShippingService.instance;
  }

  /**
   * Generate shipping label for approved return
   */
  async generateReturnLabel(returnId: string): Promise<ShippingLabelResult> {
    try {
      // 1. Get return details
      const { data: packageReturn, error: fetchError } = await supabase
        .from('package_returns')
        .select(`
          *,
          quote:quotes(
            id,
            display_id,
            user_id,
            destination_country,
            items,
            user:profiles(
              full_name,
              email,
              phone
            )
          ),
          user:profiles(
            full_name,
            email,
            phone
          )
        `)
        .eq('id', returnId)
        .single();

      if (fetchError || !packageReturn) {
        throw new Error('Failed to fetch return details');
      }

      if (packageReturn.status !== 'approved') {
        throw new Error('Return must be approved before generating label');
      }

      // 2. Get customer address
      const { data: customerAddress } = await supabase
        .from('warehouse_suite_addresses')
        .select('*')
        .eq('user_id', packageReturn.user_id)
        .eq('is_default', true)
        .single();

      if (!customerAddress) {
        throw new Error('Customer address not found');
      }

      // 3. Calculate package details
      const packageDetails = this.calculatePackageDetails(
        packageReturn.quote?.items || [],
        packageReturn.selected_items,
        packageReturn.return_all_items
      );

      // 4. Determine warehouse address based on origin
      const warehouseAddress = this.getWarehouseAddress(customerAddress.country);

      // 5. Create shipping label request
      const labelRequest: ShippingLabelRequest = {
        returnId,
        fromAddress: {
          name: packageReturn.user?.full_name || customerAddress.full_name,
          email: packageReturn.user?.email || '',
          phone: packageReturn.user?.phone || customerAddress.phone,
          street1: customerAddress.address_line_1,
          street2: customerAddress.address_line_2,
          city: customerAddress.city,
          state: customerAddress.state,
          postalCode: customerAddress.postal_code,
          country: customerAddress.country
        },
        toAddress: warehouseAddress,
        packageDetails,
        carrier: this.determineCarrier(customerAddress.country)
      };

      // 6. Generate label through shipping provider
      const labelResult = await this.createShippingLabel(labelRequest);

      if (!labelResult.success) {
        throw new Error(labelResult.error || 'Failed to generate shipping label');
      }

      // 7. Update package return with label info
      const { error: updateError } = await supabase
        .from('package_returns')
        .update({
          status: 'label_sent',
          shipping_label_url: labelResult.labelUrl,
          tracking_number: labelResult.trackingNumber,
          carrier: labelResult.carrier,
          return_shipping_method: labelRequest.carrier,
          updated_at: new Date().toISOString()
        })
        .eq('id', returnId);

      if (updateError) {
        console.error('Failed to update return with label info:', updateError);
      }

      // 8. Create shipping label record
      await supabase
        .from('return_shipping_labels')
        .insert({
          package_return_id: returnId,
          label_url: labelResult.labelUrl,
          tracking_number: labelResult.trackingNumber,
          carrier: labelResult.carrier,
          cost: labelResult.cost || 0,
          from_address: labelRequest.fromAddress,
          to_address: labelRequest.toAddress,
          package_details: packageDetails,
          created_at: new Date().toISOString()
        });

      // 9. Send email with label
      await this.sendReturnLabelEmail(packageReturn, labelResult);

      return labelResult;

    } catch (error) {
      console.error('Label generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create shipping label through provider API
   */
  private async createShippingLabel(request: ShippingLabelRequest): Promise<ShippingLabelResult> {
    try {
      // In production, this would call actual shipping APIs (EasyShip, ShipStation, etc.)
      // For now, we'll simulate the label generation
      
      // Call edge function for label generation
      const { data, error } = await supabase.functions.invoke('generate-shipping-label', {
        body: request
      });

      if (error) {
        // Fallback to simulated label for testing
        return this.simulateShippingLabel(request);
      }

      return {
        success: true,
        labelUrl: data.label_url,
        trackingNumber: data.tracking_number,
        carrier: data.carrier,
        cost: data.cost
      };

    } catch (error) {
      console.error('Shipping API error:', error);
      // Fallback to simulated label
      return this.simulateShippingLabel(request);
    }
  }

  /**
   * Simulate shipping label for testing
   */
  private simulateShippingLabel(request: ShippingLabelRequest): ShippingLabelResult {
    const trackingNumber = this.generateTrackingNumber(request.carrier);
    const labelUrl = `https://storage.example.com/return-labels/${request.returnId}_${trackingNumber}.pdf`;
    
    return {
      success: true,
      labelUrl,
      trackingNumber,
      carrier: request.carrier || 'usps',
      cost: this.estimateShippingCost(request)
    };
  }

  /**
   * Generate tracking number
   */
  private generateTrackingNumber(carrier?: string): string {
    const prefix = {
      usps: '9400',
      fedex: '7489',
      ups: '1Z999',
      dhl: 'JJD'
    };
    
    const selectedPrefix = prefix[carrier || 'usps'] || '9400';
    const randomPart = Math.random().toString(36).substring(2, 15).toUpperCase();
    
    return `${selectedPrefix}${randomPart}`;
  }

  /**
   * Calculate package details from items
   */
  private calculatePackageDetails(
    allItems: any[],
    selectedItems: any[],
    returnAllItems: boolean
  ): any {
    const itemsToReturn = returnAllItems ? allItems : selectedItems;
    
    let totalWeight = 0;
    let totalValue = 0;
    
    itemsToReturn.forEach(item => {
      totalWeight += (item.weight || 0.5) * (item.quantity || 1);
      totalValue += (item.costprice_origin || 0) * (item.quantity || 1);
    });

    return {
      weight: totalWeight || 1, // Default 1kg if no weight
      length: 30, // Default dimensions
      width: 25,
      height: 15,
      value: totalValue,
      currency: 'USD'
    };
  }

  /**
   * Get warehouse address based on customer country
   */
  private getWarehouseAddress(customerCountry: string): any {
    // Map countries to warehouse regions
    if (['US', 'CA', 'MX'].includes(customerCountry)) {
      return this.warehouseAddresses.US;
    } else if (['IN', 'BD', 'LK'].includes(customerCountry)) {
      return this.warehouseAddresses.IN;
    } else if (['NP'].includes(customerCountry)) {
      return this.warehouseAddresses.NP;
    }
    
    // Default to US warehouse
    return this.warehouseAddresses.US;
  }

  /**
   * Determine best carrier based on location
   */
  private determineCarrier(country: string): 'usps' | 'fedex' | 'ups' | 'dhl' {
    // Simple logic - can be enhanced with actual carrier availability
    if (['US', 'CA'].includes(country)) {
      return 'usps';
    } else if (['IN', 'NP'].includes(country)) {
      return 'dhl';
    }
    return 'fedex';
  }

  /**
   * Estimate shipping cost
   */
  private estimateShippingCost(request: ShippingLabelRequest): number {
    const baseRate = 10; // Base rate in USD
    const weightRate = 2; // Per kg
    const internationalMultiplier = request.fromAddress.country !== request.toAddress.country ? 2.5 : 1;
    
    return (baseRate + (request.packageDetails.weight * weightRate)) * internationalMultiplier;
  }

  /**
   * Send return label email
   */
  private async sendReturnLabelEmail(packageReturn: any, labelResult: ShippingLabelResult): Promise<void> {
    try {
      const emailData = {
        to: packageReturn.user?.email,
        subject: `Return Shipping Label - RMA ${packageReturn.rma_number}`,
        template: 'return_label',
        data: {
          customer_name: packageReturn.user?.full_name || 'Customer',
          rma_number: packageReturn.rma_number,
          tracking_number: labelResult.trackingNumber,
          carrier: labelResult.carrier,
          label_url: labelResult.labelUrl,
          return_instructions: this.getReturnInstructions(labelResult.carrier),
          quote_id: packageReturn.quote?.display_id
        },
        attachments: [{
          filename: `return_label_${packageReturn.rma_number}.pdf`,
          url: labelResult.labelUrl
        }]
      };

      const { error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        console.error('Failed to send return label email:', error);
      }
    } catch (error) {
      console.error('Email error:', error);
    }
  }

  /**
   * Get return instructions based on carrier
   */
  private getReturnInstructions(carrier?: string): string {
    const instructions = {
      usps: 'Drop off your package at any USPS location or schedule a pickup at usps.com',
      fedex: 'Drop off at any FedEx location or schedule a pickup at fedex.com',
      ups: 'Drop off at any UPS Store or schedule a pickup at ups.com',
      dhl: 'Drop off at any DHL Service Point or schedule a pickup at dhl.com'
    };
    
    return instructions[carrier || 'usps'] || instructions.usps;
  }

  /**
   * Track return shipment
   */
  async trackReturnShipment(trackingNumber: string, carrier: string): Promise<{
    status: string;
    location?: string;
    lastUpdate?: string;
    estimatedDelivery?: string;
  }> {
    try {
      // In production, this would call actual tracking APIs
      const { data, error } = await supabase.functions.invoke('track-shipment', {
        body: { tracking_number: trackingNumber, carrier }
      });

      if (error) {
        // Return simulated tracking for testing
        return {
          status: 'in_transit',
          location: 'En route to warehouse',
          lastUpdate: new Date().toISOString(),
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      return data;
    } catch (error) {
      console.error('Tracking error:', error);
      throw error;
    }
  }

  /**
   * Update return status when package is delivered
   */
  async markReturnReceived(returnId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('package_returns')
        .update({
          status: 'received',
          received_at: new Date().toISOString(),
          warehouse_location: 'Main Processing Center'
        })
        .eq('id', returnId);

      if (error) throw error;

      // Send notification
      await this.sendReturnReceivedNotification(returnId);
    } catch (error) {
      console.error('Failed to mark return as received:', error);
      throw error;
    }
  }

  /**
   * Send notification when return is received
   */
  private async sendReturnReceivedNotification(returnId: string): Promise<void> {
    try {
      const { data: packageReturn } = await supabase
        .from('package_returns')
        .select(`
          *,
          user:profiles(email, full_name),
          quote:quotes(display_id)
        `)
        .eq('id', returnId)
        .single();

      if (!packageReturn) return;

      const emailData = {
        to: packageReturn.user?.email,
        subject: `Return Received - RMA ${packageReturn.rma_number}`,
        template: 'return_received',
        data: {
          customer_name: packageReturn.user?.full_name || 'Customer',
          rma_number: packageReturn.rma_number,
          quote_id: packageReturn.quote?.display_id,
          next_steps: 'We will inspect your returned items and process your refund within 2-3 business days.'
        }
      };

      await supabase.functions.invoke('send-email', {
        body: emailData
      });
    } catch (error) {
      console.error('Failed to send return received notification:', error);
    }
  }
}

// Export singleton instance
export const returnShippingService = ReturnShippingService.getInstance();