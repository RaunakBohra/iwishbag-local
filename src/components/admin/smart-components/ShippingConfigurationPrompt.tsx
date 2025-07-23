import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  AlertTriangle
} from 'lucide-react';
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
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-900">
            No shipping routes configured for {quote.origin_country} → {quote.destination_country}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleConfigureClick}
          className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Settings className="w-3 h-3 mr-1" />
          Configure
        </Button>
      </div>
    </div>
  );
};