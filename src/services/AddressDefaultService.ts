/**
 * Address Default Service
 * 
 * Handles smart default address behavior following Amazon/Shopify patterns:
 * - Auto-set first address as default
 * - Manage default address logic
 * - Provide utilities for address management
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { Tables } from '@/integrations/supabase/types';

export class AddressDefaultService {
  private static instance: AddressDefaultService;

  private constructor() {}

  static getInstance(): AddressDefaultService {
    if (!AddressDefaultService.instance) {
      AddressDefaultService.instance = new AddressDefaultService();
    }
    return AddressDefaultService.instance;
  }

  /**
   * Check if user has any existing addresses
   */
  async hasExistingAddresses(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        logger.error('Error checking existing addresses:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error('Failed to check existing addresses:', error);
      return false;
    }
  }

  /**
   * Check if user has a default address
   */
  async hasDefaultAddress(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .limit(1);

      if (error) {
        logger.error('Error checking default address:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error('Failed to check default address:', error);
      return false;
    }
  }

  /**
   * Get user's default address
   */
  async getDefaultAddress(userId: string): Promise<Tables<'delivery_addresses'> | null> {
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No default address found
          return null;
        }
        logger.error('Error getting default address:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get default address:', error);
      return null;
    }
  }

  /**
   * Determine if an address should be set as default
   * Following Amazon/Shopify pattern: first address is always default
   */
  async shouldBeDefault(userId: string): Promise<boolean> {
    try {
      const hasExisting = await this.hasExistingAddresses(userId);
      
      // If no existing addresses, this should be default
      if (!hasExisting) {
        return true;
      }

      // If has existing addresses but no default, this should be default
      const hasDefault = await this.hasDefaultAddress(userId);
      return !hasDefault;
    } catch (error) {
      logger.error('Failed to determine if address should be default:', error);
      // Safe fallback: don't set as default if we can't determine
      return false;
    }
  }

  /**
   * Set an address as default (handles unsetting previous default)
   */
  async setAsDefault(addressId: string, userId: string): Promise<boolean> {
    try {
      // First, unset all default flags for this user
      const { error: unsetError } = await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);

      if (unsetError) {
        logger.error('Error unsetting previous defaults:', unsetError);
        return false;
      }

      // Then set the selected address as default
      const { error: setError } = await supabase
        .from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', userId);

      if (setError) {
        logger.error('Error setting address as default:', setError);
        return false;
      }

      logger.info('Successfully set address as default:', { addressId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to set address as default:', error);
      return false;
    }
  }

  /**
   * Get the best address to auto-select for checkout/quote forms
   * Priority: Default address > Most recent address > First address
   */
  async getBestAddressForAutoSelect(userId: string): Promise<Tables<'delivery_addresses'> | null> {
    try {
      // First try to get default address
      const defaultAddress = await this.getDefaultAddress(userId);
      if (defaultAddress) {
        return defaultAddress;
      }

      // If no default, get most recently created address
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No addresses found
          return null;
        }
        logger.error('Error getting best address for auto-select:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get best address for auto-select:', error);
      return null;
    }
  }

  /**
   * Fix addresses that should be default but aren't
   * Useful for migrating existing data
   */
  async fixMissingDefaults(): Promise<void> {
    try {
      // Get all users who have addresses but no default
      const { data: usersWithoutDefault, error } = await supabase
        .rpc('get_users_without_default_address');

      if (error) {
        logger.error('Error getting users without default addresses:', error);
        return;
      }

      if (!usersWithoutDefault || usersWithoutDefault.length === 0) {
        logger.info('No users found without default addresses');
        return;
      }

      logger.info(`Found ${usersWithoutDefault.length} users without default addresses`);

      // For each user, set their first address as default
      for (const user of usersWithoutDefault) {
        const { data: firstAddress, error: addressError } = await supabase
          .from('delivery_addresses')
          .select('id')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (addressError || !firstAddress) {
          logger.warn(`No addresses found for user ${user.user_id}`);
          continue;
        }

        const success = await this.setAsDefault(firstAddress.id, user.user_id);
        if (success) {
          logger.info(`Set default address for user ${user.user_id}`);
        }
      }
    } catch (error) {
      logger.error('Failed to fix missing defaults:', error);
    }
  }
}

export const addressDefaultService = AddressDefaultService.getInstance();