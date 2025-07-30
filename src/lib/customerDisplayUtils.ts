/**
 * Customer Display Utilities
 *
 * Provides consistent customer information display across the iwishBag platform.
 * Handles all customer scenarios: registered users, guest users, admin-created orders.
 */

import { Tables } from '@/integrations/supabase/types';

type QuoteData = Tables<'quotes'>;

interface CustomerProfile {
  full_name: string | null;
  phone: string | null;
}

export type CustomerType = 'registered' | 'guest' | 'admin_created' | 'unknown';

export interface CustomerDisplayData {
  name: string;
  email: string | null;
  phone: string | null;
  type: CustomerType;
  isGuest: boolean;
}

/**
 * Determines the customer type based on available data
 */
export function getCustomerType(quote: QuoteData): CustomerType {
  // Check if has user_id (registered user)
  if (quote.user_id) {
    return 'registered';
  }

  // Check if has customer_data but no user_id (guest or admin-created)
  if (quote.customer_data?.info) {
    // If has comprehensive info, likely admin-created
    if (quote.customer_data.info.name && quote.customer_data.info.email) {
      return 'admin_created';
    }
    // Otherwise guest user
    return 'guest';
  }

  // Legacy fields suggest admin creation
  if (quote.customer_name) {
    return 'admin_created';
  }

  return 'unknown';
}

/**
 * Gets the customer display name with proper fallback chain
 */
export function getCustomerDisplayName(
  quote: QuoteData,
  customerProfile?: CustomerProfile | null,
): string {
  // Priority 1: customer_data.info.name (works for all scenarios)
  if (quote.customer_data?.info?.name) {
    return quote.customer_data.info.name;
  }

  // Priority 2: Profile full_name (registered users)
  if (customerProfile?.full_name) {
    return customerProfile.full_name;
  }

  // Priority 3: Shipping address fullName (often contains customer name)
  if (quote.customer_data?.shipping_address?.fullName) {
    return quote.customer_data.shipping_address.fullName;
  }

  // Priority 4: Legacy customer_name (admin-created orders)
  if (quote.customer_name) {
    return quote.customer_name;
  }

  // Priority 5: Email prefix for registered users (better than "Guest")
  if (quote.user_id && (quote.customer_data?.info?.email || quote.email)) {
    const email = quote.customer_data?.info?.email || quote.email;
    if (email) {
      const emailPrefix = email.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
  }

  // Priority 6: Guest Customer for anonymous users
  if (!quote.user_id && (quote.customer_data?.info?.email || quote.email)) {
    return 'Guest Customer';
  }

  // Last resort
  return 'Unknown Customer';
}

/**
 * Gets the customer email address
 */
export function getCustomerDisplayEmail(
  quote: QuoteData,
  _customerProfile?: CustomerProfile | null,
): string | null {
  // Priority 1: customer_data.info.email
  if (quote.customer_data?.info?.email) {
    return quote.customer_data.info.email;
  }

  // Priority 2: Legacy email field
  if (quote.email) {
    return quote.email;
  }

  return null;
}

/**
 * Gets the customer phone number
 */
export function getCustomerDisplayPhone(
  quote: QuoteData,
  customerProfile?: CustomerProfile | null,
): string | null {
  // Priority 1: customer_data.info.phone
  if (quote.customer_data?.info?.phone) {
    return quote.customer_data.info.phone;
  }

  // Priority 2: Profile phone (registered users)
  if (customerProfile?.phone) {
    return customerProfile.phone;
  }

  return null;
}

/**
 * Gets complete customer display data
 */
export function getCustomerDisplayData(
  quote: QuoteData,
  customerProfile?: CustomerProfile | null,
): CustomerDisplayData {
  const type = getCustomerType(quote);
  const name = getCustomerDisplayName(quote, customerProfile);
  const email = getCustomerDisplayEmail(quote, customerProfile);
  const phone = getCustomerDisplayPhone(quote, customerProfile);

  return {
    name,
    email,
    phone,
    type,
    isGuest: type === 'guest' || !quote.user_id,
  };
}

/**
 * Gets a user-friendly customer type label
 */
export function getCustomerTypeLabel(type: CustomerType): string {
  switch (type) {
    case 'registered':
      return 'Registered User';
    case 'guest':
      return 'Guest User';
    case 'admin_created':
      return 'Admin Entry';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

/**
 * Determines if email should be shown separately from name
 * (don't show email if it was used as the name)
 */
export function shouldShowEmailSeparately(
  quote: QuoteData,
  displayName: string,
  email: string | null,
): boolean {
  if (!email) return false;

  // Don't show email separately if:
  // 1. Email is being used as the display name (for registered users without full name)
  // 2. Display name is "Guest Customer" (email is obvious)

  if (displayName === 'Guest Customer') return true;
  if (displayName === 'Unknown Customer') return true;

  // Check if display name is derived from email
  const emailPrefix = email.split('@')[0];
  const capitalizedPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

  if (displayName === capitalizedPrefix) return true;

  // Show email separately if display name is a real name
  return displayName !== email;
}

// ============================================================================
// ADMIN CUSTOMER MANAGEMENT UTILITIES
// For use with profile data directly (admin customer management pages)
// ============================================================================

interface AdminCustomerProfile {
  id: string;
  full_name: string | null;
  email?: string;
  phone?: string;
  created_at: string;
  [key: string]: any;
}

export interface AdminCustomerDisplayData {
  name: string;
  email: string | null;
  phone: string | null;
  type: 'registered' | 'incomplete';
  isIncomplete: boolean;
}

/**
 * Gets customer display data for admin pages using profile data
 */
export function getAdminCustomerDisplayData(
  profile: AdminCustomerProfile
): AdminCustomerDisplayData {
  // Determine customer name
  let name = 'Unknown Customer';
  
  if (profile.full_name?.trim()) {
    name = profile.full_name.trim();
  } else if (profile.email) {
    // Use email prefix as name if no full name
    const emailPrefix = profile.email.split('@')[0];
    name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }

  // Determine if customer profile is incomplete
  const isIncomplete = !profile.full_name?.trim() || !profile.email;
  
  return {
    name,
    email: profile.email || null,
    phone: profile.phone || null,
    type: isIncomplete ? 'incomplete' : 'registered',
    isIncomplete,
  };
}

/**
 * Gets customer display name for admin contexts
 */
export function getAdminCustomerDisplayName(profile: AdminCustomerProfile): string {
  return getAdminCustomerDisplayData(profile).name;
}

/**
 * Gets customer initials for avatar display
 */
export function getCustomerInitials(displayName: string): string {
  if (!displayName || displayName === 'Unknown Customer' || displayName === 'Guest Customer') {
    return 'UC';
  }
  
  const words = displayName.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  return displayName.substring(0, 2).toUpperCase();
}
