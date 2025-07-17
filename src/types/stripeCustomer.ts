/**
 * TypeScript interfaces for Stripe customer data handling
 * Ensures type safety throughout the customer details flow
 */

export interface CustomerAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: CustomerAddress;
}

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

export interface QuoteData {
  id: string;
  email?: string;
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: QuoteShippingAddress | string;
}

export interface StripeCustomerRecord {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: CustomerAddress;
  metadata: {
    user_id: string;
    first_quote_id?: string;
    last_quote_id?: string;
  };
}

export interface StripePaymentIntentData {
  amount: number;
  currency: string;
  metadata: {
    quote_ids: string;
    gateway: string;
    user_id: string;
    customer_name?: string;
    customer_phone?: string;
    original_amount: string;
    original_currency: string;
  };
  description: string;
  receipt_email?: string;
  customer?: string;
  shipping?: {
    name: string;
    phone?: string;
    address: CustomerAddress;
  };
  automatic_payment_methods: {
    enabled: boolean;
  };
}

export interface EnhancedStripePaymentParams {
  stripe: unknown; // Generic type for external Stripe instance
  amount: number;
  currency: string;
  quoteIds: string[];
  userId: string;
  customerInfo?: CustomerInfo;
  quotes: QuoteData[];
  supabaseAdmin: unknown; // Generic type for Supabase client instance
}

export interface StripePaymentResult {
  success: boolean;
  client_secret?: string;
  transactionId?: string;
  customer_id?: string;
  error?: string;
}

export interface CustomerDetailsFromStripe {
  email?: string;
  name?: string;
  phone?: string;
  shipping_address?: CustomerAddress;
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: CustomerAddress;
  };
  customer_id?: string;
}

export interface EnhancedGatewayResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, string>;
  customer_details?: CustomerDetailsFromStripe;
  charge_details?: {
    billing_details?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: CustomerAddress;
    };
    receipt_email?: string;
    receipt_url?: string;
  };
  shipping?: {
    name: string;
    phone?: string;
    address: CustomerAddress;
  };
  receipt_email?: string;
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CustomerValidationRules {
  email?: {
    required?: boolean;
    maxLength?: number;
  };
  name?: {
    required?: boolean;
    maxLength?: number;
    minLength?: number;
  };
  phone?: {
    required?: boolean;
    maxLength?: number;
    pattern?: RegExp;
  };
  address?: {
    required?: boolean;
    fields?: {
      line1?: { required?: boolean; maxLength?: number };
      city?: { required?: boolean; maxLength?: number };
      state?: { required?: boolean; maxLength?: number };
      postal_code?: { required?: boolean; maxLength?: number };
      country?: { required?: boolean; pattern?: RegExp };
    };
  };
}
