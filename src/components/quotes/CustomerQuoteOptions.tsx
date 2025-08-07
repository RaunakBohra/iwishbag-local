/**
 * CustomerQuoteOptions - Desktop Customer Quote Options Interface
 * 
 * Provides desktop customers with interactive access to:
 * - Shipping speed selection 
 * - Package protection (insurance) toggle
 * - Discount code application
 * - Real-time total updates
 * 
 * Built on QuoteOptionsCore with customer-optimized UI and messaging
 * Syncs with admin interface via WebSocket for seamless coordination
 */

import React from 'react';
import { QuoteOptionsCore, type QuoteOptionsCoreProps } from './QuoteOptionsCore';
import { formatCurrency } from '@/lib/utils';
import { currencyService } from '@/services/CurrencyService';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerQuoteOptionsProps {
  quote: any;
  onQuoteUpdate?: () => void;
  displayCurrency?: string;
  className?: string;
  
  // UI customization options
  showRealTimeIndicator?: boolean;
  compactView?: boolean;
  title?: string;
}

export const CustomerQuoteOptions: React.FC<CustomerQuoteOptionsProps> = ({
  quote,
  onQuoteUpdate,
  displayCurrency,
  className = "",
  showRealTimeIndicator = false,
  compactView = false,
  title = "Customize Your Order"
}) => {
  const { user } = useAuth();

  // Currency formatting function
  const formatCurrencyAmount = (amount: number, currency: string): string => {
    return formatCurrency(amount, currency);
  };

  // Customer-specific configuration
  const coreProps: QuoteOptionsCoreProps = {
    quoteId: quote.id,
    quote,
    userType: 'customer',
    displayCurrency: displayCurrency || quote.customer_currency || 'USD',
    onQuoteUpdate,
    
    // UI variant and styling
    variant: compactView ? 'mobile' : 'customer',
    formatCurrency: formatCurrencyAmount,
    className,
    
    // Customer-focused features
    features: {
      showShipping: true,
      showInsurance: true,
      showDiscounts: true,
      showAdvancedOptions: false, // Hide advanced admin features
      showRealTimeStatus: showRealTimeIndicator // Optional real-time indicator
    },
    
    // Customer-friendly labels
    labels: {
      shipping: '🚚 Choose Your Shipping Speed',
      insurance: '🛡️ Add Package Protection',
      discounts: '🏷️ Apply Discount Code',
      applyButton: 'Apply Code',
      removeButton: 'Remove'
    },
    
    // Customer-optimized layout
    layout: {
      compact: compactView,
      horizontal: false,
      hideHeaders: compactView
    }
  };

  return (
    <div className="customer-quote-options">
      {/* Section Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 text-sm">
          Personalize your order with shipping options, protection, and discounts. 
          Changes are automatically saved and reflected in your total.
        </p>
      </div>

      {/* Core Options Interface */}
      <QuoteOptionsCore {...coreProps} />

      {/* Customer Help Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
        <div className="flex">
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">
              Need Help Choosing?
            </h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="space-y-1">
                <li>• <strong>Express shipping</strong> gets your order faster but costs more</li>
                <li>• <strong>Package protection</strong> covers lost, stolen, or damaged items</li>
                <li>• <strong>Discount codes</strong> can save you money on your total order</li>
              </ul>
            </div>
            <div className="mt-3">
              <p className="text-xs text-blue-600">
                Questions? <a href="mailto:support@iwishbag.com" className="underline hover:text-blue-800">Contact our support team</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerQuoteOptions;