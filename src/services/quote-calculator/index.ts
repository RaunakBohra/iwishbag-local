/**
 * Quote Calculator Services Barrel Export
 * Consolidated exports for all quote calculation services
 */

// Core calculator services
export { default as QuoteFormStateService } from './QuoteFormStateService';
export { default as QuoteDataService } from './QuoteDataService';
export { default as ShippingOptionsService } from './ShippingOptionsService';
export { default as TaxCalculationService } from './TaxCalculationService';
export { default as DiscountCalculationService } from './DiscountCalculationService';
export { default as CurrencyCalculationService } from './CurrencyCalculationService';
export { default as CustomsCalculationService } from './CustomsCalculationService';
// QuoteValidationService removed - unused duplicate validation logic
export { default as QuotePersistenceService } from './QuotePersistenceService';
export { default as QuoteItemsService } from './QuoteItemsService';
export { default as ItemValuationService } from './ItemValuationService';
export { default as ShippingCostService } from './ShippingCostService';
export { default as DiscountManagementService } from './DiscountManagementService';
export { default as CountrySelectionService } from './CountrySelectionService';

// Types and interfaces
export type {
  QuoteFormState,
  ShippingOption,
  TaxCalculation,
  DiscountApplication,
  QuoteItem
} from './types';