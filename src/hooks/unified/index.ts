/**
 * Unified Hooks Index - Consolidated hooks with better DX
 * 
 * Migration Guide:
 * 
 * OLD IMPORTS:
 * import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
 * import { usePaymentGateways } from '@/hooks/usePaymentGateways';
 * import { useAdminCurrencyDisplay } from '@/hooks/useAdminCurrencyDisplay';
 * 
 * NEW IMPORTS:
 * import { useCurrency, usePayment, useAdminCurrency } from '@/hooks/unified';
 * // OR
 * import { useCurrency } from '@/hooks/unified/useCurrency';
 */

// Export unified hooks
export { useCurrency, useDisplayCurrency, useAdminCurrency, useCountryCurrency } from './useCurrency';
export { usePayment, usePaymentGateways, usePaymentProcessing } from './usePayment';

// Re-export for backward compatibility (can be removed after migration)
export { useCurrency as useUnifiedCurrency } from './useCurrency';
export { usePayment as useUnifiedPayment } from './usePayment';

// Export types for better TypeScript experience
export type { CurrencyHookReturn } from './useCurrency';
export type { PaymentHookReturn } from './usePayment';