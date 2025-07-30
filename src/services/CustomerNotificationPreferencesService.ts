/**
 * Customer Notification Preferences Service
 * 
 * Manages customer notification preferences for warehouse operations,
 * package status updates, and storage fee notifications.
 * 
 * Updated to use consolidated notification_preferences_unified table
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

// New unified preferences interface
export interface UnifiedNotificationPreferences {
  id: string;
  user_id: string;
  all_notifications_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  preferences: {
    package?: { enabled: boolean; channels: string[] };
    payment?: { enabled: boolean; channels: string[] };
    order?: { enabled: boolean; channels: string[] };
    support?: { enabled: boolean; channels: string[] };
    marketing?: { enabled: boolean; channels: string[] };
    system?: { enabled: boolean; channels: string[] };
  };
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  language: string;
  frequency: string;
  created_at: string;
  updated_at: string;
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
   * Now uses the unified preferences table and converts to legacy format for compatibility
   */
  async getCustomerNotificationSettings(userId: string): Promise<CustomerNotificationSettings> {
    // Fetch from unified preferences table
    const { data: unifiedPrefs, error } = await supabase
      .from('notification_preferences_unified')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch notification preferences: ${error.message}`);
    }

    // Create default preferences if none exist
    const prefs = unifiedPrefs || await this.createDefaultUnifiedPreferences(userId);

    // Convert unified preferences to legacy format for backward compatibility
    return this.convertUnifiedToLegacyFormat(prefs);
  }

  /**
   * Update customer notification preferences
   * Updates the unified preferences based on individual preference changes
   */
  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreference>[]
  ): Promise<NotificationPreference[]> {
    // First get current unified preferences
    const { data: currentPrefs } = await supabase
      .from('notification_preferences_unified')
      .select('*')
      .eq('user_id', userId)
      .single();

    const unifiedPrefs = currentPrefs || await this.createDefaultUnifiedPreferences(userId);

    // Update the preferences object based on the individual preferences
    const updatedPreferences = { ...unifiedPrefs.preferences };
    
    for (const pref of preferences) {
      if (!pref.notification_type || pref.channel === undefined) continue;
      
      // Map notification types to categories
      const category = this.mapNotificationTypeToCategory(pref.notification_type);
      if (!category) continue;

      if (!updatedPreferences[category]) {
        updatedPreferences[category] = { enabled: true, channels: [] };
      }

      if (pref.enabled) {
        // Add channel if not already present
        if (!updatedPreferences[category].channels.includes(pref.channel)) {
          updatedPreferences[category].channels.push(pref.channel);
        }
      } else {
        // Remove channel
        updatedPreferences[category].channels = updatedPreferences[category].channels.filter(
          (ch: string) => ch !== pref.channel
        );
      }
    }

    // Update unified preferences
    const { data, error } = await supabase
      .from('notification_preferences_unified')
      .update({
        preferences: updatedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update notification preferences: ${error.message}`);
    }

    // Convert back to legacy format
    const legacySettings = this.convertUnifiedToLegacyFormat(data);
    return legacySettings.preferences;
  }

  /**
   * Update customer notification profile
   * Updates the unified preferences with profile settings
   */
  async updateNotificationProfile(
    userId: string, 
    profile: Partial<NotificationPreferencesProfile>
  ): Promise<NotificationPreferencesProfile> {
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Map profile fields to unified preferences
    if (profile.email_notifications_enabled !== undefined) {
      updates.email_enabled = profile.email_notifications_enabled;
    }
    if (profile.sms_notifications_enabled !== undefined) {
      updates.sms_enabled = profile.sms_notifications_enabled;
    }
    if (profile.push_notifications_enabled !== undefined) {
      updates.push_enabled = profile.push_notifications_enabled;
    }
    if (profile.marketing_emails_enabled !== undefined) {
      // Update marketing preferences
      const { data: currentPrefs } = await supabase
        .from('notification_preferences_unified')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (currentPrefs) {
        const preferences = { ...currentPrefs.preferences };
        preferences.marketing = {
          enabled: profile.marketing_emails_enabled,
          channels: profile.marketing_emails_enabled ? ['email'] : []
        };
        updates.preferences = preferences;
      }
    }
    if (profile.preferred_language) {
      updates.language = profile.preferred_language;
    }
    if (profile.timezone) {
      updates.timezone = profile.timezone;
    }
    if (profile.quiet_hours_start) {
      updates.quiet_hours_start = profile.quiet_hours_start;
      updates.quiet_hours_enabled = true;
    }
    if (profile.quiet_hours_end) {
      updates.quiet_hours_end = profile.quiet_hours_end;
    }

    const { data, error } = await supabase
      .from('notification_preferences_unified')
      .upsert({
        user_id: userId,
        ...updates
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update notification profile: ${error.message}`);
    }

    // Convert back to legacy profile format
    const legacySettings = this.convertUnifiedToLegacyFormat(data);
    return legacySettings.profile;
  }

  /**
   * Check if customer should receive notification
   * Uses the new should_send_notification database function
   */
  async shouldSendNotification(
    userId: string,
    notificationType: NotificationPreference['notification_type'],
    channel: NotificationPreference['channel']
  ): Promise<boolean> {
    const category = this.mapNotificationTypeToCategory(notificationType);
    
    const { data, error } = await supabase
      .rpc('should_send_notification', {
        p_user_id: userId,
        p_notification_type: category,
        p_channel: channel
      });

    if (error) {
      console.error('Error checking notification preference:', error);
      return false; // Default to not sending on error
    }

    return data || false;
  }

  /**
   * Get notification preferences for multiple users
   */
  async getBulkNotificationPreferences(
    userIds: string[],
    notificationType: NotificationPreference['notification_type'],
    channel: NotificationPreference['channel']
  ): Promise<Map<string, boolean>> {
    const category = this.mapNotificationTypeToCategory(notificationType);
    const preferenceMap = new Map<string, boolean>();

    // Fetch all unified preferences for the users
    const { data, error } = await supabase
      .from('notification_preferences_unified')
      .select('*')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching bulk preferences:', error);
      // Default all to true on error
      userIds.forEach(id => preferenceMap.set(id, true));
      return preferenceMap;
    }

    // Process each user's preferences
    for (const userId of userIds) {
      const userPrefs = data?.find(p => p.user_id === userId);
      
      if (!userPrefs || !userPrefs.all_notifications_enabled) {
        preferenceMap.set(userId, false);
        continue;
      }

      // Check channel enablement
      const channelEnabled = this.isChannelEnabled(userPrefs, channel);
      if (!channelEnabled) {
        preferenceMap.set(userId, false);
        continue;
      }

      // Check category preferences
      const categoryPrefs = userPrefs.preferences[category];
      const isEnabled = categoryPrefs?.enabled && categoryPrefs.channels.includes(channel);
      
      preferenceMap.set(userId, isEnabled || false);
    }

    return preferenceMap;
  }

  /**
   * Create default notification preferences if none exist
   */
  private async createDefaultUnifiedPreferences(userId: string): Promise<UnifiedNotificationPreferences> {
    const defaultPreferences = {
      user_id: userId,
      all_notifications_enabled: true,
      email_enabled: true,
      sms_enabled: true,
      push_enabled: true,
      in_app_enabled: true,
      preferences: {
        package: { enabled: true, channels: ['email', 'sms', 'in_app'] },
        payment: { enabled: true, channels: ['email', 'in_app'] },
        order: { enabled: true, channels: ['email', 'in_app'] },
        support: { enabled: true, channels: ['email', 'in_app'] },
        marketing: { enabled: false, channels: [] },
        system: { enabled: true, channels: ['in_app'] }
      },
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'UTC',
      language: 'en',
      frequency: 'immediate'
    };

    const { data, error } = await supabase
      .from('notification_preferences_unified')
      .insert(defaultPreferences)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default preferences: ${error.message}`);
    }

    return data;
  }

  /**
   * Convert unified preferences to legacy format for backward compatibility
   */
  private convertUnifiedToLegacyFormat(unifiedPrefs: UnifiedNotificationPreferences): CustomerNotificationSettings {
    // Convert to legacy preferences array
    const preferences: NotificationPreference[] = [];
    const notificationTypes: NotificationPreference['notification_type'][] = [
      'package_received', 'package_ready_to_ship', 'package_shipped',
      'storage_fee_due', 'storage_fee_waived', 'consolidation_ready', 'general_updates'
    ];
    const channels: NotificationPreference['channel'][] = ['email', 'sms', 'in_app', 'push'];

    for (const notificationType of notificationTypes) {
      const category = this.mapNotificationTypeToCategory(notificationType);
      const categoryPrefs = unifiedPrefs.preferences[category];

      for (const channel of channels) {
        preferences.push({
          id: `${unifiedPrefs.id}-${notificationType}-${channel}`,
          user_id: unifiedPrefs.user_id,
          notification_type: notificationType,
          channel: channel,
          enabled: categoryPrefs?.enabled && categoryPrefs.channels.includes(channel) || false,
          frequency: unifiedPrefs.frequency as any,
          created_at: unifiedPrefs.created_at,
          updated_at: unifiedPrefs.updated_at
        });
      }
    }

    // Convert to legacy profile
    const profile: NotificationPreferencesProfile = {
      user_id: unifiedPrefs.user_id,
      email_notifications_enabled: unifiedPrefs.email_enabled,
      sms_notifications_enabled: unifiedPrefs.sms_enabled,
      push_notifications_enabled: unifiedPrefs.push_enabled,
      marketing_emails_enabled: unifiedPrefs.preferences.marketing?.enabled || false,
      preferred_language: unifiedPrefs.language,
      timezone: unifiedPrefs.timezone,
      quiet_hours_start: unifiedPrefs.quiet_hours_enabled ? unifiedPrefs.quiet_hours_start : undefined,
      quiet_hours_end: unifiedPrefs.quiet_hours_enabled ? unifiedPrefs.quiet_hours_end : undefined,
      created_at: unifiedPrefs.created_at,
      updated_at: unifiedPrefs.updated_at
    };

    return { preferences, profile };
  }

  /**
   * Map notification type to category
   */
  private mapNotificationTypeToCategory(notificationType: string): string {
    switch (notificationType) {
      case 'package_received':
      case 'package_ready_to_ship':
      case 'package_shipped':
      case 'consolidation_ready':
        return 'package';
      case 'storage_fee_due':
      case 'storage_fee_waived':
        return 'payment';
      case 'general_updates':
        return 'system';
      default:
        return 'system';
    }
  }

  /**
   * Check if channel is enabled
   */
  private isChannelEnabled(prefs: UnifiedNotificationPreferences, channel: string): boolean {
    switch (channel) {
      case 'email': return prefs.email_enabled;
      case 'sms': return prefs.sms_enabled;
      case 'push': return prefs.push_enabled;
      case 'in_app': return prefs.in_app_enabled;
      default: return true;
    }
  }

  /**
   * Create default notification preferences (legacy - for compatibility)
   */
  private async createDefaultNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    // This method is kept for compatibility but now creates unified preferences
    await this.createDefaultUnifiedPreferences(userId);
    const settings = await this.getCustomerNotificationSettings(userId);
    return settings.preferences;
  }

  /**
   * Create default notification profile (legacy - for compatibility)
   */
  private async createDefaultNotificationProfile(userId: string): Promise<NotificationPreferencesProfile> {
    // This method is kept for compatibility but now creates unified preferences
    await this.createDefaultUnifiedPreferences(userId);
    const settings = await this.getCustomerNotificationSettings(userId);
    return settings.profile;
  }
}

export const customerNotificationPreferencesService = CustomerNotificationPreferencesService.getInstance();