/**
 * Unified Payment Hook - Consolidates all payment-related functionality
 * 
 * Replaces:
 * - usePaymentGateways
 * - usePaymentErrorHandler
 * - usePaymentLinks
 * - Various payment validation hooks
 * 
 * Provides a single, powerful interface for all payment operations
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import { PaymentGateway, PaymentMethodDisplay, PaymentValidation, PaymentResult } from '@/types/domains';

// Payment Context
interface PaymentContext {
  amount?: number;
  currency?: string;
  country?: string;
  orderType?: 'quote' | 'order' | 'subscription';
}

interface PaymentHookReturn {
  // Gateway Management
  availableGateways: PaymentGateway[];
  gatewayDisplays: PaymentMethodDisplay[];
  isLoadingGateways: boolean;
  gatewayError?: string;
  
  // Gateway Selection
  selectedGateway?: PaymentGateway;
  setSelectedGateway: (gateway: PaymentGateway) => void;
  getRecommendedGateway: () => PaymentGateway | undefined;
  
  // Gateway Info
  getGatewayInfo: (gateway: PaymentGateway) => PaymentMethodDisplay | undefined;
  isGatewayAvailable: (gateway: PaymentGateway) => boolean;
  getGatewayFees: (gateway: PaymentGateway, amount?: number) => Promise<FeeInfo>;
  
  // Validation
  validatePayment: (gateway: PaymentGateway, amount: number) => Promise<PaymentValidation>;
  validateAmount: (amount: number, currency?: string) => boolean;
  
  // Payment Processing
  processPayment: (request: PaymentRequest) => Promise<PaymentResult>;
  isProcessing: boolean;
  paymentError?: PaymentError;
  
  // Error Handling
  clearError: () => void;
  retryPayment: () => Promise<PaymentResult | void>;
  
  // Payment Links
  createPaymentLink: (data: PaymentLinkData) => Promise<PaymentLink>;
  getPaymentLink: (id: string) => Promise<PaymentLink | null>;
  
  // Utilities
  formatGatewayName: (gateway: PaymentGateway) => string;
  getGatewayIcon: (gateway: PaymentGateway) => string;
  calculateTotalWithFees: (amount: number, gateway: PaymentGateway) => Promise<number>;
}

interface FeeInfo {
  percentage?: number;
  fixed?: number;
  total: number;
  description: string;
}

interface PaymentRequest {
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  orderId?: string;
  quoteId?: string;
  customerEmail?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface PaymentError {
  code: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  details?: any;
}

interface PaymentLinkData {
  referenceId: string;
  referenceType: 'quote' | 'order' | 'invoice';
  amount: number;
  currency: string;
  customerEmail: string;
  description: string;
  expiresAt?: string;
  paymentMethods?: PaymentGateway[];
}

interface PaymentLink {
  id: string;
  publicUrl: string;
  accessToken: string;
  status: 'active' | 'paid' | 'expired' | 'cancelled';
  expiresAt?: string;
}

export function usePayment(context: PaymentContext = {}): PaymentHookReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>();
  const [paymentError, setPaymentError] = useState<PaymentError>();
  
  // Determine payment context
  const paymentContext = useMemo(() => ({
    amount: context.amount || 0,
    currency: context.currency || user?.profile?.preferred_display_currency || 'USD',
    country: context.country || user?.profile?.country || 'US',
    orderType: context.orderType || 'quote',
  }), [context, user]);
  
  // Load available payment gateways
  const { 
    data: availableGateways = [], 
    isLoading: isLoadingGateways,
    error: gatewayError
  } = useQuery({
    queryKey: ['payment_gateways', paymentContext.country, paymentContext.currency],
    queryFn: async () => {
      try {
        // Simulate API call - replace with actual service
        const response = await fetch('/api/payment/gateways', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: paymentContext.country,
            currency: paymentContext.currency,
            amount: paymentContext.amount,
          }),
        });
        
        if (!response.ok) throw new Error('Failed to load payment gateways');
        
        const data = await response.json();
        return data.gateways || [];
      } catch (error) {
        logger.error('Failed to load payment gateways', error);
        // Fallback to default gateways
        return getDefaultGateways(paymentContext.country);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
  
  // Gateway display information
  const gatewayDisplays = useMemo(() => {
    return availableGateways.map(gateway => getGatewayDisplay(gateway, paymentContext));
  }, [availableGateways, paymentContext]);
  
  // Gateway management functions
  const getRecommendedGateway = useCallback((): PaymentGateway | undefined => {
    if (availableGateways.length === 0) return undefined;
    
    // Logic for gateway recommendation
    const recommendations = getGatewayRecommendations(
      availableGateways, 
      paymentContext
    );
    
    return recommendations[0];
  }, [availableGateways, paymentContext]);
  
  const getGatewayInfo = useCallback((gateway: PaymentGateway) => {
    return gatewayDisplays.find(display => display.code === gateway);
  }, [gatewayDisplays]);
  
  const isGatewayAvailable = useCallback((gateway: PaymentGateway) => {
    return availableGateways.includes(gateway);
  }, [availableGateways]);
  
  const getGatewayFees = useCallback(async (gateway: PaymentGateway, amount?: number): Promise<FeeInfo> => {
    const targetAmount = amount || paymentContext.amount;
    
    try {
      // Simulate fee calculation - replace with actual service
      const response = await fetch('/api/payment/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway,
          amount: targetAmount,
          currency: paymentContext.currency,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to calculate fees');
      
      return await response.json();
    } catch (error) {
      logger.error('Failed to calculate gateway fees', { gateway, amount: targetAmount, error });
      return getDefaultFees(gateway, targetAmount);
    }
  }, [paymentContext]);
  
  // Validation functions
  const validatePayment = useCallback(async (gateway: PaymentGateway, amount: number): Promise<PaymentValidation> => {
    try {
      const response = await fetch('/api/payment/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway,
          amount,
          currency: paymentContext.currency,
          country: paymentContext.country,
        }),
      });
      
      if (!response.ok) throw new Error('Validation failed');
      
      return await response.json();
    } catch (error) {
      logger.error('Payment validation failed', { gateway, amount, error });
      return {
        amount_valid: amount > 0,
        currency_supported: true,
        country_supported: true,
        gateway_available: isGatewayAvailable(gateway),
        user_eligible: true,
        errors: [],
        warnings: [],
      };
    }
  }, [paymentContext, isGatewayAvailable]);
  
  const validateAmount = useCallback((amount: number, currency?: string) => {
    const targetCurrency = currency || paymentContext.currency;
    const minAmount = getMinimumAmount(targetCurrency);
    const maxAmount = getMaximumAmount(targetCurrency);
    
    return amount >= minAmount && amount <= maxAmount;
  }, [paymentContext]);
  
  // Payment processing
  const paymentMutation = useMutation({
    mutationFn: async (request: PaymentRequest): Promise<PaymentResult> => {
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment processing failed');
      }
      
      return await response.json();
    },
    onError: (error: any) => {
      setPaymentError({
        code: error.code || 'PAYMENT_ERROR',
        message: error.message || 'Payment failed',
        recoverable: error.recoverable || false,
        retryable: error.retryable || true,
        details: error.details,
      });
    },
    onSuccess: () => {
      setPaymentError(undefined);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payment_transactions'] });
    },
  });
  
  const processPayment = useCallback((request: PaymentRequest) => {
    return paymentMutation.mutateAsync(request);
  }, [paymentMutation]);
  
  // Error handling
  const clearError = useCallback(() => {
    setPaymentError(undefined);
  }, []);
  
  const retryPayment = useCallback(async () => {
    if (!paymentError?.retryable) return;
    
    // Clear error and retry last payment
    setPaymentError(undefined);
    return paymentMutation.retry();
  }, [paymentError, paymentMutation]);
  
  // Payment Links
  const createPaymentLink = useCallback(async (data: PaymentLinkData): Promise<PaymentLink> => {
    const response = await fetch('/api/payment/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to create payment link');
    
    return await response.json();
  }, []);
  
  const getPaymentLink = useCallback(async (id: string): Promise<PaymentLink | null> => {
    try {
      const response = await fetch(`/api/payment/links/${id}`);
      
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      logger.error('Failed to get payment link', { id, error });
      return null;
    }
  }, []);
  
  // Utility functions
  const formatGatewayName = useCallback((gateway: PaymentGateway) => {
    const info = getGatewayInfo(gateway);
    return info?.name || gateway.charAt(0).toUpperCase() + gateway.slice(1);
  }, [getGatewayInfo]);
  
  const getGatewayIcon = useCallback((gateway: PaymentGateway) => {
    const info = getGatewayInfo(gateway);
    return info?.icon || 'credit-card';
  }, [getGatewayInfo]);
  
  const calculateTotalWithFees = useCallback(async (amount: number, gateway: PaymentGateway) => {
    const fees = await getGatewayFees(gateway, amount);
    return amount + fees.total;
  }, [getGatewayFees]);
  
  return {
    // Gateway Management
    availableGateways,
    gatewayDisplays,
    isLoadingGateways,
    gatewayError: gatewayError?.message,
    
    // Gateway Selection
    selectedGateway,
    setSelectedGateway,
    getRecommendedGateway,
    
    // Gateway Info
    getGatewayInfo,
    isGatewayAvailable,
    getGatewayFees,
    
    // Validation
    validatePayment,
    validateAmount,
    
    // Payment Processing
    processPayment,
    isProcessing: paymentMutation.isPending,
    paymentError,
    
    // Error Handling
    clearError,
    retryPayment,
    
    // Payment Links
    createPaymentLink,
    getPaymentLink,
    
    // Utilities
    formatGatewayName,
    getGatewayIcon,
    calculateTotalWithFees,
  };
}

// Helper functions
function getDefaultGateways(country: string): PaymentGateway[] {
  const defaultGateways: Record<string, PaymentGateway[]> = {
    US: ['stripe', 'paypal', 'bank_transfer'],
    IN: ['payu', 'razorpay', 'upi', 'bank_transfer'],
    NP: ['esewa', 'khalti', 'fonepay', 'bank_transfer'],
  };
  
  return defaultGateways[country] || ['bank_transfer'];
}

function getGatewayDisplay(gateway: PaymentGateway, context: any): PaymentMethodDisplay {
  // Mock display data - replace with actual service
  const displays: Record<string, Partial<PaymentMethodDisplay>> = {
    stripe: { name: 'Credit Card', icon: 'credit-card', description: 'Visa, Mastercard, Amex' },
    paypal: { name: 'PayPal', icon: 'paypal', description: 'Pay with your PayPal account' },
    bank_transfer: { name: 'Bank Transfer', icon: 'bank', description: 'Direct bank transfer' },
    payu: { name: 'PayU', icon: 'credit-card', description: 'Cards, UPI, Net Banking' },
    esewa: { name: 'eSewa', icon: 'wallet', description: 'Digital wallet payment' },
    khalti: { name: 'Khalti', icon: 'wallet', description: 'Digital wallet payment' },
  };
  
  const display = displays[gateway] || { name: gateway, icon: 'credit-card', description: '' };
  
  return {
    code: gateway,
    name: display.name || gateway,
    description: display.description || '',
    icon: display.icon || 'credit-card',
    is_enabled: true,
    ...display,
  };
}

function getGatewayRecommendations(gateways: PaymentGateway[], context: any): PaymentGateway[] {
  // Simple recommendation logic - can be enhanced
  const recommendations = [...gateways];
  
  // Prioritize based on country
  if (context.country === 'US') {
    return recommendations.sort((a, b) => {
      const order = ['stripe', 'paypal', 'bank_transfer'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }
  
  return recommendations;
}

function getDefaultFees(gateway: PaymentGateway, amount: number): FeeInfo {
  const feeRates: Record<string, { percentage: number; fixed: number }> = {
    stripe: { percentage: 2.9, fixed: 0.30 },
    paypal: { percentage: 3.4, fixed: 0.30 },
    payu: { percentage: 2.0, fixed: 0 },
    bank_transfer: { percentage: 0, fixed: 5.0 },
  };
  
  const rate = feeRates[gateway] || { percentage: 2.5, fixed: 0.50 };
  const percentageFee = (amount * rate.percentage) / 100;
  const total = percentageFee + rate.fixed;
  
  return {
    percentage: rate.percentage,
    fixed: rate.fixed,
    total,
    description: `${rate.percentage}% + $${rate.fixed}`,
  };
}

function getMinimumAmount(currency: string): number {
  const minimums: Record<string, number> = {
    USD: 1.0,
    INR: 50.0,
    NPR: 100.0,
    EUR: 1.0,
  };
  
  return minimums[currency] || 1.0;
}

function getMaximumAmount(currency: string): number {
  const maximums: Record<string, number> = {
    USD: 50000,
    INR: 2500000,
    NPR: 5000000,
    EUR: 50000,
  };
  
  return maximums[currency] || 50000;
}

// Specialized hooks for specific use cases
export function usePaymentGateways(country?: string, currency?: string) {
  return usePayment({ country, currency });
}

export function usePaymentProcessing() {
  const payment = usePayment();
  
  return {
    processPayment: payment.processPayment,
    isProcessing: payment.isProcessing,
    paymentError: payment.paymentError,
    clearError: payment.clearError,
    retryPayment: payment.retryPayment,
  };
}