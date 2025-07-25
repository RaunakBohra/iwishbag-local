import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useGuestCurrency } from '@/contexts/GuestCurrencyContext';
import { currencyService } from '@/services/CurrencyService';

interface GuestCurrencySelectorProps {
  defaultCurrency?: string; // Fallback country code or currency code
  className?: string;
}

export function GuestCurrencySelector({
  defaultCurrency,
  className = '',
}: GuestCurrencySelectorProps) {
  const { guestCurrency, setGuestCurrency } = useGuestCurrency();
  const [availableCurrencies, setAvailableCurrencies] = useState<
    Array<{
      code: string;
      symbol: string;
      formatted: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available currencies on mount
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setIsLoading(true);

        // Get all currencies from CurrencyService
        const currencies = await currencyService.getAllCurrencies();

        // Format for display
        const formatted = currencies.map((currency) => ({
          code: currency.code,
          symbol: currency.symbol,
          formatted: `${currency.code} - ${currency.symbol}`,
        }));

        setAvailableCurrencies(formatted);
      } catch (error) {
        console.warn('Failed to load currencies for guest selector:', error);
        // Fallback to essential currencies
        setAvailableCurrencies([
          { code: 'USD', symbol: '$', formatted: 'USD - $' },
          { code: 'INR', symbol: '₹', formatted: 'INR - ₹' },
          { code: 'NPR', symbol: '₨', formatted: 'NPR - ₨' },
          { code: 'EUR', symbol: '€', formatted: 'EUR - €' },
          { code: 'GBP', symbol: '£', formatted: 'GBP - £' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  // Set default currency if none selected
  useEffect(() => {
    const setDefaultCurrency = async () => {
      if (!guestCurrency && defaultCurrency && availableCurrencies.length > 0) {
        let currencyToSet = defaultCurrency;

        // If defaultCurrency looks like a country code (2 letters), get its currency
        if (defaultCurrency.length === 2) {
          try {
            const countryCurrency = await currencyService.getCurrencyForCountry(defaultCurrency);
            if (countryCurrency) {
              currencyToSet = countryCurrency;
            }
          } catch (error) {
            console.warn('Failed to get currency for country:', defaultCurrency, error);
          }
        }

        const isValidDefault = availableCurrencies.some((c) => c.code === currencyToSet);
        if (isValidDefault) {
          setGuestCurrency(currencyToSet);
        }
      }
    };

    setDefaultCurrency();
  }, [guestCurrency, defaultCurrency, availableCurrencies, setGuestCurrency]);

  const currentCurrency = guestCurrency || defaultCurrency || 'USD';
  const _currentCurrencyInfo = availableCurrencies.find((c) => c.code === currentCurrency);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Globe className="h-4 w-4" />
        <span>Loading currencies...</span>
      </div>
    );
  }

  if (availableCurrencies.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-gray-600" />
      <div className="relative">
        <label htmlFor="guest-currency-selector" className="sr-only">
          Select display currency
        </label>
        <select
          id="guest-currency-selector"
          className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer hover:border-gray-400 transition-colors"
          value={currentCurrency}
          onChange={(e) => setGuestCurrency(e.target.value)}
        >
          {availableCurrencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.formatted}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <div className="text-xs text-gray-500 hidden sm:block">Display Currency</div>
    </div>
  );
}
