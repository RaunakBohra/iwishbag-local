import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  PaymentGateway, 
  PaymentGatewayConfig, 
  PaymentRequest, 
  PaymentResponse,
  CountryPaymentMethods,
  PaymentMethodDisplay,
  FALLBACK_GATEWAY_CODES 
} from '@/types/payment';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { paymentGatewayService } from '@/services/PaymentGatewayService';

// Payment method display configurations
const PAYMENT_METHOD_DISPLAYS: Record<PaymentGateway, PaymentMethodDisplay> = {
  stripe: {
    code: 'stripe',
    name: 'Credit Card',
    description: 'Secure payment via Stripe. All major cards accepted.',
    icon: 'credit-card',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: 'Instant',
    fees: '2.9% + $0.30'
  },
  payu: {
    code: 'payu',
    name: 'PayU',
    description: 'Pay using UPI, cards, net banking, or wallets.',
    icon: 'smartphone',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: '5-15 minutes',
    fees: '2.5%'
  },
  esewa: {
    code: 'esewa',
    name: 'eSewa',
    description: 'Pay using eSewa mobile app with QR code.',
    icon: 'smartphone',
    is_mobile_only: true,
    requires_qr: true,
    processing_time: '5-30 minutes',
    fees: '1.5%'
  },
  khalti: {
    code: 'khalti',
    name: 'Khalti',
    description: 'Pay using Khalti mobile app with QR code.',
    icon: 'smartphone',
    is_mobile_only: true,
    requires_qr: true,
    processing_time: '5-30 minutes',
    fees: '1.5%'
  },
  fonepay: {
    code: 'fonepay',
    name: 'Fonepay',
    description: 'Pay using Fonepay mobile app with QR code.',
    icon: 'smartphone',
    is_mobile_only: true,
    requires_qr: true,
    processing_time: '5-30 minutes',
    fees: '1.5%'
  },
  airwallex: {
    code: 'airwallex',
    name: 'Airwallex',
    description: 'International payments with competitive rates.',
    icon: 'globe',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: 'Instant to 24 hours',
    fees: '1.8% + $0.30'
  },
  bank_transfer: {
    code: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Pay via bank transfer. Details provided after order.',
    icon: 'landmark',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: '1-3 business days',
    fees: 'No additional fees'
  },
  cod: {
    code: 'cod',
    name: 'Cash on Delivery',
    description: 'Pay in cash when your order arrives.',
    icon: 'banknote',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: 'Pay upon delivery',
    fees: 'No additional fees'
  },
  razorpay: {
    code: 'razorpay',
    name: 'Razorpay',
    description: 'Pay using UPI, cards, net banking, or wallets.',
    icon: 'credit-card',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: 'Instant',
    fees: '2%'
  },
  paypal: {
    code: 'paypal',
    name: 'PayPal',
    description: 'Secure international payments with PayPal.',
    icon: 'globe',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: 'Instant',
    fees: '3.9% + $0.30'
  },
  upi: {
    code: 'upi',
    name: 'UPI',
    description: 'Pay directly from your bank using UPI.',
    icon: 'smartphone',
    is_mobile_only: false,
    requires_qr: true,
    processing_time: 'Instant',
    fees: 'No additional fees'
  },
  paytm: {
    code: 'paytm',
    name: 'Paytm',
    description: 'Pay using Paytm wallet or UPI.',
    icon: 'smartphone',
    is_mobile_only: false,
    requires_qr: true,
    processing_time: '5-15 minutes',
    fees: '1.99%'
  },
  grabpay: {
    code: 'grabpay',
    name: 'GrabPay',
    description: 'Pay using GrabPay wallet.',
    icon: 'smartphone',
    is_mobile_only: true,
    requires_qr: true,
    processing_time: '5-15 minutes',
    fees: '1.5%'
  },
  alipay: {
    code: 'alipay',
    name: 'Alipay',
    description: 'Pay using Alipay wallet.',
    icon: 'smartphone',
    is_mobile_only: false,
    requires_qr: true,
    processing_time: '5-15 minutes',
    fees: '1.8%'
  }
};

// Helper function to format fees from database values
const formatFeeFromGatewayConfig = (gateway: PaymentGatewayConfig): string => {
  if (gateway.code === 'bank_transfer' || gateway.code === 'cod' || gateway.code === 'upi') {
    return 'No additional fees';
  }
  
  let feeString = '';
  if (gateway.fee_percent > 0) {
    feeString = `${gateway.fee_percent}%`;
  }
  if (gateway.fee_fixed > 0) {
    if (feeString) feeString += ' + ';
    feeString += `$${gateway.fee_fixed}`;
  }
  
  return feeString || 'No additional fees';
};

// Payment gateway configuration types
export interface PaymentGatewayConfig {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  supported_countries: string[];
  supported_currencies: string[];
  fee_percent: number;
  fee_fixed: number;
  config: Record<string, any>;
  test_mode: boolean;
  created_at: string;
  updated_at: string;
}

// Remove duplicate PaymentGateway type definition - it's now imported from types/payment.ts

export interface PaymentMethodDisplay {
  code: PaymentGateway;
  name: string;
  description: string;
  icon: string;
  is_mobile_only: boolean;
  requires_qr: boolean;
  processing_time: string;
  fees: string;
}

// Standalone function to get payment methods by currency
export const getPaymentMethodsByCurrency = async (currency: string, codEnabled: boolean = false): Promise<PaymentGateway[]> => {
  const { data: gateways, error } = await supabase
    .from('payment_gateways')
    .select('code, supported_currencies, is_active, test_mode, config')
    .eq('is_active', true);

  if (error || !gateways) {
    console.error('Error fetching gateways:', error);
    return ['bank_transfer']; // Return at least bank transfer as fallback
  }

  const filteredGateways = gateways
    .filter(gateway => {
      // Only filter by currency
      const currencyMatch = gateway.supported_currencies.includes(currency);
      
      // Don't filter bank_transfer and cod here - they'll be handled separately
      if (gateway.code === 'bank_transfer' || gateway.code === 'cod') {
        return false;
      }
      
      let hasKeys = true;
      if (gateway.code === 'stripe') {
        const pk = gateway.test_mode ? gateway.config?.test_publishable_key : gateway.config?.live_publishable_key;
        hasKeys = !!pk;
      } else if (gateway.code === 'payu') {
        // Check for PayU configuration
        const hasMerchantId = !!gateway.config?.merchant_id;
        const hasMerchantKey = !!gateway.config?.merchant_key;
        const hasSaltKey = !!gateway.config?.salt_key;
        hasKeys = hasMerchantId && hasMerchantKey && hasSaltKey;
        
        // TEMPORARY: Allow PayU without configuration for testing
        if (!hasKeys) {
          hasKeys = true;
        }
      }
      
      return currencyMatch && hasKeys;
    });

  const finalMethods = filteredGateways.map(gateway => gateway.code as PaymentGateway);

  // Add Bank Transfer only if it supports the currency
  const bankTransferGateway = gateways.find(g => g.code === 'bank_transfer');
  if (bankTransferGateway && bankTransferGateway.supported_currencies.includes(currency)) {
    finalMethods.push('bank_transfer');
  }

  // Add COD only if enabled AND supports the currency
  const codGateway = gateways.find(g => g.code === 'cod');
  if (codEnabled && codGateway && codGateway.supported_currencies.includes(currency)) {
    finalMethods.push('cod');
  }
  
  // Remove duplicates
  return [...new Set(finalMethods)];
};

export const usePaymentGateways = (overrideCurrency?: string, guestShippingCountry?: string) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all payment gateways (admin only)
  const { data: allGateways, isLoading: gatewaysLoading } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async (): Promise<PaymentGatewayConfig[]> => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Get available payment methods for user's country
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_display_currency, country, cod_enabled')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Debug the enabled condition
  const isQueryEnabled = user ? !!userProfile : !!overrideCurrency;

  // Get available payment methods for current user or guest with country-specific logic
  const { data: availableMethods, isLoading: methodsLoading } = useQuery({
    queryKey: user 
      ? ['available-payment-methods', 'authenticated', userProfile?.preferred_display_currency, userProfile?.country, userProfile?.cod_enabled, user.id]
      : ['available-payment-methods', 'guest', overrideCurrency, guestShippingCountry],
    queryFn: async (): Promise<PaymentGateway[]> => {
      // Use override currency if provided (for guest checkout), otherwise use user's preferred currency
      const currencyCode = overrideCurrency || userProfile?.preferred_display_currency;
      // Use guest shipping country or user's country
      const countryCode = guestShippingCountry || userProfile?.country;
      
      if (!currencyCode) {
        console.log('Payment methods not available: missing currency data', {
          overrideCurrency,
          userProfileCurrency: userProfile?.preferred_display_currency,
          user: !!user
        });
        return [];
      }

      // Debug logging for development
      if (import.meta.env.DEV) {
        console.log('🚀 Enhanced payment gateway query starting:', { 
          currencyCode, 
          countryCode,
          isGuest: !user,
          overrideCurrency,
          guestShippingCountry 
        });
      }

      // First, try to get country-specific configuration
      let countryGateways: PaymentGateway[] = [];
      if (countryCode) {
        const { data: countrySettings, error: countryError } = await supabase
          .from('country_settings')
          .select('available_gateways, default_gateway, gateway_config')
          .eq('code', countryCode)
          .single();

        if (!countryError && countrySettings?.available_gateways) {
          console.log('✅ Using country-specific gateway configuration for', countryCode, ':', countrySettings.available_gateways);
          
          // Filter country gateways by currency support and active status
          const { data: gateways, error: gatewaysError } = await supabase
            .from('payment_gateways')
            .select('code, supported_currencies, is_active, test_mode, config')
            .in('code', countrySettings.available_gateways)
            .eq('is_active', true);

          if (!gatewaysError && gateways) {
            countryGateways = gateways
              .filter(gateway => {
                // Check currency support
                const currencyMatch = gateway.supported_currencies.includes(currencyCode);
                
                // Special handling for COD - check user preference
                if (gateway.code === 'cod') {
                  if (user && !userProfile?.cod_enabled) {
                    return false; // User has COD disabled
                  }
                }
                
                // Check gateway configuration for PayPal and others
                let hasValidConfig = true;
                if (gateway.code === 'paypal') {
                  const clientId = gateway.test_mode ? gateway.config?.client_id_sandbox : gateway.config?.client_id_live;
                  const clientSecret = gateway.test_mode ? gateway.config?.client_secret_sandbox : gateway.config?.client_secret_live;
                  hasValidConfig = !!clientId && !!clientSecret;
                  
                  // Allow PayPal without configuration for testing
                  if (!hasValidConfig) {
                    console.log('⚠️ PayPal configuration missing, but allowing for testing');
                    hasValidConfig = true;
                  }
                } else if (gateway.code === 'stripe') {
                  const pk = gateway.test_mode ? gateway.config?.test_publishable_key : gateway.config?.live_publishable_key;
                  hasValidConfig = !!pk;
                } else if (gateway.code === 'payu') {
                  const hasMerchantId = !!gateway.config?.merchant_id;
                  const hasMerchantKey = !!gateway.config?.merchant_key;
                  const hasSaltKey = !!gateway.config?.salt_key;
                  hasValidConfig = hasMerchantId && hasMerchantKey && hasSaltKey;
                  
                  // TEMPORARY: Allow PayU without configuration for testing
                  if (!hasValidConfig) {
                    console.log('⚠️ PayU configuration missing, but allowing for testing');
                    hasValidConfig = true;
                  }
                }
                
                return currencyMatch && hasValidConfig;
              })
              .map(gateway => gateway.code as PaymentGateway);

            console.log('🎯 Country-specific available methods for', countryCode, ':', countryGateways);
            return countryGateways;
          }
        }
      }

      // Fallback to global gateway selection if no country-specific config
      console.log('🔄 Falling back to global gateway selection');
      
      const { data: gateways, error } = await supabase
        .from('payment_gateways')
        .select('code, supported_countries, supported_currencies, is_active, test_mode, config')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching payment gateways:', error);
        return [];
      }
      if (!gateways) {
        console.error('❌ No payment gateways returned from database');
        return [];
      }
      
      console.log('✅ Payment gateways fetched:', gateways.length, 'gateways');

      const filteredGateways = gateways
        .filter(gateway => {
          // Filter by currency and optionally by country
          const currencyMatch = gateway.supported_currencies.includes(currencyCode);
          const countryMatch = !countryCode || gateway.supported_countries.includes(countryCode);
          
          // Don't filter bank_transfer and cod here - they'll be handled separately
          if (gateway.code === 'bank_transfer' || gateway.code === 'cod') {
            return false;
          }
          
          let hasKeys = true;
          if (gateway.code === 'stripe') {
            const pk = gateway.test_mode ? gateway.config?.test_publishable_key : gateway.config?.live_publishable_key;
            hasKeys = !!pk;
          } else if (gateway.code === 'payu') {
            const hasMerchantId = !!gateway.config?.merchant_id;
            const hasMerchantKey = !!gateway.config?.merchant_key;
            const hasSaltKey = !!gateway.config?.salt_key;
            hasKeys = hasMerchantId && hasMerchantKey && hasSaltKey;
            
            // TEMPORARY: Allow PayU without configuration for testing
            if (!hasKeys) {
              console.log('⚠️ PayU configuration missing, but allowing for testing');
              hasKeys = true;
            }
          } else if (gateway.code === 'paypal') {
            const clientId = gateway.test_mode ? gateway.config?.client_id_sandbox : gateway.config?.client_id_live;
            const clientSecret = gateway.test_mode ? gateway.config?.client_secret_sandbox : gateway.config?.client_secret_live;
            hasKeys = !!clientId && !!clientSecret;
            
            // Allow PayPal without configuration for testing
            if (!hasKeys) {
              console.log('⚠️ PayPal configuration missing, but allowing for testing');
              hasKeys = true;
            }
          }
          
          return currencyMatch && countryMatch && hasKeys;
        });

      const finalMethods = filteredGateways.map(gateway => gateway.code as PaymentGateway);

      // Add Bank Transfer only if it supports the currency
      const bankTransferGateway = gateways.find(g => g.code === 'bank_transfer');
      if (bankTransferGateway && bankTransferGateway.supported_currencies.includes(currencyCode)) {
        finalMethods.push('bank_transfer');
      }

      // Add COD based on user preference OR guest shipping country
      const codGateway = gateways.find(g => g.code === 'cod');
      if (codGateway && codGateway.supported_currencies.includes(currencyCode)) {
        // For authenticated users: check user preference
        if (user && userProfile?.cod_enabled) {
          finalMethods.push('cod');
        }
        // For guests: check if shipping country supports COD
        else if (!user && guestShippingCountry && codGateway.supported_countries.includes(guestShippingCountry)) {
          finalMethods.push('cod');
        }
      }
      
      // Remove duplicates
      const uniqueMethods = [...new Set(finalMethods)];
      
      // Debug logging for development
      if (import.meta.env.DEV) {
        console.log('🎯 Available payment methods for', currencyCode, countryCode || 'global', ':', uniqueMethods);
        console.log('🔧 Query context:', { 
          isGuest: !user, 
          overrideCurrency, 
          guestShippingCountry,
          userProfileCurrency: userProfile?.preferred_display_currency,
          userCountry: userProfile?.country
        });
      }
      
      return uniqueMethods;
    },
    enabled: isQueryEnabled,
    onError: (error) => {
      console.error('❌ Payment methods query error:', error);
    },
    onSuccess: (data) => {
      console.log('✅ Payment methods query success:', data);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - prevent excessive refetching
    retry: 3,
    retryDelay: 1000
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentRequest: PaymentRequest): Promise<PaymentResponse> => {
      // Validate payment request first
      const { isValid, errors } = validatePaymentRequest(paymentRequest);
      if (!isValid) {
        throw new Error(`Invalid payment request: ${errors.join(', ')}`);
      }

      // For guest checkout, we'll use the anon key instead of user's access token
      let authToken: string;
      
      if (paymentRequest.metadata?.checkout_type === 'guest') {
        // For guest checkout, use the anon key
        authToken = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!authToken) {
          throw new Error('Anonymous key not configured');
        }
      } else {
        // For authenticated users, get the session token
        const { data: { session } } = await supabase.auth.getSession();
        authToken = session?.access_token || '';
        
        if (!authToken) {
          throw new Error('User is not authenticated.');
        }
      }

      // Use the local Supabase URL for Edge Functions
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }
      
      // Route to appropriate payment function based on gateway
      let functionUrl = `${supabaseUrl}/functions/v1/create-payment`;
      if (paymentRequest.gateway === 'paypal') {
        // Use PayPal checkout function for direct checkout
        functionUrl = `${supabaseUrl}/functions/v1/create-paypal-checkout`;
      }

      const response = await fetch(
        functionUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(paymentRequest),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create payment');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      if (!data) {
        toast({
          title: 'Payment Error',
          description: 'No response received from payment gateway',
          variant: 'destructive',
        });
        return;
      }
      
      if (data.success) {
        if (variables.gateway === 'stripe' && data.stripeCheckoutUrl) {
          window.location.href = data.stripeCheckoutUrl;
        } else if (variables.gateway === 'paypal' && data.approval_url) {
          // PayPal redirect
          window.location.href = data.approval_url;
        } else if (variables.gateway === 'paypal' && data.approvalUrl) {
          // PayPal redirect (alternative field name)
          window.location.href = data.approvalUrl;
        } else if (variables.gateway === 'paypal' && data.url) {
          // PayPal redirect (new function returns 'url')
          window.location.href = data.url;
        } else if (data.url) {
          // Generic redirect for any gateway returning a URL (PayU, etc.)
          window.location.href = data.url;
        } else if (data.qrCode) {
          toast({
            title: 'QR Code Generated',
            description: 'Please scan the QR code to complete payment.',
          });
          // Here you would typically open a modal with the QR code
        } else if (data.transactionId || data.order_id) {
          toast({
            title: 'Payment Initiated',
            description: `Your payment was successfully created with ID: ${data.transactionId || data.order_id}`,
          });
        } else {
          toast({
            title: 'Payment Processing',
            description: 'Your payment is being processed.',
          });
        }
      } else {
        toast({
          title: 'Payment Failed',
          description: data?.error || 'Unable to create payment',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Get payment method display info with dynamic fees
  const getPaymentMethodDisplay = (gateway: PaymentGateway): PaymentMethodDisplay => {
    const baseDisplay = PAYMENT_METHOD_DISPLAYS[gateway];
    
    // If no display definition exists, create a default one
    if (!baseDisplay) {
      console.warn(`No display definition found for payment gateway: ${gateway}`);
      return {
        name: gateway.toUpperCase(),
        description: `Payment via ${gateway}`,
        icon: 'credit-card',
        is_mobile_only: false,
        requires_qr: false,
        processing_time: 'Processing time varies',
        fees: 'Fees may apply'
      };
    }
    
    // Try to get dynamic fees from database gateways
    if (allGateways) {
      const gatewayConfig = allGateways.find(g => g.code === gateway);
      if (gatewayConfig) {
        return {
          ...baseDisplay,
          fees: formatFeeFromGatewayConfig(gatewayConfig)
        };
      }
    }
    
    // Fallback to hardcoded display
    return baseDisplay;
  };

  // Get all payment method displays for available methods
  const getAvailablePaymentMethods = (): PaymentMethodDisplay[] => {
    if (!availableMethods) return [];
    
    return availableMethods.map(method => getPaymentMethodDisplay(method));
  };

  // Check if payment method requires mobile app
  const isMobileOnlyPayment = (gateway: PaymentGateway): boolean => {
    const display = PAYMENT_METHOD_DISPLAYS[gateway];
    return display ? display.is_mobile_only : false;
  };

  // Check if payment method requires QR code
  const requiresQRCode = (gateway: PaymentGateway): boolean => {
    const display = PAYMENT_METHOD_DISPLAYS[gateway];
    return display ? display.requires_qr : false;
  };

  // Get recommended payment method for user with country-specific priorities (async)
  const getRecommendedPaymentMethod = async (countryCode?: string): Promise<PaymentGateway> => {
    if (!availableMethods || availableMethods.length === 0) {
      return 'bank_transfer';
    }

    try {
      // Use country-specific recommendation if country is provided
      const targetCountry = countryCode || guestShippingCountry || userProfile?.country;
      
      if (targetCountry) {
        // Try to get country-specific default gateway
        const { data: countrySettings } = await supabase
          .from('country_settings')
          .select('default_gateway, available_gateways, gateway_config')
          .eq('code', targetCountry)
          .single();

        if (countrySettings?.default_gateway && availableMethods.includes(countrySettings.default_gateway)) {
          console.log('✅ Using country-specific default gateway:', countrySettings.default_gateway, 'for', targetCountry);
          return countrySettings.default_gateway;
        }

        // If default not available, find first available from country's available list
        if (countrySettings?.available_gateways) {
          for (const gateway of countrySettings.available_gateways) {
            if (availableMethods.includes(gateway)) {
              console.log('✅ Using country-specific available gateway:', gateway, 'for', targetCountry);
              return gateway;
            }
          }
        }
      }

      // Fall back to first available method from database priority
      const gateways = await paymentGatewayService.getGatewaysByPriority();
      for (const gateway of gateways) {
        if (availableMethods.includes(gateway.code)) {
          console.log('✅ Using priority-based gateway:', gateway.code);
          return gateway.code;
        }
      }

      // Final fallback to hardcoded priority with PayPal prioritized
      const fallbackOrder: PaymentGateway[] = [
        'stripe', 'paypal', 'razorpay', 'airwallex', 'payu', 'upi', 'paytm', 
        'esewa', 'khalti', 'fonepay', 'grabpay', 'alipay', 'bank_transfer', 'cod'
      ];

      for (const method of fallbackOrder) {
        if (availableMethods.includes(method)) {
          console.log('✅ Using fallback gateway:', method);
          return method;
        }
      }

      return 'bank_transfer';
    } catch (error) {
      console.error('Error getting recommended payment method:', error);
      return availableMethods[0] || 'bank_transfer';
    }
  };

  // Get recommended payment method (synchronous version for backward compatibility)
  const getRecommendedPaymentMethodSync = (): PaymentGateway => {
    if (!availableMethods || availableMethods.length === 0) {
      return 'bank_transfer';
    }

    // Use cache-based gateway codes for synchronous operation
    const gatewayCodesFromCache = paymentGatewayService.getActiveGatewayCodesSync();
    
    // Find first available method from cached priority order
    for (const code of gatewayCodesFromCache) {
      if (availableMethods.includes(code)) {
        return code;
      }
    }

    // Final fallback to hardcoded priority
    const fallbackOrder: PaymentGateway[] = [
      'stripe', 'paypal', 'razorpay', 'airwallex', 'payu', 'upi', 'paytm', 
      'esewa', 'khalti', 'fonepay', 'grabpay', 'alipay', 'bank_transfer', 'cod'
    ];

    for (const method of fallbackOrder) {
      if (availableMethods.includes(method)) {
        return method;
      }
    }

    return 'bank_transfer';
  };

  // Validate payment request
  const validatePaymentRequest = (request: PaymentRequest): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Null check for request object
    if (!request) {
      errors.push('Payment request is required');
      return { isValid: false, errors };
    }

    if (!request.quoteIds || request.quoteIds.length === 0) {
      errors.push('No quotes selected for payment');
    }

    if (!request.currency) {
      errors.push('Currency is required');
    }

    if (!request.amount || request.amount <= 0 || isNaN(request.amount) || !isFinite(request.amount)) {
      errors.push('Valid amount is required');
    }

    if (!request.gateway) {
      errors.push('Payment method is required');
    }

    if (!request.success_url) {
      errors.push('Success URL is required');
    }

    if (!request.cancel_url) {
      errors.push('Cancel URL is required');
    }

    // Check if gateway is available for user
    if (availableMethods && !availableMethods.includes(request.gateway)) {
      errors.push(`Payment method ${request.gateway} is not available for your location`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Get fallback payment methods
  const getFallbackMethods = (excludeGateway?: PaymentGateway): PaymentGateway[] => {
    if (!availableMethods) return ['bank_transfer', 'cod'];
    
    return availableMethods.filter(method => method !== excludeGateway);
  };

  return {
    // Data
    allGateways,
    availableMethods,
    userProfile,
    
    // Loading states
    gatewaysLoading,
    methodsLoading,
    
    // Mutations
    createPayment: createPaymentMutation.mutate,
    createPaymentAsync: createPaymentMutation.mutateAsync,
    isCreatingPayment: createPaymentMutation.isPending,
    
    // Helper functions
    getPaymentMethodDisplay,
    getAvailablePaymentMethods,
    isMobileOnlyPayment,
    requiresQRCode,
    getRecommendedPaymentMethod,
    getRecommendedPaymentMethodSync,
    validatePaymentRequest,
    getFallbackMethods,
    
    // Payment method displays
    PAYMENT_METHOD_DISPLAYS
  };
}; 