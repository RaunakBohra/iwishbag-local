import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestCurrencyContextType {
  guestCurrency: string | null;
  setGuestCurrency: (currency: string) => void;
  clearGuestCurrency: () => void;
}

const GuestCurrencyContext = createContext<GuestCurrencyContextType | undefined>(undefined);

interface GuestCurrencyProviderProps {
  children: ReactNode;
  shareToken?: string; // Optional share token to namespace the storage
}

export function GuestCurrencyProvider({ children, shareToken }: GuestCurrencyProviderProps) {
  const [guestCurrency, setGuestCurrencyState] = useState<string | null>(null);

  // Create a storage key that includes share token for isolation
  const storageKey = shareToken ? `guest-currency-${shareToken}` : 'guest-currency';

  // Load currency from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setGuestCurrencyState(saved);
      }
    } catch (error) {
      console.warn('Failed to load guest currency from localStorage:', error);
    }
  }, [storageKey]);

  // Set currency and save to localStorage
  const setGuestCurrency = (currency: string) => {
    try {
      localStorage.setItem(storageKey, currency);
      setGuestCurrencyState(currency);
    } catch (error) {
      console.warn('Failed to save guest currency to localStorage:', error);
      // Still update state even if localStorage fails
      setGuestCurrencyState(currency);
    }
  };

  // Clear currency preference
  const clearGuestCurrency = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear guest currency from localStorage:', error);
    }
    setGuestCurrencyState(null);
  };

  const value = {
    guestCurrency,
    setGuestCurrency,
    clearGuestCurrency,
  };

  return <GuestCurrencyContext.Provider value={value}>{children}</GuestCurrencyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGuestCurrency() {
  const context = useContext(GuestCurrencyContext);
  if (context === undefined) {
    throw new Error('useGuestCurrency must be used within a GuestCurrencyProvider');
  }
  return context;
}
