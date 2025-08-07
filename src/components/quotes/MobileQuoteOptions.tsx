/**
 * MobileQuoteOptions - Mobile-Optimized Quote Options Interface
 * 
 * Provides mobile customers with interactive access to:
 * - Collapsible shipping options
 * - Toggle-based insurance selection
 * - Compact discount code input
 * - Touch-friendly controls
 * 
 * Built on QuoteOptionsCore with mobile-specific optimizations
 * Syncs with admin interface via WebSocket for seamless coordination
 */

import React, { useState, useEffect } from 'react';
import { QuoteOptionsCore, type QuoteOptionsCoreProps } from './QuoteOptionsCore';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MobileQuoteOptionsProps {
  quote: any;
  breakdown: any;
  quoteOptions: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
    adjustedTotal?: number;
    shippingAdjustment?: number;
    insuranceAdjustment?: number;
    discountAmount?: number;
  };
  onOptionsChange: (options: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
    adjustedTotal?: number;
    shippingAdjustment?: number;
    insuranceAdjustment?: number;
    discountAmount?: number;
  }) => void;
  formatCurrency: (amount: number, currency: string) => string;
  onQuoteUpdate?: () => void;
  displayCurrency?: string;
  className?: string;
}

export const MobileQuoteOptions: React.FC<MobileQuoteOptionsProps> = ({
  quote,
  breakdown,
  quoteOptions,
  onOptionsChange,
  formatCurrency,
  onQuoteUpdate,
  displayCurrency,
  className = ""
}) => {
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  // Handle quote options state updates and notify parent
  const handleQuoteOptionsUpdate = (optionsState: any) => {
    if (!optionsState || !onOptionsChange) return;
    
    // Extract values for backward compatibility with existing parent components
    const adjustedTotal = optionsState.totals.adjusted_total;
    
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

  // Mobile-specific configuration for QuoteOptionsCore
  const coreProps: QuoteOptionsCoreProps = {
    quoteId: quote.id,
    quote,
    userType: 'customer',
    displayCurrency: displayCurrency || quote.customer_currency || 'USD',
    onQuoteUpdate: () => {
      // Trigger the parent's quote update callback
      if (onQuoteUpdate) {
        onQuoteUpdate();
      }
    },
    
    // UI variant and styling
    variant: 'mobile',
    formatCurrency,
    className: 'px-4', // Mobile padding
    
    // Mobile-optimized features
    features: {
      showShipping: true,
      showInsurance: true,
      showDiscounts: true,
      showAdvancedOptions: false, // Hide advanced options on mobile
      showRealTimeStatus: false   // Hide real-time status on mobile
    },
    
    // Mobile-friendly labels
    labels: {
      shipping: '🚚 Shipping Speed',
      insurance: '🛡️ Protection',
      discounts: '🏷️ Discount',
      applyButton: 'Apply',
      removeButton: 'Remove'
    },
    
    // Mobile-optimized layout
    layout: {
      compact: true,        // Compact mobile layout
      horizontal: false,
      hideHeaders: true     // Hide section headers for space
    }
  };

  return (
    <div className={`mobile-quote-options ${className}`}>
      {/* Mobile Options Toggle Button */}
      <div className="mb-4">
        <Button
          variant="outline"
          className="w-full flex items-center justify-between p-4 h-auto border-dashed"
          onClick={() => setOptionsExpanded(!optionsExpanded)}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Customize Your Order</span>
          </div>
          {optionsExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </Button>
        
        {!optionsExpanded && (
          <div className="mt-2 text-center text-sm text-gray-600">
            Tap to change shipping, add protection, or apply discounts
          </div>
        )}
      </div>

      {/* Collapsible Options Panel */}
      {optionsExpanded && (
        <div className="space-y-4 bg-gray-50 rounded-lg p-4 border">
          <div className="text-center text-sm text-gray-700 mb-4">
            Personalize your order with options below
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

          {/* Mobile Help Section */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-2">Quick Guide:</p>
              <ul className="text-blue-800 space-y-1 text-xs">
                <li>📦 <strong>Express</strong> = faster delivery</li>
                <li>🛡️ <strong>Protection</strong> = covers lost/damaged items</li>
                <li>🏷️ <strong>Discounts</strong> = use codes like FIRST10</li>
              </ul>
            </div>
          </div>

          {/* Done Button */}
          <div className="pt-4 border-t">
            <Button
              className="w-full"
              onClick={() => setOptionsExpanded(false)}
              variant="default"
            >
              Done Customizing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileQuoteOptions;