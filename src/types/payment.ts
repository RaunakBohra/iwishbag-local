// Payment Gateway Types
export type PaymentGateway = 
  | 'stripe'
  | 'payu'
  | 'esewa'
  | 'khalti'
  | 'fonepay'
  | 'airwallex'
  | 'bank_transfer'
  | 'cod'
  | 'razorpay'
  | 'paypal'
  | 'upi'
  | 'paytm'
  | 'grabpay'
  | 'alipay';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type RefundType = 
  | 'original_method'
  | 'store_credit'
  | 'manual';

export type RefundStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

// Payment Gateway Configuration
export interface PaymentGatewayConfig {
  id: string;
  name: string;
  code: PaymentGateway;
  is_active: boolean;
  supported_countries: string[];
  supported_currencies: string[];
  fee_percent: number;
  fee_fixed: number;
  config: Record<string, any>;
  webhook_url?: string;
  test_mode: boolean;
  created_at: string;
  updated_at: string;
}

// Payment Transaction
export interface PaymentTransaction {
  id: string;
  quote_id: string;
  gateway_code: PaymentGateway;
  transaction_id?: string;
  gateway_transaction_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway_response: Record<string, any>;
  error_message?: string;
  refunded_amount: number;
  refund_status: 'none' | 'partial' | 'full';
  created_at: string;
  updated_at: string;
}

// Payment Refund
export interface PaymentRefund {
  id: string;
  transaction_id: string;
  refund_type: RefundType;
  amount: number;
  currency: string;
  reason?: string;
  gateway_refund_id?: string;
  status: RefundStatus;
  processed_at?: string;
  created_at: string;
}

// Store Credit
export interface StoreCredit {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  source: 'refund' | 'bonus' | 'manual';
  reference_id?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

// Payment Webhook
export interface PaymentWebhook {
  id: string;
  gateway_code: PaymentGateway;
  event_type: string;
  payload: Record<string, any>;
  processed: boolean;
  error_message?: string;
  created_at: string;
}

// Payment Request/Response
export interface PaymentRequest {
  quoteIds: string[];
  currency: string;
  amount: number;
  gateway: PaymentGateway;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  url?: string;
  qr_code?: string;
  transaction_id?: string;
  error?: string;
  fallback_methods?: PaymentGateway[];
}

// Country-specific payment methods
export interface CountryPaymentMethods {
  destination_country: string;
  available_methods: PaymentGateway[];
  default_method: PaymentGateway;
  qr_enabled: boolean;
  mobile_app_required: boolean;
}

// Payment gateway fees
export interface PaymentGatewayFees {
  gateway: PaymentGateway;
  percent_fee: number;
  fixed_fee: number;
  currency: string;
  min_amount?: number;
  max_amount?: number;
}

// QR Code payment data
export interface QRPaymentData {
  merchant_id: string;
  amount: number;
  transaction_id: string;
  success_url: string;
  failure_url: string;
  currency: string;
  description?: string;
}

// Payment method display info
export interface PaymentMethodDisplay {
  code: PaymentGateway;
  name: string;
  description: string;
  icon: string;
  is_mobile_only: boolean;
  requires_qr: boolean;
  processing_time: string;
  fees: string;
}

// Payment validation
export interface PaymentValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggested_methods: PaymentGateway[];
}

// Payment analytics
export interface PaymentAnalytics {
  total_transactions: number;
  total_amount: number;
  currency: string;
  success_rate: number;
  average_amount: number;
  gateway_breakdown: Record<PaymentGateway, {
    count: number;
    amount: number;
    success_rate: number;
  }>;
  time_period: {
    start: string;
    end: string;
  };
} 