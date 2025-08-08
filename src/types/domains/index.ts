/**
 * Domain Types Index - Centralized export for all consolidated domain types
 * 
 * This replaces scattered type imports with clean domain-based organization:
 * 
 * Before: import { PaymentGateway } from '@/types/payment'
 *         import { Quote } from '@/types/quotes-v2'  
 *         import { CartItem } from '@/types/cart'
 * 
 * After:  import { PaymentGateway, Quote, CartItem } from '@/types/domains'
 */

// Common types used across domains
export * from './common';

// Domain-specific type exports
export * from './payment';
export * from './quote';
export * from './cart';

// Re-export commonly used types with cleaner names
export type {
  // Common
  BaseEntity,
  EntityWithUser,
  Money,
  Address,
  Country,
  CurrencyInfo,
  Status,
  Priority,
  ApiResponse,
  PaginatedResponse,
  AsyncState,
  LoadingState,
  ServiceResult,
  Notification,
  
  // Payment
  PaymentGateway,
  PaymentGatewayConfig,
  PaymentMethodDisplay,
  PaymentTransaction,
  PaymentStatus,
  PaymentRequest,
  PaymentResult,
  PaymentError,
  BNPLProvider,
  StripeCustomer,
  PaymentValidation,
  
  // Quote
  Quote,
  QuoteStatus,
  QuoteItem,
  CustomerData,
  CalculationData,
  QuoteRequest,
  QuoteResponse,
  QuoteMetrics,
  QuoteValidation,
  
  // Cart & Orders
  CartItem,
  CartState,
  CartMetadata,
  CheckoutData,
  ContactInfo,
  OrderSummary,
  Order,
  OrderStatus,
  OrderItem,
  CartAnalytics,
  
} from './common';

// Type utility exports for better developer experience
export type {
  Optional,
  RequireAtLeastOne,
  PaymentUtilityFunctions,
  QuoteUtilityFunctions,
  CartUtilityFunctions,
} from './common';

// Legacy type mappings for gradual migration
// These can be removed once all imports are updated
export type {
  PaymentGateway as LegacyPaymentGateway,
  Quote as UnifiedQuote,
  CartItem as LegacyCartItem,
} from './payment';