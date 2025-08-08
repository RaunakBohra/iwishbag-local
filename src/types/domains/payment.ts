/**
 * Payment Domain Types - Consolidated payment, gateway, and transaction types
 * Combines all payment-related interfaces from payment.ts, bnpl.ts, and stripeCustomer.ts
 */

import { BaseEntity, Money, Status } from './common';

// Core Payment Gateway Types
export type PaymentGateway = string; // Dynamic type from database gateway codes

export const SUPPORTED_GATEWAYS = [
  'payu', 'esewa', 'khalti', 'fonepay', 'airwallex', 'stripe', 
  'bank_transfer', 'cod', 'razorpay', 'paypal', 'upi', 'paytm',
  'grabpay', 'alipay', 'bnpl_klarna', 'bnpl_affirm'
] as const;

export type SupportedPaymentGateway = (typeof SUPPORTED_GATEWAYS)[number];

// Payment Gateway Configuration
export interface PaymentGatewayConfig extends BaseEntity {
  gateway_code: string;
  display_name: string;
  description?: string;
  is_enabled: boolean;
  is_test_mode: boolean;
  supported_countries: string[];
  supported_currencies: string[];
  min_amount?: number;
  max_amount?: number;
  fee_percentage?: number;
  fee_fixed?: number;
  credentials: PaymentGatewayCredentials;
  ui_config: PaymentGatewayUIConfig;
}

export interface PaymentGatewayCredentials {
  api_key?: string;
  secret_key?: string;
  merchant_id?: string;
  webhook_secret?: string;
  endpoint_url?: string;
  public_key?: string;
  private_key?: string;
  client_id?: string;
  client_secret?: string;
  sandbox_mode?: boolean;
}

export interface PaymentGatewayUIConfig {
  icon: string;
  color?: string;
  description?: string;
  is_mobile_only?: boolean;
  requires_qr?: boolean;
  show_fees?: boolean;
  sort_order?: number;
}

// Payment Method Display
export interface PaymentMethodDisplay {
  code: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  is_enabled: boolean;
  is_recommended?: boolean;
  is_mobile_only?: boolean;
  requires_qr?: boolean;
  min_amount?: number;
  max_amount?: number;
  fee_info?: PaymentFeeInfo;
}

export interface PaymentFeeInfo {
  percentage?: number;
  fixed?: number;
  currency?: string;
  description?: string;
}

// Transaction Types
export interface PaymentTransaction extends BaseEntity {
  order_id?: string;
  quote_id?: string;
  user_id: string;
  amount: number;
  currency: string;
  gateway_code: string;
  gateway_transaction_id?: string;
  internal_transaction_id: string;
  status: PaymentStatus;
  payment_method: string;
  gateway_response?: GatewayResponse;
  failure_reason?: string;
  processed_at?: string;
  metadata?: Record<string, any>;
}

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'refunded' 
  | 'partially_refunded';

export interface GatewayResponse {
  transaction_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  gateway_transaction_id?: string;
  error_code?: string;
  error_message?: string;
  payment_url?: string;
  qr_code?: string;
  redirect_url?: string;
  webhook_data?: Record<string, unknown>;
  additional_data?: Record<string, unknown>;
}

// Payment Process Types
export interface PaymentRequest {
  amount: number;
  currency: string;
  gateway_code: string;
  order_id?: string;
  quote_id?: string;
  customer_email?: string;
  customer_name?: string;
  description?: string;
  metadata?: Record<string, any>;
  return_url?: string;
  cancel_url?: string;
  webhook_url?: string;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  payment_url?: string;
  qr_code?: string;
  instructions?: string;
  error?: PaymentError;
  requires_action?: boolean;
  action_type?: 'redirect' | 'qr_scan' | 'bank_transfer';
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
  recoverable?: boolean;
  suggested_action?: string;
}

// BNPL (Buy Now Pay Later) Types
export interface BNPLProvider {
  code: string;
  name: string;
  description: string;
  logo_url: string;
  min_amount: number;
  max_amount: number;
  supported_countries: string[];
  supported_currencies: string[];
  installment_options: BNPLInstallmentOption[];
}

export interface BNPLInstallmentOption {
  duration_months: number;
  interest_rate: number;
  fee_percentage?: number;
  fee_fixed?: number;
  description: string;
}

export interface BNPLApplication extends BaseEntity {
  user_id: string;
  order_id?: string;
  quote_id?: string;
  provider_code: string;
  amount: number;
  currency: string;
  installment_plan: BNPLInstallmentOption;
  status: BNPLStatus;
  application_data: Record<string, any>;
  provider_application_id?: string;
  approval_details?: BNPLApprovalDetails;
}

export type BNPLStatus = 
  | 'pending' 
  | 'approved' 
  | 'declined' 
  | 'active' 
  | 'completed' 
  | 'defaulted';

export interface BNPLApprovalDetails {
  credit_limit: number;
  interest_rate: number;
  monthly_payment: number;
  first_payment_date: string;
  total_payments: number;
  terms_url?: string;
}

// Stripe Customer Types (for Stripe integration)
export interface StripeCustomer {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: StripeAddress;
  payment_methods: StripePaymentMethod[];
  default_payment_method?: string;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface StripeAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface StripePaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  card?: StripeCard;
  bank_account?: StripeBankAccount;
  wallet?: StripeWallet;
  is_default: boolean;
  created_at: string;
}

export interface StripeCard {
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  country?: string;
  funding?: string;
}

export interface StripeBankAccount {
  last4: string;
  bank_name?: string;
  account_type?: string;
  routing_number?: string;
  country?: string;
}

export interface StripeWallet {
  type: string;
  provider?: string;
}

// Payment Validation Types
export interface PaymentValidation {
  amount_valid: boolean;
  currency_supported: boolean;
  country_supported: boolean;
  gateway_available: boolean;
  user_eligible: boolean;
  errors: PaymentValidationError[];
  warnings: PaymentValidationWarning[];
}

export interface PaymentValidationError {
  field: string;
  code: string;
  message: string;
}

export interface PaymentValidationWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Refund Types
export interface RefundRequest {
  transaction_id: string;
  amount?: number; // Partial refund if less than original
  reason: string;
  notes?: string;
}

export interface RefundResult {
  success: boolean;
  refund_id?: string;
  amount_refunded: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  error?: PaymentError;
}

// Payment Analytics Types
export interface PaymentMetrics {
  total_volume: Money;
  transaction_count: number;
  success_rate: number;
  average_amount: number;
  popular_gateways: PaymentGatewayStats[];
  trend_data: PaymentTrendData[];
}

export interface PaymentGatewayStats {
  gateway_code: string;
  gateway_name: string;
  volume: Money;
  transaction_count: number;
  success_rate: number;
}

export interface PaymentTrendData {
  date: string;
  volume: number;
  transaction_count: number;
  success_rate: number;
}

// Webhook Types
export interface PaymentWebhook {
  id: string;
  gateway_code: string;
  event_type: string;
  transaction_id?: string;
  payload: Record<string, any>;
  signature?: string;
  processed: boolean;
  processed_at?: string;
  error?: string;
  created_at: string;
}

export interface WebhookVerification {
  valid: boolean;
  gateway_code: string;
  error?: string;
}

// Payment Link Types (for invoice/quote payments)
export interface PaymentLink extends BaseEntity {
  reference_id: string; // quote_id or order_id
  reference_type: 'quote' | 'order' | 'invoice';
  amount: number;
  currency: string;
  description: string;
  customer_email: string;
  expires_at?: string;
  payment_methods: string[];
  status: 'active' | 'paid' | 'expired' | 'cancelled';
  payment_transaction_id?: string;
  access_token: string;
  public_url: string;
}

// Export utility functions type
export type PaymentUtilityFunctions = {
  formatAmount: (amount: number, currency: string) => string;
  validateAmount: (amount: number, gateway: string, currency: string) => PaymentValidation;
  calculateFees: (amount: number, gateway: string) => PaymentFeeInfo;
  isGatewaySupported: (gateway: string, country: string, currency: string) => boolean;
};