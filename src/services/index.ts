/**
 * Services Main Barrel Export
 * Central export point for all services in the application
 */

// Core services
export { default as CurrencyService } from './CurrencyService';
export { default as TrackingService } from './TrackingService';
export { default as UnifiedPaymentValidationService } from './UnifiedPaymentValidationService';
export { default as QuoteCalculatorService } from './QuoteCalculatorService';
export { default as PaymentGatewayFeeService } from './PaymentGatewayFeeService';
export { default as BrightDataProductService } from './BrightDataProductService';
export { default as NotificationService } from './NotificationService';
export { default as SearchService } from './SearchService';
export { default as AuditLogService } from './AuditLogService';

// Service domain re-exports
export * from './payment-management';
export * from './payment-gateways';
export * from './quote-management';
export * from './quote-calculator';
export * from './support-engine';
export * from './bright-data';
export * from './product-scraping';

// Specialized service groups
export * from './discount';
export * from './delivery';

// Types and interfaces from main unified service
export type {
  UnifiedValidationResult,
  ValidationError,
  ValidationWarning,
  PaymentRecommendation,
  ComplianceCheck,
  PaymentMethodType,
  PaymentGateway
} from './UnifiedPaymentValidationService';