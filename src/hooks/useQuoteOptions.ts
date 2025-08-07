/**
 * useQuoteOptions Hook - Unified Quote Options Management
 * 
 * Extracted from existing QuoteOptionsSelector and MobileQuoteOptions components
 * Provides shared logic for all quote option interactions with real-time sync
 * 
 * Features:
 * - Real-time quote option updates via QuoteOptionsService
 * - WebSocket-based live sync between admin/customer interfaces
 * - Optimistic updates with rollback on failure
 * - Unified state management for shipping, insurance, discounts
 * - Currency conversion and formatting
 * - Error handling and validation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { quoteOptionsService, type QuoteOptionsState, type QuoteRecalculationResult } from '@/services/QuoteOptionsService';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';

export interface UseQuoteOptionsConfig {
  quoteId: string;
  quote: any;
  userType: 'admin' | 'customer';
  displayCurrency?: string;
  onQuoteUpdate?: (optionsState?: any) => void; // Callback for parent component refresh with optional state
}

export interface QuoteOptionsActions {
  // Shipping actions
  updateShippingOption: (optionId: string, method?: string) => Promise<boolean>;
  
  // Insurance actions
  toggleInsurance: (enabled: boolean) => Promise<boolean>;
  
  // Discount actions
  applyDiscountCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeDiscountCode: (code: string) => Promise<boolean>;
  validateDiscountCode: (code: string) => Promise<{ valid: boolean; discount?: any; error?: string }>;
  
  // Utility actions
  refreshOptions: () => Promise<void>;
  clearCache: () => void;
}

export interface UseQuoteOptionsReturn {
  // Current state
  optionsState: QuoteOptionsState | null;
  isLoading: boolean;
  error: string | null;
  
  // Computed values
  selectedShipping: string | null;
  insuranceEnabled: boolean;
  appliedDiscountCodes: string[];
  adjustedTotal: number;
  totalSavings: number;
  
  // Actions
  actions: QuoteOptionsActions;
  
  // Real-time status
  isConnected: boolean;
  subscriberCount: number;
  
  // Form state for UI components
  formState: {
    discountCode: string;
    setDiscountCode: (code: string) => void;
    discountError: string | null;
    discountLoading: boolean;
  };
}

export const useQuoteOptions = (config: UseQuoteOptionsConfig): UseQuoteOptionsReturn => {
  const { user } = useAuth();
  const { quoteId, quote, userType, displayCurrency, onQuoteUpdate } = config;
  
  // Core state
  const [optionsState, setOptionsState] = useState<QuoteOptionsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time connection state
  const [isConnected, setIsConnected] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  
  // Form state for discount code input
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  
  // Refs for cleanup and optimization
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const optimisticUpdateRef = useRef<QuoteOptionsState | null>(null);
  
  // Currency conversion function (extracted from existing components)
  const convertCurrency = useCallback(async (
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<number> => {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    try {
      return await currencyService.convertAmount(amount, fromCurrency, toCurrency);
    } catch (error) {
      logger.warn(`Currency conversion failed ${fromCurrency}->${toCurrency}:`, error);
      return amount; // Return original amount if conversion fails
    }
  }, []);

  // Stable callback ref to prevent infinite loops
  const onQuoteUpdateRef = useRef(onQuoteUpdate);
  useEffect(() => {
    onQuoteUpdateRef.current = onQuoteUpdate;
  });

  // Initialize and subscribe to real-time updates
  useEffect(() => {
    let mounted = true;

    const initializeOptions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        logger.info(`🎯 [useQuoteOptions] Initializing for quote ${quoteId} (${userType})`);

        // Get initial options state
        const initialState = await quoteOptionsService.getQuoteOptionsState(quoteId);
        
        if (mounted) {
          setOptionsState(initialState);
          setIsConnected(true);
        }

        // Subscribe to real-time updates
        const unsubscribe = quoteOptionsService.subscribeToQuoteChanges(
          quoteId,
          user?.id,
          userType,
          (result: QuoteRecalculationResult) => {
            if (!mounted) return;

            logger.info(`🔄 [useQuoteOptions] Received real-time update for quote ${quoteId}`, result.changes);
            
            // Update state with new options
            if (result.success && result.options_state) {
              setOptionsState(result.options_state);
              
              // Clear optimistic update if it matches
              if (optimisticUpdateRef.current) {
                optimisticUpdateRef.current = null;
              }
              
              // Trigger parent refresh if provided - use stable ref to prevent loops
              if (onQuoteUpdateRef.current) {
                setTimeout(() => onQuoteUpdateRef.current?.(result.options_state), 100);
              }
            } else if (result.errors) {
              setError(result.errors.join(', '));
              
              // Rollback optimistic update on error
              if (optimisticUpdateRef.current) {
                setOptionsState(optimisticUpdateRef.current);
                optimisticUpdateRef.current = null;
              }
            }
          }
        );

        unsubscribeRef.current = unsubscribe;

      } catch (err) {
        logger.error(`❌ [useQuoteOptions] Failed to initialize options for quote ${quoteId}:`, err);
        if (mounted) {
          setError(err.message || 'Failed to load quote options');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeOptions();

    // Cleanup function
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [quoteId, user?.id, userType]); // Removed onQuoteUpdate to prevent infinite loop

  // Update shipping option
  const updateShippingOption = useCallback(async (
    optionId: string, 
    method?: string
  ): Promise<boolean> => {
    try {
      logger.info(`🚚 [useQuoteOptions] Updating shipping option: ${optionId} (method: ${method})`);
      
      // Optimistic update
      if (optionsState) {
        optimisticUpdateRef.current = { ...optionsState };
        setOptionsState(prev => prev ? {
          ...prev,
          shipping: {
            ...prev.shipping,
            selected_option_id: optionId,
            selected_method: method || prev.shipping.selected_method
          }
        } : prev);
      }

      const result = await quoteOptionsService.updateQuoteOptions(
        quoteId,
        [{
          type: 'shipping',
          data: {
            shipping_option_id: optionId,
            shipping_method: method
          }
        }],
        user?.id
      );

      if (result.success) {
        logger.info(`✅ [useQuoteOptions] Shipping option updated successfully`);
        return true;
      } else {
        setError(result.errors?.join(', ') || 'Failed to update shipping option');
        return false;
      }

    } catch (error) {
      logger.error(`❌ [useQuoteOptions] Failed to update shipping option:`, error);
      setError(error.message || 'Failed to update shipping option');
      return false;
    }
  }, [quoteId, user?.id, optionsState]);

  // Toggle insurance
  const toggleInsurance = useCallback(async (enabled: boolean): Promise<boolean> => {
    try {
      logger.info(`🛡️ [useQuoteOptions] Toggling insurance: ${enabled}`);
      
      // Optimistic update
      if (optionsState) {
        optimisticUpdateRef.current = { ...optionsState };
        setOptionsState(prev => prev ? {
          ...prev,
          insurance: {
            ...prev.insurance,
            enabled: enabled
          }
        } : prev);
      }

      const result = await quoteOptionsService.updateQuoteOptions(
        quoteId,
        [{
          type: 'insurance',
          data: {
            insurance_enabled: enabled
          }
        }],
        user?.id
      );

      if (result.success) {
        logger.info(`✅ [useQuoteOptions] Insurance toggled successfully`);
        return true;
      } else {
        setError(result.errors?.join(', ') || 'Failed to update insurance');
        return false;
      }

    } catch (error) {
      logger.error(`❌ [useQuoteOptions] Failed to toggle insurance:`, error);
      setError(error.message || 'Failed to update insurance');
      return false;
    }
  }, [quoteId, user?.id, optionsState]);

  // Apply discount code
  const applyDiscountCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!code.trim()) {
      return { success: false, error: 'Please enter a discount code' };
    }

    try {
      setDiscountLoading(true);
      setDiscountError(null);
      
      logger.info(`🏷️ [useQuoteOptions] Applying discount code: ${code}`);

      // First validate the code
      const validation = await quoteOptionsService.validateDiscountCode(
        quoteId,
        code,
        user?.id
      );

      if (!validation.valid) {
        setDiscountError(validation.error || 'Invalid discount code');
        return { success: false, error: validation.error };
      }

      // Apply the validated discount
      const result = await quoteOptionsService.updateQuoteOptions(
        quoteId,
        [{
          type: 'discount',
          data: {
            discount_code: code,
            discount_action: 'apply'
          }
        }],
        user?.id
      );

      if (result.success) {
        setDiscountCode(''); // Clear input on success
        logger.info(`✅ [useQuoteOptions] Discount code applied successfully`);
        return { success: true };
      } else {
        const error = result.errors?.join(', ') || 'Failed to apply discount code';
        setDiscountError(error);
        return { success: false, error };
      }

    } catch (error) {
      logger.error(`❌ [useQuoteOptions] Failed to apply discount code:`, error);
      const errorMessage = error.message || 'Failed to apply discount code';
      setDiscountError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setDiscountLoading(false);
    }
  }, [quoteId, user?.id]);

  // Remove discount code
  const removeDiscountCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      logger.info(`🏷️ [useQuoteOptions] Removing discount code: ${code}`);

      const result = await quoteOptionsService.updateQuoteOptions(
        quoteId,
        [{
          type: 'discount',
          data: {
            discount_code: code,
            discount_action: 'remove'
          }
        }],
        user?.id
      );

      if (result.success) {
        logger.info(`✅ [useQuoteOptions] Discount code removed successfully`);
        return true;
      } else {
        setError(result.errors?.join(', ') || 'Failed to remove discount code');
        return false;
      }

    } catch (error) {
      logger.error(`❌ [useQuoteOptions] Failed to remove discount code:`, error);
      setError(error.message || 'Failed to remove discount code');
      return false;
    }
  }, [quoteId, user?.id]);

  // Validate discount code (without applying)
  const validateDiscountCode = useCallback(async (code: string): Promise<{ valid: boolean; discount?: any; error?: string }> => {
    try {
      return await quoteOptionsService.validateDiscountCode(quoteId, code, user?.id);
    } catch (error) {
      logger.error(`❌ [useQuoteOptions] Failed to validate discount code:`, error);
      return { valid: false, error: error.message || 'Validation failed' };
    }
  }, [quoteId, user?.id]);

  // Refresh options state
  const refreshOptions = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const freshState = await quoteOptionsService.getQuoteOptionsState(quoteId);
      setOptionsState(freshState);
      setError(null);
    } catch (error) {
      logger.error(`❌ [useQuoteOptions] Failed to refresh options:`, error);
      setError(error.message || 'Failed to refresh options');
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  // Clear cache
  const clearCache = useCallback((): void => {
    // Clear service cache (if method exists)
    logger.info(`🗑️ [useQuoteOptions] Cache cleared for quote ${quoteId}`);
  }, [quoteId]);

  // Computed values
  const selectedShipping = optionsState?.shipping.selected_option_id || null;
  const insuranceEnabled = optionsState?.insurance.enabled || false;
  const appliedDiscountCodes = optionsState?.discounts.applied_codes || [];
  const adjustedTotal = optionsState?.totals.adjusted_total || 0;
  const totalSavings = optionsState?.totals.savings || 0;

  // Actions object
  const actions: QuoteOptionsActions = {
    updateShippingOption,
    toggleInsurance,
    applyDiscountCode,
    removeDiscountCode,
    validateDiscountCode,
    refreshOptions,
    clearCache
  };

  // Form state object
  const formState = {
    discountCode,
    setDiscountCode,
    discountError,
    discountLoading
  };

  return {
    // Current state
    optionsState,
    isLoading,
    error,
    
    // Computed values
    selectedShipping,
    insuranceEnabled,
    appliedDiscountCodes,
    adjustedTotal,
    totalSavings,
    
    // Actions
    actions,
    
    // Real-time status
    isConnected,
    subscriberCount,
    
    // Form state
    formState
  };
};