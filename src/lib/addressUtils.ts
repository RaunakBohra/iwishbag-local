// Address format conversion utilities
// Handles conversion between different address formats used across the application

import { ShippingAddress } from '@/types/address';
import { Tables } from '@/integrations/supabase/types';

export interface QuoteShippingAddress {
  fullName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  destination_country?: string;
  phone?: string;
  email?: string;
}

export interface CheckoutAddressForm {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  destination_country?: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
}

export type UserAddress = Tables<'user_addresses'>;

// Unified address interface that all components should use
export interface UnifiedAddress {
  // Personal info
  fullName: string;
  phone?: string;
  email?: string;
  
  // Address details
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvinceRegion: string;
  postalCode: string;
  
  // Country - always use 2-letter ISO code
  countryCode: string;
  
  // Metadata
  isDefault?: boolean;
}

/**
 * Converts quote shipping address format to checkout form format
 */
export function quoteAddressToCheckoutForm(
  quoteAddress: QuoteShippingAddress | null | undefined
): CheckoutAddressForm | null {
  if (!quoteAddress) return null;

  return {
    address_line1: quoteAddress.streetAddress || '',
    address_line2: '',
    city: quoteAddress.city || '',
    state_province_region: quoteAddress.state || '',
    postal_code: quoteAddress.postalCode || '',
    country: quoteAddress.country || '',
    destination_country: quoteAddress.destination_country || quoteAddress.country || '',
    recipient_name: quoteAddress.fullName || '',
    phone: quoteAddress.phone || '',
    is_default: false
  };
}

/**
 * Converts checkout form format to quote shipping address format
 */
export function checkoutFormToQuoteAddress(
  formData: CheckoutAddressForm
): QuoteShippingAddress {
  return {
    fullName: formData.recipient_name || '',
    streetAddress: formData.address_line1,
    city: formData.city,
    state: formData.state_province_region,
    postalCode: formData.postal_code,
    country: formData.country,
    destination_country: formData.destination_country || formData.country,
    phone: formData.phone || '',
    email: '' // Email is handled separately in checkout
  };
}

/**
 * Creates a mock UserAddress object for guest checkout display
 */
export function createGuestAddress(
  formData: CheckoutAddressForm,
  email: string
): Omit<UserAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    recipient_name: formData.recipient_name || '',
    address_line1: formData.address_line1,
    address_line2: formData.address_line2 || null,
    city: formData.city,
    state_province_region: formData.state_province_region,
    postal_code: formData.postal_code,
    country: formData.country,
    destination_country: formData.destination_country || formData.country,
    phone: formData.phone || null,
    is_default: false
  };
}

/**
 * Validates if an address has all required fields
 */
export function isAddressComplete(address: CheckoutAddressForm | null): boolean {
  if (!address) return false;
  
  return Boolean(
    address.recipient_name &&
    address.address_line1 &&
    address.city &&
    address.state_province_region &&
    address.postal_code &&
    address.country
  );
}

/**
 * Extracts address from quote's shipping_address field
 * Handles both string and object formats
 */
export function extractQuoteShippingAddress(
  shippingAddress: unknown
): QuoteShippingAddress | null {
  if (!shippingAddress) return null;

  // If it's a string, try to parse it
  if (typeof shippingAddress === 'string') {
    try {
      return JSON.parse(shippingAddress);
    } catch (e) {
      console.error('Failed to parse shipping address:', e);
      return null;
    }
  }

  // If it's already an object, return it
  if (typeof shippingAddress === 'object') {
    return shippingAddress;
  }

  return null;
}

// Conversion functions to/from UnifiedAddress

/**
 * Converts UserAddress (from database) to UnifiedAddress
 */
export function userAddressToUnified(address: UserAddress): UnifiedAddress {
  return {
    fullName: address.recipient_name,
    phone: address.phone || undefined,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2 || undefined,
    city: address.city,
    stateProvinceRegion: address.state_province_region,
    postalCode: address.postal_code,
    countryCode: address.destination_country || '', // Use destination_country
    isDefault: address.is_default
  };
}

/**
 * Converts UnifiedAddress to UserAddress format (for saving)
 */
export function unifiedToUserAddress(
  address: UnifiedAddress,
  userId: string
): Omit<Tables<'user_addresses'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    recipient_name: address.fullName,
    address_line1: address.addressLine1,
    address_line2: address.addressLine2 || null,
    city: address.city,
    state_province_region: address.stateProvinceRegion,
    postal_code: address.postalCode,
    destination_country: address.countryCode, // Always use country code
    phone: address.phone || null,
    is_default: address.isDefault || false
  };
}

/**
 * Converts ShippingAddress to UnifiedAddress
 */
export function shippingAddressToUnified(address: ShippingAddress): UnifiedAddress {
  return {
    fullName: address.fullName,
    phone: address.phone,
    email: address.email,
    addressLine1: address.streetAddress,
    addressLine2: undefined,
    city: address.city,
    stateProvinceRegion: address.state || '',
    postalCode: address.postalCode,
    countryCode: address.country // Should be 2-letter code
  };
}

/**
 * Converts UnifiedAddress to ShippingAddress
 */
export function unifiedToShippingAddress(address: UnifiedAddress): ShippingAddress {
  return {
    fullName: address.fullName,
    streetAddress: address.addressLine1,
    city: address.city,
    state: address.stateProvinceRegion,
    postalCode: address.postalCode,
    country: address.countryCode,
    phone: address.phone,
    email: address.email
  };
}

/**
 * Converts QuoteShippingAddress to UnifiedAddress
 */
export function quoteShippingToUnified(address: QuoteShippingAddress): UnifiedAddress {
  return {
    fullName: address.fullName || '',
    phone: address.phone,
    email: address.email,
    addressLine1: address.streetAddress || '',
    addressLine2: undefined,
    city: address.city || '',
    stateProvinceRegion: address.state || '',
    postalCode: address.postalCode || '',
    countryCode: address.destination_country || ''
  };
}

/**
 * Converts UnifiedAddress to QuoteShippingAddress
 */
export function unifiedToQuoteShipping(address: UnifiedAddress): QuoteShippingAddress {
  return {
    fullName: address.fullName,
    streetAddress: address.addressLine1,
    city: address.city,
    state: address.stateProvinceRegion,
    postalCode: address.postalCode,
    country: address.countryCode,
    destination_country: address.countryCode,
    phone: address.phone,
    email: address.email
  };
}

/**
 * Validates if a UnifiedAddress has all required fields
 */
export function isUnifiedAddressComplete(address: UnifiedAddress | null): boolean {
  if (!address) return false;
  
  return Boolean(
    address.fullName &&
    address.addressLine1 &&
    address.city &&
    address.stateProvinceRegion &&
    address.postalCode &&
    address.countryCode &&
    address.countryCode.length === 2 // Ensure it's a 2-letter code
  );
}