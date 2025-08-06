import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, ChevronDown } from 'lucide-react';

interface Currency {
  code: string;
  symbol: string;
  name?: string;
}

interface CurrencySelectionProps {
  availableCurrencies: Currency[] | null;
  isGuestCheckout: boolean;
  guestSelectedCurrency: string;
  onGuestCurrencyChange: (currency: string) => void;
  userSelectedCurrency: string;
  onUserCurrencyChange: (currency: string) => void;
  userProfile?: {
    preferred_display_currency?: string;
  };
  autoDetectedCurrency: string;
  locationData?: {
    country?: string;
  };
  isProcessing: boolean;
}

export const CurrencySelection: React.FC<CurrencySelectionProps> = ({
  availableCurrencies,
  isGuestCheckout,
  guestSelectedCurrency,
  onGuestCurrencyChange,
  userSelectedCurrency,
  onUserCurrencyChange,
  userProfile,
  autoDetectedCurrency,
  locationData,
  isProcessing
}) => {
  if (!availableCurrencies) return null;

  const getCurrentCurrency = () => {
    if (isGuestCheckout) {
      return guestSelectedCurrency || autoDetectedCurrency || 'USD';
    } else {
      return userSelectedCurrency || 
             userProfile?.preferred_display_currency || 
             autoDetectedCurrency || 
             'USD';
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    if (isGuestCheckout) {
      onGuestCurrencyChange(newCurrency);
    } else {
      onUserCurrencyChange(newCurrency);
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
          <Globe className="h-4 w-4 text-gray-600" />
          Display Currency
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <label htmlFor="display-currency-selector" className="sr-only">
              Select display currency
            </label>
            <select
              id="display-currency-selector"
              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer hover:border-gray-400 transition-colors w-full"
              value={getCurrentCurrency()}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={isProcessing}
            >
              {availableCurrencies.map((currency) => {
                // Determine if this currency was auto-detected
                const isAutoDetected = currency.code === autoDetectedCurrency;
                const isUserDefault =
                  !isGuestCheckout &&
                  currency.code === userProfile?.preferred_display_currency;

                let label = `${currency.symbol} ${currency.code}`;

                if (isUserDefault && !isGuestCheckout && !userSelectedCurrency) {
                  label += ' (Your default)';
                } else if (
                  isAutoDetected &&
                  !isUserDefault &&
                  !(isGuestCheckout ? guestSelectedCurrency : userSelectedCurrency)
                ) {
                  label += ` (Detected from ${locationData?.country || 'your location'})`;
                }

                return (
                  <option key={currency.code} value={currency.code}>
                    {label}
                  </option>
                );
              })}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            Prices will be shown in your selected currency
          </div>
        </div>

        {/* Currency info note */}
        <div className="mt-2 text-xs text-gray-500">
          {autoDetectedCurrency && (
            <span>
              Auto-detected: {availableCurrencies.find(c => c.code === autoDetectedCurrency)?.symbol} {autoDetectedCurrency}
              {locationData?.country && ` based on ${locationData.country}`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};