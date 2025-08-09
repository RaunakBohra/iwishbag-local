/**
 * Quote Management Services Barrel Export
 * Consolidated exports for all quote management services
 */

// Core quote services
export { default as QuoteStateService } from './QuoteStateService';
export { default as QuoteCalculationService } from './QuoteCalculationService';
// QuoteValidationService removed - unused duplicate validation logic
export { default as AdminWorkflowService } from './AdminWorkflowService';
export { default as CustomerManagementService } from './CustomerManagementService';

// Types and interfaces
export type {
  QuoteState,
  QuoteCalculation,
  AdminWorkflow,
  CustomerProfile
} from './types';