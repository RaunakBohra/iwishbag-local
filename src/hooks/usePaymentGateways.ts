import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  PaymentGateway, 
  PaymentGatewayConfig, 
  PaymentRequest, 
  PaymentResponse,
  CountryPaymentMethods,
  PaymentMethodDisplay 
} from '@/types/payment';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  }
};

export const usePaymentGateways = () => {
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
        .select('preferred_display_currency, country')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Get available payment methods for current user
  const { data: availableMethods, isLoading: methodsLoading } = useQuery({
    queryKey: ['available-payment-methods', userProfile?.country, userProfile?.preferred_display_currency],
    queryFn: async (): Promise<PaymentGateway[]> => {
      if (!userProfile?.country || !userProfile?.preferred_display_currency) {
        return ['bank_transfer', 'cod'];
      }

      console.log('--- Payment Gateway Debug ---');
      console.log('User Profile for Filtering:', { 
        country: userProfile.country, 
        currency: userProfile.preferred_display_currency 
      });

      const { data: gateways } = await supabase
        .from('payment_gateways')
        .select('code, supported_countries, supported_currencies, is_active')
        .eq('is_active', true);

      if (!gateways) {
        console.log('No active gateways found in database.');
        console.log('--- End Payment Gateway Debug ---');
        return ['bank_transfer', 'cod'];
      }
      
      console.log('Active Gateways Fetched from DB:', gateways);

      const filteredGateways = gateways
        .filter(gateway => {
          const countryMatch = gateway.supported_countries.includes(userProfile.country);
          const currencyMatch = gateway.supported_currencies.includes(userProfile.preferred_display_currency);
          
          console.log(`\nChecking gateway: ${gateway.code}`);
          console.log(`  - User Country: '${userProfile.country}' | Supported: [${gateway.supported_countries}] | Match: ${countryMatch}`);
          console.log(`  - User Currency: '${userProfile.preferred_display_currency}' | Supported: [${gateway.supported_currencies}] | Match: ${currencyMatch}`);
          
          return countryMatch && currencyMatch;
        });

      const finalMethodCodes = filteredGateways
        .map(gateway => gateway.code as PaymentGateway)
        .concat(['bank_transfer', 'cod']);
        
      console.log('\nFinal list of available method codes:', finalMethodCodes);
      console.log('--- End Payment Gateway Debug ---');

      return finalMethodCodes;
    },
    enabled: !!userProfile
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentRequest: PaymentRequest): Promise<PaymentResponse> => {
      // Correctly get the user's session and access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('User is not authenticated.');
      }

      // Use the official Supabase URL from environment variables.
      // This works for both local development (e.g., http://127.0.0.1:54321) and production.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/create-payment`;

      const response = await fetch(
        functionUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`, // Use the correct token here
          },
          body: JSON.stringify(paymentRequest),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        if (data.url) {
          // Redirect to payment gateway
          window.location.href = data.url;
        } else if (data.qr_code) {
          // Handle QR code payment (show QR modal)
          toast({
            title: 'QR Code Generated',
            description: 'Please scan the QR code with your mobile app to complete payment.',
          });
          // You can emit an event or use a callback to show QR modal
        }
      } else {
        toast({
          title: 'Payment Failed',
          description: data.error || 'Unable to create payment',
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

  // Get payment method display info
  const getPaymentMethodDisplay = (gateway: PaymentGateway): PaymentMethodDisplay => {
    return PAYMENT_METHOD_DISPLAYS[gateway];
  };

  // Get all payment method displays for available methods
  const getAvailablePaymentMethods = (): PaymentMethodDisplay[] => {
    if (!availableMethods) return [];
    
    return availableMethods.map(method => getPaymentMethodDisplay(method));
  };

  // Check if payment method requires mobile app
  const isMobileOnlyPayment = (gateway: PaymentGateway): boolean => {
    return PAYMENT_METHOD_DISPLAYS[gateway].is_mobile_only;
  };

  // Check if payment method requires QR code
  const requiresQRCode = (gateway: PaymentGateway): boolean => {
    return PAYMENT_METHOD_DISPLAYS[gateway].requires_qr;
  };

  // Get recommended payment method for user
  const getRecommendedPaymentMethod = (): PaymentGateway => {
    if (!availableMethods || availableMethods.length === 0) {
      return 'bank_transfer';
    }

    // Priority order: Stripe > Airwallex > PayU > eSewa > Khalti > Fonepay > Bank Transfer > COD
    const priorityOrder: PaymentGateway[] = [
      'stripe', 'airwallex', 'payu', 'esewa', 'khalti', 'fonepay', 'bank_transfer', 'cod'
    ];

    for (const method of priorityOrder) {
      if (availableMethods.includes(method)) {
        return method;
      }
    }

    return 'bank_transfer';
  };

  // Validate payment request
  const validatePaymentRequest = (request: PaymentRequest): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!request.quoteIds || request.quoteIds.length === 0) {
      errors.push('No quotes selected for payment');
    }

    if (!request.currency) {
      errors.push('Currency is required');
    }

    if (!request.amount || request.amount <= 0) {
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
    validatePaymentRequest,
    getFallbackMethods,
    
    // Payment method displays
    PAYMENT_METHOD_DISPLAYS
  };
}; 