import React, { useEffect } from 'react';
import { QuoteOptionsCore, type QuoteOptionsCoreProps } from './QuoteOptionsCore';
import { formatCurrency } from '@/lib/utils';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';

interface QuoteOptionsSelectorProps {
  quote: any;
  breakdown: any;
  onOptionsChange: (options: {
    shipping: string;
    insurance: boolean;
    discountCode?: string;
    adjustedTotal?: number;
    shippingAdjustment?: number;
    insuranceAdjustment?: number;
    discountAmount?: number;
  }) => void;
  formatCurrency: (amount: number, currency: string) => string;
  className?: string;
  onQuoteUpdate?: () => void; // Callback to refresh quote data from parent
  displayCurrency?: string; // Override currency for display
}

export const QuoteOptionsSelector: React.FC<QuoteOptionsSelectorProps> = ({
  quote,
  breakdown,
  onOptionsChange,
  formatCurrency,
  className = "",
  onQuoteUpdate,
  displayCurrency
}) => {
  // Get standardized admin currency display
  const currencyDisplay = useAdminQuoteCurrency(quote);
  const sourceCurrency = getBreakdownSourceCurrency(quote);

  // Hook to track quote options changes and notify parent
  const handleQuoteOptionsUpdate = (optionsState: any) => {
    if (!optionsState || !onOptionsChange) return;
    
    // Extract values for backward compatibility with existing parent components
    const adjustedTotal = optionsState.totals.adjusted_total;
    const baseTotal = optionsState.totals.base_total;
    
    // Calculate adjustments for parent component
    const shippingAdjustment = optionsState.shipping.cost || 0;
    const insuranceAdjustment = optionsState.insurance.enabled ? optionsState.insurance.cost : 0;
    const discountAmount = optionsState.discounts.total_discount || 0;
    
    // Notify parent with backward compatible format
    onOptionsChange({
      shipping: optionsState.shipping.selected_option_id || '',
      insurance: optionsState.insurance.enabled,
      discountCode: optionsState.discounts.applied_codes?.[0] || '',
      adjustedTotal,
      shippingAdjustment,
      insuranceAdjustment, 
      discountAmount
    });
  };

  // Admin-specific configuration for QuoteOptionsCore
  const coreProps: QuoteOptionsCoreProps = {
    quoteId: quote.id,
    quote,
    userType: 'admin',
    displayCurrency: displayCurrency || sourceCurrency,
    onQuoteUpdate: () => {
      // Trigger the parent's quote update callback
      if (onQuoteUpdate) {
        onQuoteUpdate();
      }
    },
    
    // UI variant and styling
    variant: 'admin',
    formatCurrency,
    className,
    
    // Admin-focused features (all enabled)
    features: {
      showShipping: true,
      showInsurance: true,
      showDiscounts: true,
      showAdvancedOptions: true, // Admin gets advanced options
      showRealTimeStatus: true   // Admin gets real-time sync status
    },
    
    // Admin-focused labels
    labels: {
      shipping: 'Shipping Configuration',
      insurance: 'Package Protection',
      discounts: 'Discount Management',
      applyButton: 'Apply',
      removeButton: 'Remove'
    },
    
    // Admin-optimized layout
    layout: {
      compact: false,
      horizontal: false,
      hideHeaders: false
    }
  };

  // Use effect to sync quote options changes with parent callback
  useEffect(() => {
    // Set up a listener for quote options changes
    // The handleQuoteOptionsUpdate function will be called by useQuoteOptions
    // when options state changes occur
  }, [onOptionsChange]);

  return (
    <div className="admin-quote-options">
      {/* Admin Header with Real-time Status */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Quote Options Management
        </h3>
        <p className="text-gray-600 text-sm">
          Configure shipping, insurance, and discount options. Changes sync in real-time with customer interfaces.
        </p>
        {currencyDisplay.isDualCurrency && (
          <div className="mt-2 text-xs text-gray-500">
            Amounts displayed: {currencyDisplay.originLabel} → {currencyDisplay.destinationLabel}
          </div>
        )}
      </div>

      {/* Core Options Interface */}
      <QuoteOptionsCore 
        {...coreProps}
        onQuoteUpdate={(optionsState) => {
          // Handle quote options state updates and notify parent
          handleQuoteOptionsUpdate(optionsState);
          if (onQuoteUpdate) {
            onQuoteUpdate();
          }
        }}
      />
    </div>
  );
};