/**
 * Customer Package Notification Service
 * 
 * Allows customers to notify the warehouse about incoming packages
 * before they arrive, improving logistics and package management.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CustomerPackageNotification {
  id: string;
  user_id: string;
  customer_address_id: string;
  tracking_number?: string;
  carrier: 'ups' | 'fedex' | 'usps' | 'dhl' | 'amazon' | 'other';
  sender_name?: string;
  sender_store?: string;
  expected_delivery_date?: string;
  estimated_weight_kg?: number;
  estimated_value_usd?: number;
  package_description?: string;
  special_instructions?: string;
  notification_status: 'pending' | 'acknowledged' | 'received' | 'not_received' | 'cancelled';
  warehouse_notes?: string;
  created_at: string;
  updated_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface PackageNotificationFormData {
  customer_address_id: string;
  tracking_number?: string;
  carrier: string;
  sender_name?: string;
  sender_store?: string;
  expected_delivery_date?: string;
  estimated_weight_kg?: number;
  estimated_value_usd?: number;
  package_description?: string;
  special_instructions?: string;
}

class CustomerPackageNotificationService {
  private static instance: CustomerPackageNotificationService;

  public static getInstance(): CustomerPackageNotificationService {
    if (!CustomerPackageNotificationService.instance) {
      CustomerPackageNotificationService.instance = new CustomerPackageNotificationService();
    }
    return CustomerPackageNotificationService.instance;
  }

  /**
   * Submit a new package notification
   */
  async submitPackageNotification(
    userId: string,
    notificationData: PackageNotificationFormData
  ): Promise<CustomerPackageNotification> {
    const { data, error } = await supabase
      .from('customer_package_notifications')
      .insert({
        user_id: userId,
        ...notificationData,
        notification_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit package notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Get customer's package notifications
   */
  async getCustomerNotifications(
    userId: string,
    status?: string
  ): Promise<CustomerPackageNotification[]> {
    let query = supabase
      .from('customer_package_notifications')
      .select(`
        *,
        customer_addresses(
          suite_number,
          full_address
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('notification_status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch package notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update package notification
   */
  async updatePackageNotification(
    notificationId: string,
    updates: Partial<CustomerPackageNotification>
  ): Promise<CustomerPackageNotification> {
    const { data, error } = await supabase
      .from('customer_package_notifications')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update package notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancel package notification
   */
  async cancelPackageNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_package_notifications')
      .update({
        notification_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to cancel package notification: ${error.message}`);
    }
  }

  /**
   * Get pending notifications for warehouse staff
   */
  async getPendingNotifications(): Promise<CustomerPackageNotification[]> {
    const { data, error } = await supabase
      .from('customer_package_notifications')
      .select(`
        *,
        customer_addresses(
          suite_number,
          full_address
        ),
        profiles(
          email,
          full_name
        )
      `)
      .eq('notification_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Acknowledge package notification (warehouse staff)
   */
  async acknowledgeNotification(
    notificationId: string,
    acknowledgedBy: string,
    warehouseNotes?: string
  ): Promise<CustomerPackageNotification> {
    const { data, error } = await supabase
      .from('customer_package_notifications')
      .update({
        notification_status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy,
        warehouse_notes: warehouseNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to acknowledge notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark notification as received (when package actually arrives)
   */
  async markAsReceived(
    notificationId: string,
    receivedPackageId?: string
  ): Promise<CustomerPackageNotification> {
    const { data, error } = await supabase
      .from('customer_package_notifications')
      .update({
        notification_status: 'received',
        received_package_id: receivedPackageId,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark notification as received: ${error.message}`);
    }

    return data;
  }

  /**
   * Get notification statistics for dashboard
   */
  async getNotificationStatistics(): Promise<{
    total_notifications: number;
    pending: number;
    acknowledged: number;
    received: number;
    not_received: number;
    cancelled: number;
    average_response_time_hours: number;
  }> {
    const { data, error } = await supabase.rpc('get_package_notification_statistics');

    if (error) {
      throw new Error(`Failed to fetch notification statistics: ${error.message}`);
    }

    return data;
  }

  /**
   * Search notifications by tracking number
   */
  async searchByTrackingNumber(trackingNumber: string): Promise<CustomerPackageNotification[]> {
    const { data, error } = await supabase
      .from('customer_package_notifications')
      .select(`
        *,
        customer_addresses(
          suite_number,
          full_address
        ),
        profiles(
          email,
          full_name
        )
      `)
      .ilike('tracking_number', `%${trackingNumber}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get overdue notifications (expected delivery date passed)
   */
  async getOverdueNotifications(): Promise<CustomerPackageNotification[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('customer_package_notifications')
      .select(`
        *,
        customer_addresses(
          suite_number,
          full_address
        ),
        profiles(
          email,
          full_name
        )
      `)
      .in('notification_status', ['pending', 'acknowledged'])
      .lt('expected_delivery_date', today)
      .order('expected_delivery_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch overdue notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get customer's virtual address options
   */
  async getCustomerAddresses(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch customer addresses: ${error.message}`);
    }

    return data || [];
  }
}

export const customerPackageNotificationService = CustomerPackageNotificationService.getInstance();