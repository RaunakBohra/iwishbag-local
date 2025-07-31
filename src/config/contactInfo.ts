/**
 * Country-specific contact information configuration
 * Used for displaying localized support details on Help page
 */

import { getCompanyInfo } from './companyInfo';

export interface ContactInfo {
  phone?: string[];
  email: string;
  hours: string;
  timezone: string;
  whatsapp?: string;
  additionalInfo?: string;
}

export interface CountryContactConfig {
  [countryCode: string]: ContactInfo;
}

export const COUNTRY_CONTACT_INFO: CountryContactConfig = {
  // Nepal - Show local helpline numbers
  NP: {
    phone: ['+977 9813108332', '+977 1 5348888'],
    email: 'support@iwishbag.com',
    hours: 'Sunday - Friday, 10:00 AM - 5:00 PM',
    timezone: 'NPT',
    additionalInfo: 'Local Nepal support available'
  },

  // India - Local helpline number
  IN: {
    phone: ['+91 9971093202'],
    email: 'support@iwishbag.com', 
    hours: 'Monday - Friday, 10:00 AM - 5:00 PM',
    timezone: 'IST',
    additionalInfo: 'India support available'
  },

  // Global/Default - Email only
  GLOBAL: {
    email: 'support@iwishbag.com',
    hours: 'Monday - Friday, 10:00 AM - 5:00 PM',
    timezone: 'IST',
    additionalInfo: 'International support'
  }
};

/**
 * Get contact information for a specific country
 */
export function getContactInfo(countryCode: string): ContactInfo {
  const normalizedCode = countryCode.toUpperCase();
  const companyInfo = getCompanyInfo(countryCode);
  
  // Get base contact info
  const baseInfo = COUNTRY_CONTACT_INFO[normalizedCode] || COUNTRY_CONTACT_INFO.GLOBAL;
  
  // Merge with company info for complete contact details
  return {
    ...baseInfo,
    email: companyInfo.contact.supportEmail
  };
}

/**
 * Check if country has phone support
 */
export function hasPhoneSupport(countryCode: string): boolean {
  const contactInfo = getContactInfo(countryCode);
  return contactInfo.phone && contactInfo.phone.length > 0;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Keep the international format as-is for now
  return phone;
}

/**
 * Generate phone link for mobile devices
 */
export function getPhoneLink(phone: string): string {
  // Remove spaces and special characters except +
  const cleanNumber = phone.replace(/[^\d+]/g, '');
  return `tel:${cleanNumber}`;
}

/**
 * Get WhatsApp link if available
 */
export function getWhatsAppLink(phone: string): string {
  // Remove + and spaces for WhatsApp format
  const cleanNumber = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${cleanNumber}`;
}

/**
 * Get support hours with timezone
 */
export function getFormattedHours(countryCode: string): string {
  const contactInfo = getContactInfo(countryCode);
  return `${contactInfo.hours} ${contactInfo.timezone}`;
}