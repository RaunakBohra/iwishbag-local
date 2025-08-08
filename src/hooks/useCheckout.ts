/**
 * Checkout Hooks - Reusable checkout-related functionality
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/unified';
import { CheckoutService } from '@/services/CheckoutService';
import { logger } from '@/utils/logger';
import type { Tables } from '@/integrations/supabase/types';
import type { CartItem } from '@/types/cart';

export interface OrderSummary {
  itemsTotal: number;
  shippingTotal: number;
  taxesTotal: number;
  serviceFeesTotal: number;
  finalTotal: number;
  currency: string;
  savings?: number;
}

export interface ContactInfo {
  email: string;
  subscribe: boolean;
}

export interface OrderData {
  items: CartItem[];
  address: Tables<'delivery_addresses'>;
  paymentMethod: string;
  orderSummary: OrderSummary;
  userId: string;
  contactInfo?: ContactInfo;
  orderNotes?: string;
}

/**
 * Main checkout hook with order calculation and placement
 */
export function useCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { displayCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  
  const checkoutService = useMemo(() => CheckoutService.getInstance(), []);

  const calculateOrderSummary = useCallback(async (
    cartItems: CartItem[] = items,
    destinationCountry?: string
  ) => {
    if (cartItems.length === 0) {
      setOrderSummary(null);
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate items
      const hasValidItems = cartItems.every(item => 
        item.quote && 
        typeof item.quote.final_total_origincurrency === 'number' &&
        !isNaN(item.quote.final_total_origincurrency)
      );
      
      if (!hasValidItems) {
        throw new Error('Some items have invalid pricing data. Please refresh and try again.');
      }

      const country = destinationCountry || user?.profile?.country || 'US';
      const summary = await checkoutService.calculateOrderSummary(cartItems, country);
      
      setOrderSummary(summary);
      return summary;
      
    } catch (error) {
      logger.error('Failed to calculate order summary:', error);
      const message = error instanceof Error ? error.message : 'Failed to calculate order total. Please try again.';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [items, user?.profile?.country, checkoutService]);

  const placeOrder = useCallback(async (orderData: Omit<OrderData, 'items' | 'userId'>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      setProcessingOrder(true);
      setError(null);
      
      const fullOrderData: OrderData = {
        ...orderData,
        items,
        userId: user.id
      };
      
      const order = await checkoutService.createOrder(fullOrderData);
      
      // Clear cart after successful order
      await clearCart();
      
      return order;
      
    } catch (error) {
      logger.error('Failed to place order:', error);
      const message = error instanceof Error ? error.message : 'Failed to place order. Please try again.';
      setError(message);
      throw error;
    } finally {
      setProcessingOrder(false);
    }
  }, [user, items, checkoutService, clearCart]);

  const navigateToOrderConfirmation = useCallback((orderId: string) => {
    navigate(`/order-confirmation/${orderId}`, { replace: true });
  }, [navigate]);

  const navigateToCart = useCallback(() => {
    navigate('/cart');
  }, [navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    orderSummary,
    processingOrder,
    items,
    displayCurrency,
    
    // Actions
    calculateOrderSummary,
    placeOrder,
    navigateToOrderConfirmation,
    navigateToCart,
    clearError,
    
    // Computed state
    hasItems: items.length > 0,
    totalItems: items.length
  };
}

/**
 * Checkout form validation hook
 */
export function useCheckoutValidation() {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    subscribe: false
  });
  const [selectedAddress, setSelectedAddress] = useState<Tables<'delivery_addresses'> | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState('');

  const updateContactInfo = useCallback((field: keyof ContactInfo, value: any) => {
    setContactInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddressSelect = useCallback((address: Tables<'delivery_addresses'>) => {
    setSelectedAddress(address);
  }, []);

  const setPaymentMethod = useCallback((method: string) => {
    setSelectedPaymentMethod(method);
  }, []);

  const setNotes = useCallback((notes: string) => {
    setOrderNotes(notes);
  }, []);

  // Validation
  const isContactValid = contactInfo.email.length > 0 && contactInfo.email.includes('@');
  const isAddressValid = selectedAddress !== null;
  const isPaymentValid = selectedPaymentMethod !== null;
  const canPlaceOrder = isContactValid && isAddressValid && isPaymentValid;

  const reset = useCallback(() => {
    setContactInfo({ email: '', subscribe: false });
    setSelectedAddress(null);
    setSelectedPaymentMethod(null);
    setOrderNotes('');
  }, []);

  return {
    // Form data
    contactInfo,
    selectedAddress,
    selectedPaymentMethod,
    orderNotes,
    
    // Updates
    updateContactInfo,
    handleAddressSelect,
    setPaymentMethod,
    setNotes,
    
    // Validation
    isContactValid,
    isAddressValid,
    isPaymentValid,
    canPlaceOrder,
    
    // Actions
    reset,
    
    // Form state for order placement
    getOrderData: useCallback(() => ({
      contactInfo,
      orderNotes
    }), [contactInfo, orderNotes])
  };
}

/**
 * Price formatting hook for checkout
 */
export function useCheckoutPricing() {
  const { displayCurrency } = useCurrency();

  const formatPrice = useCallback(async (
    amount: number,
    fromCurrency?: string,
    quote?: any
  ): Promise<string> => {
    try {
      if (!amount || isNaN(amount) || amount < 0) {
        return currencyService.formatAmount(0, displayCurrency);
      }

      // Use quote context if available for better currency detection
      if (quote) {
        const { formatAmountWithConversion, getSourceCurrency } = useCurrency({ quote });
        const sourceCurrency = fromCurrency || getSourceCurrency(quote);
        return await formatAmountWithConversion(amount, sourceCurrency);
      }

      // Fallback to standard conversion
      const sourceCurrency = fromCurrency || displayCurrency;
      if (sourceCurrency === displayCurrency) {
        return currencyService.formatAmount(amount, sourceCurrency);
      }

      const converted = await currencyService.convertAmount(amount, sourceCurrency, displayCurrency);
      return currencyService.formatAmount(converted, displayCurrency);
      
    } catch (error) {
      logger.error('Failed to format checkout price', { amount, fromCurrency, error });
      return currencyService.formatAmount(amount || 0, fromCurrency || displayCurrency);
    }
  }, [displayCurrency]);

  return {
    formatPrice,
    displayCurrency
  };
}

/**
 * Order summary calculation hook
 */
export function useOrderSummary(
  items: CartItem[] = [],
  destinationCountry?: string
) {
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const checkoutService = useMemo(() => CheckoutService.getInstance(), []);

  const calculate = useCallback(async () => {
    if (items.length === 0) {
      setSummary(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const country = destinationCountry || user?.profile?.country || 'US';
      const result = await checkoutService.calculateOrderSummary(items, country);
      setSummary(result);
      
    } catch (err) {
      logger.error('Failed to calculate order summary:', err);
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }, [items, destinationCountry, user?.profile?.country, checkoutService]);

  return {
    summary,
    loading,
    error,
    calculate,
    recalculate: calculate
  };
}