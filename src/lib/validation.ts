import { z } from 'zod';
import { currencyService } from '@/services/CurrencyService';

// Common validation patterns
const emailSchema = z.string().email('Please enter a valid email address');
const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number');
const urlSchema = z.string().url('Please enter a valid URL');
const positiveNumberSchema = z.number().positive('Must be a positive number');
const nonEmptyStringSchema = z.string().min(1, 'This field is required');

// Country code validation (ISO 3166-1 alpha-2)
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, 'Invalid country code');

// Quote validation schemas
export const quoteItemSchema = z.object({
  product_name: nonEmptyStringSchema.max(200, 'Product name too long'),
  product_url: urlSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(999, 'Quantity too large'),
  weight_kg: positiveNumberSchema.max(1000, 'Weight cannot exceed 1000kg'),
  options: z.string().max(500, 'Options text too long').optional(),
  category: z.enum(['electronics', 'clothing', 'home', 'other']),
});

export const shippingAddressSchema = z.object({
  recipient_name: nonEmptyStringSchema.max(100, 'Name too long'),
  address_line1: nonEmptyStringSchema.max(200, 'Address too long'),
  address_line2: z.string().max(200, 'Address too long').optional(),
  city: nonEmptyStringSchema.max(100, 'City name too long'),
  state: z.string().max(100, 'State name too long').optional(),
  postal_code: z.string().max(20, 'Postal code too long').optional(),
  country: nonEmptyStringSchema.max(100, 'Country name too long'),
  destination_country: countryCodeSchema.optional(),
  phone: phoneSchema.optional(),
});

export const quoteCreateSchema = z.object({
  email: emailSchema,
  product_name: nonEmptyStringSchema.max(200, 'Product name too long'),
  product_url: urlSchema,
  product_notes: z.string().max(1000, 'Notes too long').optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(999, 'Quantity too large'),
  weight_kg: positiveNumberSchema.max(1000, 'Weight cannot exceed 1000kg'),
  dimensions_cm: z.object({
    length: positiveNumberSchema.max(500, 'Length too large'),
    width: positiveNumberSchema.max(500, 'Width too large'),
    height: positiveNumberSchema.max(500, 'Height too large'),
  }),
  destination_country: countryCodeSchema,
  shipping_address: shippingAddressSchema.optional(),
});

// Payment validation schemas
export const paymentRequestSchema = z.object({
  quoteIds: z.array(z.string().uuid('Invalid quote ID')).min(1, 'At least one quote required'),
  gateway: z.enum([
    'stripe',
    'bank_transfer',
    'cod',
    'payu',
    'esewa',
    'khalti',
    'fonepay',
    'airwallex',
  ]),
  success_url: urlSchema,
  cancel_url: urlSchema,
  amount: positiveNumberSchema.optional(),
  currency: z.string().length(3, 'Invalid currency code').optional(),
  customerInfo: z
    .object({
      name: z.string().max(100, 'Name too long').optional(),
      email: emailSchema.optional(),
      phone: phoneSchema.optional(),
      address: z.string().max(500, 'Address too long').optional(),
    })
    .optional(),
});

// User validation schemas
export const userProfileUpdateSchema = z.object({
  full_name: z.string().max(100, 'Name too long').optional(),
  phone: phoneSchema.optional(),
  preferred_display_currency: z.string().length(3, 'Invalid currency code').optional(),
  notification_preferences: z
    .object({
      email_updates: z.boolean().optional(),
      sms_updates: z.boolean().optional(),
      marketing_emails: z.boolean().optional(),
    })
    .optional(),
});

// Admin validation schemas
// Note: Status validation is now dynamic - use createAdminQuoteUpdateSchema() function instead
export const adminQuoteUpdateSchema = z.object({
  status: z.string().optional(), // Simplified to string - validation happens elsewhere
  final_total: positiveNumberSchema.optional(),
  final_total_local: positiveNumberSchema.optional(),
  payment_method: z.enum(['stripe', 'cod', 'bank_transfer']).optional(),
  rejection_reason_id: z.string().uuid().optional(),
  rejection_details: z.string().max(1000, 'Rejection details too long').optional(),
  customer_notes: z.string().max(1000, 'Notes too long').optional(),
});

// Dynamic validation schema creator for status-dependent validation
export const createAdminQuoteUpdateSchema = (validStatuses: string[]) => {
  return z.object({
    status:
      validStatuses.length > 0
        ? z.enum(validStatuses as [string, ...string[]]).optional()
        : z.string().optional(),
    final_total: positiveNumberSchema.optional(),
    final_total_local: positiveNumberSchema.optional(),
    payment_method: z.enum(['stripe', 'cod', 'bank_transfer']).optional(),
    rejection_reason_id: z.string().uuid().optional(),
    rejection_details: z.string().max(1000, 'Rejection details too long').optional(),
    customer_notes: z.string().max(1000, 'Notes too long').optional(),
  });
};

// Helper function to validate status transitions
export const validateStatusTransition = (
  currentStatus: string,
  newStatus: string,
  allowedTransitions: Record<string, string[]>,
): boolean => {
  if (!currentStatus || !newStatus) return true; // Allow if status is not set
  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
};

// Exchange rate validation
export const exchangeRateSchema = z.object({
  origin_country: countryCodeSchema,
  destination_country: countryCodeSchema,
  rate: positiveNumberSchema.max(10000, 'Exchange rate too high'),
});

// Search and pagination validation
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page number too high')
    .optional(),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit too high').optional(),
  search: z.string().max(200, 'Search query too long').optional(),
});

// Sanitization functions
export const sanitizeHtml = (input: string): string => {
  // Remove all HTML tags and potentially dangerous characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .trim();
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsedUrl.toString();
  } catch {
    throw new Error('Invalid URL');
  }
};

export const sanitizeFileName = (fileName: string): string => {
  // Remove dangerous characters from file names
  return fileName
    .replace(/[^a-zA-Z0-9.\-_]/g, '') // Only allow alphanumeric, dots, hyphens, underscores
    .replace(/^\.+/, '') // Remove leading dots
    .slice(0, 255); // Limit length
};

// Validation utility functions
export const validateAndSanitize = <T>(
  data: unknown,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; errors: string[] } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
};

// Email validation with additional checks
export const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    // Additional checks for common issues
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// Phone number validation with country code support
export const validatePhone = (phone: string, countryCode?: string): boolean => {
  try {
    phoneSchema.parse(phone);
    // Additional validation based on country code could be added here
    return true;
  } catch {
    return false;
  }
};

// Amount validation for payments
export const validatePaymentAmount = (amount: number, currency: string): boolean => {
  // Use CurrencyService for minimum payment amounts
  const minimum = currencyService.getMinimumPaymentAmount(currency);
  return amount >= minimum && amount <= 1000000; // Max 1M in any currency
};

export default {
  quoteItemSchema,
  shippingAddressSchema,
  quoteCreateSchema,
  paymentRequestSchema,
  userProfileUpdateSchema,
  adminQuoteUpdateSchema,
  exchangeRateSchema,
  paginationSchema,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeFileName,
  validateAndSanitize,
  validateEmail,
  validatePhone,
  validatePaymentAmount,
};
