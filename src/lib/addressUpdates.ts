import { supabase } from '@/integrations/supabase/client';
import { ShippingAddress, AddressUpdateRequest } from '@/types/address';
import {
  validateAddress,
  validateCountryChange,
  normalizeAddress,
  compareAddresses,
} from './addressValidation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Updates a quote's shipping address with validation and audit trail
 */
export async function updateQuoteAddress(
  quoteId: string,
  newAddress: ShippingAddress,
  userId: string,
  reason?: string,
): Promise<{
  success: boolean;
  error?: string;
  changes?: Record<string, unknown>[];
}> {
  try {
    // Get current quote data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('shipping_address, address_locked, user_id, destination_country')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: 'Quote not found' };
    }

    // Check if address is locked
    if (quote.address_locked) {
      return {
        success: false,
        error: 'Address is locked and cannot be modified',
      };
    }

    // Normalize the new address
    const normalizedAddress = normalizeAddress(newAddress);

    // Validate the address
    const validation = validateAddress(normalizedAddress);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Address validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Get user role for permission checking
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const currentRole = userRole?.role || 'user';

    // Check country change permissions
    const oldCountry = quote.shipping_address?.country || quote.destination_country;
    const countryValidation = validateCountryChange(
      oldCountry,
      normalizedAddress.country,
      currentRole,
    );

    if (!countryValidation.allowed) {
      return { success: false, error: countryValidation.reason };
    }

    // Compare addresses to track changes
    const oldAddress = quote.shipping_address || {};
    const changes = compareAddresses(oldAddress, normalizedAddress);

    // Update the quote with new address
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        shipping_address: normalizedAddress,
        address_updated_at: new Date().toISOString(),
        address_updated_by: userId,
      })
      .eq('id', quoteId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update address: ${updateError.message}`,
      };
    }

    return { success: true, changes };
  } catch (error) {
    console.error('Error updating quote address:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Locks a quote's address after payment completion
 */
export async function lockAddressAfterPayment(
  quoteId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        address_locked: true,
        address_updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .in('status', ['paid', 'ordered', 'shipped', 'completed']);

    if (error) {
      return {
        success: false,
        error: `Failed to lock address: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error locking address after payment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Unlocks a quote's address (admin only)
 */
export async function unlockAddress(
  quoteId: string,
  adminUserId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .single();

    if (userRole?.role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can unlock addresses',
      };
    }

    const { error } = await supabase
      .from('quotes')
      .update({
        address_locked: false,
        address_updated_at: new Date().toISOString(),
        address_updated_by: adminUserId,
      })
      .eq('id', quoteId);

    if (error) {
      return {
        success: false,
        error: `Failed to unlock address: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unlocking address:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Gets address change history for a quote
 */
export async function getAddressHistory(
  quoteId: string,
): Promise<{ data?: Record<string, unknown>[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('quote_address_history')
      .select(
        `
        id,
        old_address,
        new_address,
        changed_by,
        changed_at,
        change_reason,
        change_type
      `,
      )
      .eq('quote_id', quoteId)
      .order('changed_at', { ascending: false });

    if (error) {
      return { error: `Failed to fetch address history: ${error.message}` };
    }

    return { data };
  } catch (error) {
    console.error('Error fetching address history:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Checks if a user can edit a quote's address
 */
export async function checkAddressPermissions(
  quoteId: string,
  userId: string,
): Promise<{
  canEdit: boolean;
  canChangeCountry: boolean;
  isLocked: boolean;
  reason?: string;
}> {
  try {
    // Get quote data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('address_locked, user_id, status')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return {
        canEdit: false,
        canChangeCountry: false,
        isLocked: true,
        reason: 'Quote not found',
      };
    }

    // Check if address is locked
    if (quote.address_locked) {
      return {
        canEdit: false,
        canChangeCountry: false,
        isLocked: true,
        reason: 'Address is locked after payment',
      };
    }

    // Get user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const currentRole = userRole?.role || 'user';

    // Check if user owns the quote or is admin
    const isOwner = quote.user_id === userId;
    const isAdmin = currentRole === 'admin';

    if (!isOwner && !isAdmin) {
      return {
        canEdit: false,
        canChangeCountry: false,
        isLocked: false,
        reason: 'You can only edit your own quotes',
      };
    }

    return {
      canEdit: true,
      canChangeCountry: isAdmin,
      isLocked: false,
    };
  } catch (error) {
    console.error('Error checking address permissions:', error);
    return {
      canEdit: false,
      canChangeCountry: false,
      isLocked: true,
      reason: 'Error checking permissions',
    };
  }
}

/**
 * Creates initial address for a quote
 */
export async function createInitialAddress(
  quoteId: string,
  address: ShippingAddress,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize and validate address
    const normalizedAddress = normalizeAddress(address);
    const validation = validateAddress(normalizedAddress);

    if (!validation.isValid) {
      return {
        success: false,
        error: `Address validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Update quote with initial address
    const { error } = await supabase
      .from('quotes')
      .update({
        shipping_address: normalizedAddress,
        address_updated_at: new Date().toISOString(),
        address_updated_by: userId,
      })
      .eq('id', quoteId);

    if (error) {
      return {
        success: false,
        error: `Failed to create address: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating initial address:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Bulk update addresses for multiple quotes (admin only)
 */
export async function bulkUpdateAddresses(
  quoteIds: string[],
  address: ShippingAddress,
  adminUserId: string,
  reason?: string,
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  try {
    // Verify admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .single();

    if (userRole?.role !== 'admin') {
      return {
        success: false,
        updated: 0,
        errors: ['Only administrators can perform bulk updates'],
      };
    }

    // Normalize and validate address
    const normalizedAddress = normalizeAddress(address);
    const validation = validateAddress(normalizedAddress);

    if (!validation.isValid) {
      return {
        success: false,
        updated: 0,
        errors: [`Address validation failed: ${validation.errors.join(', ')}`],
      };
    }

    const errors: string[] = [];
    let updated = 0;

    // Update each quote
    for (const quoteId of quoteIds) {
      try {
        const { error } = await supabase
          .from('quotes')
          .update({
            shipping_address: normalizedAddress,
            address_updated_at: new Date().toISOString(),
            address_updated_by: adminUserId,
          })
          .eq('id', quoteId);

        if (error) {
          errors.push(`Quote ${quoteId}: ${error.message}`);
        } else {
          updated++;
        }
      } catch (error) {
        errors.push(`Quote ${quoteId}: Unexpected error`);
      }
    }

    return {
      success: updated > 0,
      updated,
      errors,
    };
  } catch (error) {
    console.error('Error in bulk address update:', error);
    return {
      success: false,
      updated: 0,
      errors: ['An unexpected error occurred'],
    };
  }
}

/**
 * Extracts shipping address from internal_notes field (temporary solution)
 * This is used until the proper address management migration is run
 */
export function extractShippingAddressFromNotes(internalNotes: string | null): {
  fullName: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode?: string;
} | null {
  if (!internalNotes) return null;

  try {
    const parsed = JSON.parse(internalNotes);
    if (parsed.shipping_address) {
      return parsed.shipping_address;
    }
  } catch (error) {
    console.error('Error parsing shipping address from internal_notes:', error);
  }

  return null;
}

/**
 * Formats shipping address for display
 */
export function formatShippingAddress(address: {
  fullName: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode?: string;
}): string {
  const parts = [
    address.fullName,
    address.streetAddress,
    address.addressLine2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean);

  return parts.join('\n');
}
