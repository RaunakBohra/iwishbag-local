import React from 'react';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface ShippingConfigurationPromptProps {
  quote: UnifiedQuote;
  onConfigureShipping?: () => void;
  onNavigateToSettings?: () => void;
}

export const ShippingConfigurationPrompt: React.FC<ShippingConfigurationPromptProps> = ({
  quote,
  onConfigureShipping,
  onNavigateToSettings,
}) => {
  const handleConfigureClick = () => {
    if (onConfigureShipping) {
      onConfigureShipping();
    } else if (onNavigateToSettings) {
      onNavigateToSettings();
    } else {
      // Default navigation to shipping routes page
      window.location.href = '/admin/shipping-routes';
    }
  };

  return (
    <div className="border border-amber-100 rounded-lg p-3 bg-amber-50/30">
      <div className="text-center py-3">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <Truck className="w-5 h-5 text-amber-600" />
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">Configure shipping routes</h3>
        <p className="text-gray-600 text-xs mb-3 max-w-xs mx-auto">
          Set up routes for{' '}
          <strong className="text-gray-900">
            {quote.origin_country} → {quote.destination_country}
          </strong>{' '}
          to enable order processing.
        </p>
        <Button
          size="sm"
          onClick={handleConfigureClick}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 h-7 text-xs"
        >
          Get started
        </Button>
      </div>
    </div>
  );
};
