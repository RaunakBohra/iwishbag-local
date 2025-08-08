import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryService } from '@/services/delivery/DeliveryService';
import { DeliveryAddress } from '@/services/delivery/types';
import { useToast } from './use-toast';

interface CreateDeliveryOrderParams {
  quoteId: string;
  quote: any;
}

export const useDeliveryIntegration = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createDeliveryOrder = async ({ quoteId, quote }: CreateDeliveryOrderParams) => {
    setLoading(true);
    try {
      // Initialize delivery service
      const deliveryService = DeliveryService.getInstance();
      await deliveryService.initialize();

      // Prepare addresses based on destination country
      const fromAddress = getOriginAddress(quote.origin_country || 'US');
      const toAddress = getCustomerAddress(quote);

      if (!toAddress.phone || !toAddress.addressLine1 || !toAddress.city) {
        throw new Error('Incomplete delivery address');
      }

      // Calculate total weight
      const totalWeight = quote.items?.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.weight) || 0.5), 0) || 1;

      // Check if COD is needed
      const requiresCOD = quote.payment_method === 'cod' || quote.payment_status === 'pending';

      // Prepare order data
      const orderData = {
        orderId: quoteId,
        from: fromAddress,
        to: toAddress,
        weight: totalWeight,
        value: quote.final_total_origincurrency || 0,
        currency: 'USD',
        service: 'Standard',
        reference: quote.display_id || quote.id,
        invoice: {
          number: quote.display_id || quote.id,
          date: new Date(),
          items: quote.items?.map((item: any) => ({
            description: item.product_name || item.title || 'Product',
            quantity: item.quantity || 1,
            value: item.costprice_origin || item.price || 0
          })) || []
        },
        cod: requiresCOD ? {
          amount: quote.final_total_origincurrency || 0,
          currency: 'USD'
        } : undefined,
        instructions: quote.ncm_delivery_instruction || quote.customer_data?.delivery_instructions
      };

      // Create shipment with auto-selection
      const { provider, order } = await deliveryService.createShipmentAuto(
        orderData,
        {
          preferredProvider: quote.delivery_provider,
          maxDays: 7
        }
      );

      // Update quote with delivery info
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          delivery_provider: provider,
          delivery_tracking_number: order.trackingNumber,
          delivery_provider_order_id: order.providerOrderId,
          delivery_estimated_date: order.estimatedDelivery,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      toast({
        title: 'Delivery order created',
        description: `Order sent to ${provider} with tracking: ${order.trackingNumber}`,
      });

      return { provider, order };
    } catch (error: any) {
      console.error('Error creating delivery order:', error);
      toast({
        title: 'Delivery order failed',
        description: error.message || 'Failed to create delivery order',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryOptions = async (quote: any) => {
    try {
      const deliveryService = DeliveryService.getInstance();
      await deliveryService.initialize();

      const fromAddress = getOriginAddress(quote.origin_country || 'US');
      const toAddress = getCustomerAddress(quote);

      // Calculate total weight
      const totalWeight = quote.items?.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.weight) || 0.5), 0) || 1;

      const options = await deliveryService.getDeliveryOptions({
        from: fromAddress,
        to: toAddress,
        weight: totalWeight,
        value: quote.final_total_origincurrency || 0,
        requiresCOD: quote.payment_method === 'cod'
      });

      return options;
    } catch (error) {
      console.error('Error getting delivery options:', error);
      return [];
    }
  };

  const trackDelivery = async (trackingNumber: string, providerCode?: string) => {
    try {
      const deliveryService = DeliveryService.getInstance();
      await deliveryService.initialize();

      const trackingInfo = await deliveryService.trackShipment(trackingNumber, providerCode);
      return trackingInfo;
    } catch (error) {
      console.error('Error tracking delivery:', error);
      throw error;
    }
  };

  return {
    createDeliveryOrder,
    getDeliveryOptions,
    trackDelivery,
    loading
  };
};

// Helper functions
function getOriginAddress(country: string): DeliveryAddress {
  const originAddresses: Record<string, DeliveryAddress> = {
    US: {
      name: 'iwishBag US Hub',
      phone: '+14155552671',
      addressLine1: '123 Warehouse Ave',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'US'
    },
    NP: {
      name: 'iwishBag Nepal Hub',
      phone: '+9771234567890',
      addressLine1: 'Tinkune',
      city: 'Kathmandu',
      state: 'Bagmati',
      postalCode: '44600',
      country: 'NP'
    },
    IN: {
      name: 'iwishBag India Warehouse',
      phone: '+911234567890',
      addressLine1: '456 Logistics Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'IN'
    }
  };

  return originAddresses[country] || originAddresses.US;
}

function getCustomerAddress(quote: any): DeliveryAddress {
  const customerData = quote.customer_data || {};
  const shippingAddress = customerData.shipping_address || customerData;

  return {
    name: shippingAddress.name || customerData.name || 'Customer',
    phone: shippingAddress.phone || customerData.phone || '',
    alternatePhone: shippingAddress.alternate_phone,
    addressLine1: shippingAddress.line1 || shippingAddress.address_line_1 || '',
    addressLine2: shippingAddress.line2 || shippingAddress.address_line_2,
    city: shippingAddress.city || '',
    state: shippingAddress.state || shippingAddress.province || '',
    postalCode: shippingAddress.postal_code || shippingAddress.zip || '',
    country: quote.destination_country || 'US',
    landmark: shippingAddress.landmark
  };
}