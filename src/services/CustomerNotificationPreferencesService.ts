/**
 * Customer Notification Preferences Service
 * 
 * Manages customer notification preferences for warehouse operations,
 * package status updates, and storage fee notifications.
 */

import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: 'package_received' | 'package_ready_to_ship' | 'package_shipped' | 'storage_fee_due' | 'storage_fee_waived' | 'consolidation_ready' | 'general_updates';
  channel: 'email' | 'sms' | 'in_app' | 'push';
  enabled: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesProfile {
  user_id: string;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  marketing_emails_enabled: boolean;
  phone_number?: string;
  preferred_language: string;
  timezone: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerNotificationSettings {
  preferences: NotificationPreference[];
  profile: NotificationPreferencesProfile;
}

class CustomerNotificationPreferencesService {
  private static instance: CustomerNotificationPreferencesService;

  public static getInstance(): CustomerNotificationPreferencesService {
    if (!CustomerNotificationPreferencesService.instance) {
      CustomerNotificationPreferencesService.instance = new CustomerNotificationPreferencesService();
    }
    return CustomerNotificationPreferencesService.instance;
  }

  /**
   * Get all notification preferences for a customer
   */
  async getCustomerNotificationSettings(userId: string): Promise<CustomerNotificationSettings> {
    const [preferencesResult, profileResult] = await Promise.all([
      supabase
        .from('customer_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('notification_type'),
      
      supabase
        .from('customer_notification_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);

    if (preferencesResult.error && preferencesResult.error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch notification preferences: ${preferencesResult.error.message}`);
    }

    // Create default profile if it doesn't exist
    let profile = profileResult.data;
    if (profileResult.error && profileResult.error.code === 'PGRST116') {
      profile = await this.createDefaultNotificationProfile(userId);
    } else if (profileResult.error) {
      throw new Error(`Failed to fetch notification profile: ${profileResult.error.message}`);
    }

    // Create default preferences if none exist
    let preferences = preferencesResult.data || [];
    if (preferences.length === 0) {
      preferences = await this.createDefaultNotificationPreferences(userId);
    }

    return {
      preferences,
      profile: profile!
    };
  }

  /**
   * Update customer notification preferences
   */
  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreference>[]
  ): Promise<NotificationPreference[]> {
    const updates = preferences.map(pref => ({
      ...pref,
      user_id: userId,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('customer_notification_preferences')
      .upsert(updates, { 
        onConflict: 'user_id,notification_type,channel',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      throw new Error(`Failed to update notification preferences: ${error.message}`);
    }

    return data;
  }

  /**
   * Update customer notification profile
   */
  async updateNotificationProfile(
    userId: string, 
    profile: Partial<NotificationPreferencesProfile>
  ): Promise<NotificationPreferencesProfile> {
    const { data, error } = await supabase
      .from('customer_notification_profiles')
      .upsert({
        ...profile,
        user_id: userId,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update notification profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if customer should receive notification
   */
  async shouldSendNotification(
    userId: string, 
    notificationType: NotificationPreference['notification_type'],
    channel: NotificationPreference['channel']
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('customer_notification_preferences')
      .select('enabled')
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .eq('channel', channel)
      .single();

    if (error) {
      // Default to enabled if preference doesn't exist
      return true;
    }

    return data.enabled;
  }

  /**
   * Get customers who should receive bulk notifications
   */
  async getCustomersForBulkNotification(
    notificationType: NotificationPreference['notification_type'],
    channel: NotificationPreference['channel']
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from('customer_notification_preferences')
      .select('user_id')
      .eq('notification_type', notificationType)
      .eq('channel', channel)
      .eq('enabled', true);

    if (error) {
      throw new Error(`Failed to fetch customers for bulk notification: ${error.message}`);
    }

    return data.map(item => item.user_id);
  }

  /**
   * Create default notification preferences for a new customer
   */
  private async createDefaultNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    const defaultPreferences = [
      // Package notifications
      { notification_type: 'package_received', channel: 'email', enabled: true, frequency: 'immediate' },
      { notification_type: 'package_received', channel: 'in_app', enabled: true, frequency: 'immediate' },
      { notification_type: 'package_ready_to_ship', channel: 'email', enabled: true, frequency: 'immediate' },
      { notification_type: 'package_ready_to_ship', channel: 'in_app', enabled: true, frequency: 'immediate' },
      { notification_type: 'package_shipped', channel: 'email', enabled: true, frequency: 'immediate' },
      { notification_type: 'package_shipped', channel: 'sms', enabled: false, frequency: 'immediate' },
      { notification_type: 'package_shipped', channel: 'in_app', enabled: true, frequency: 'immediate' },
      
      // Storage fee notifications
      { notification_type: 'storage_fee_due', channel: 'email', enabled: true, frequency: 'daily' },
      { notification_type: 'storage_fee_due', channel: 'in_app', enabled: true, frequency: 'immediate' },
      { notification_type: 'storage_fee_waived', channel: 'email', enabled: true, frequency: 'immediate' },
      { notification_type: 'storage_fee_waived', channel: 'in_app', enabled: true, frequency: 'immediate' },
      
      // Consolidation notifications
      { notification_type: 'consolidation_ready', channel: 'email', enabled: true, frequency: 'immediate' },
      { notification_type: 'consolidation_ready', channel: 'in_app', enabled: true, frequency: 'immediate' },
      
      // General updates
      { notification_type: 'general_updates', channel: 'email', enabled: false, frequency: 'weekly' },
      { notification_type: 'general_updates', channel: 'in_app', enabled: true, frequency: 'immediate' }
    ].map(pref => ({
      ...pref,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('customer_notification_preferences')
      .insert(defaultPreferences)
      .select();

    if (error) {
      throw new Error(`Failed to create default notification preferences: ${error.message}`);
    }

    return data;
  }

  /**
   * Create default notification profile for a new customer
   */
  private async createDefaultNotificationProfile(userId: string): Promise<NotificationPreferencesProfile> {
    const defaultProfile = {
      user_id: userId,
      email_notifications_enabled: true,
      sms_notifications_enabled: false,
      push_notifications_enabled: true,
      marketing_emails_enabled: false,
      preferred_language: 'en',
      timezone: 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('customer_notification_profiles')
      .insert(defaultProfile)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default notification profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Disable all notifications for a customer (unsubscribe)
   */
  async unsubscribeCustomer(userId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_notification_preferences')
      .update({ 
        enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to unsubscribe customer: ${error.message}`);
    }

    // Also update profile
    await this.updateNotificationProfile(userId, {
      email_notifications_enabled: false,
      sms_notifications_enabled: false,
      push_notifications_enabled: false,
      marketing_emails_enabled: false
    });
  }

  /**
   * Get notification statistics for admin dashboard
   */
  async getNotificationStatistics(): Promise<{
    total_customers: number;
    email_enabled: number;
    sms_enabled: number;
    push_enabled: number;
    fully_subscribed: number;
    unsubscribed: number;
  }> {
    const { data, error } = await supabase.rpc('get_notification_statistics');

    if (error) {
      throw new Error(`Failed to fetch notification statistics: ${error.message}`);
    }

    return data;
  }
}

export const customerNotificationPreferencesService = CustomerNotificationPreferencesService.getInstance();