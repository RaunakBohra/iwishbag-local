/**
 * usePaymentLinkGenerator Hook
 * Manages payment link generation state and logic
 * Extracted from EnhancedPaymentLinkGenerator for better reusability
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomField {
  name: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'dropdown';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface QuoteData {
  id?: string;
  display_id?: string;
  order_display_id?: string;
  product_name?: string;
  final_total_origincurrency?: number;
  amount_paid?: number;
  payment_status?: string;
  shipping_address?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  user?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  customer_name?: string;
  customer_phone?: string;
  email?: string;
  approved_at?: string;
  priority?: 'high' | 'urgent' | 'normal';
  destination_country?: string;
  origin_country?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface PaymentFormData {
  name: string;
  email: string;
  phone: string;
  description: string;
  expiryDays: number;
  gateway: 'payu' | 'stripe' | 'razorpay';
  template: 'default' | 'minimal' | 'branded';
  partialPaymentAllowed: boolean;
  apiMethod: 'rest' | 'websdk' | 'mobile';
}

interface PaymentLinkResponse {
  success?: boolean;
  paymentUrl?: string;
  shortUrl?: string;
  amountInINR?: number;
  originalCurrency?: string;
  originalAmount?: number;
  expiresAt?: string;
  linkCode?: string;
  exchangeRate?: number;
  apiVersion?: string;
  fallbackUsed?: boolean;
  features?: {
    customFields?: boolean;
    partialPayment?: boolean;
  };
  error?: string;
}

interface UsePaymentLinkGeneratorProps {
  quote?: QuoteData;
  customerInfo?: CustomerInfo;
  amount: number;
  quoteId: string;
  open: boolean;
}

export const usePaymentLinkGenerator = ({
  quote,
  customerInfo,
  amount,
  quoteId,
  open,
}: UsePaymentLinkGeneratorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<PaymentLinkResponse | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Form data state
  const [formData, setFormData] = useState<PaymentFormData>({
    name: '',
    email: '',
    phone: '',
    description: '',
    expiryDays: 7,
    gateway: 'payu',
    template: 'default',
    partialPaymentAllowed: false,
    apiMethod: 'rest',
  });

  // Helper function to get customer info with fallbacks
  const getCustomerInfo = () => {
    const shipping = quote?.shipping_address;
    const user = quote?.user;
    const profiles = quote?.profiles; // From the profile join
    
    const extractedInfo = {
      name: shipping?.fullName || 
            shipping?.name || 
            user?.full_name || 
            profiles?.full_name || 
            quote?.customer_name ||
            customerInfo?.name || 
            '',
      email: shipping?.email || 
             user?.email || 
             profiles?.email || 
             quote?.email ||
             customerInfo?.email || 
             '',
      phone: shipping?.phone || 
             user?.phone || 
             profiles?.phone || 
             quote?.customer_phone ||
             customerInfo?.phone || 
             '',
    };

    return extractedInfo;
  };

  // Helper function to generate smart description
  const generateDescription = () => {
    if (!quote) return `Payment for amount $${amount}`;

    const orderId = quote.order_display_id || quote.display_id || quoteId;
    const productName = quote.product_name;
    const dueAmount = quote.final_total_origincurrency! - (quote.amount_paid || 0);
    const isPartialPayment = dueAmount < quote.final_total_origincurrency! && dueAmount > 0;

    let description = `Payment for ${orderId}`;
    
    if (productName) {
      description += ` - ${productName}`;
    }
    
    if (isPartialPayment) {
      description += ` (Due Amount: $${dueAmount.toFixed(2)})`;
    }

    return description;
  };

  // Helper function to determine smart expiry
  const getSmartExpiryDays = () => {
    if (!quote) return 7;

    const approvedAt = quote.approved_at;
    if (approvedAt) {
      const daysSinceApproval = Math.floor(
        (Date.now() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceApproval > 7) return 3; // Urgent for old approvals
      if (daysSinceApproval > 3) return 5; // Medium urgency
    }

    if (quote.priority === 'urgent') return 2;
    if (quote.priority === 'high') return 5;
    
    return 7; // Default
  };

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && !createdLink) {
      console.log('🎯 [usePaymentLinkGenerator] Initializing form data');
      
      const customer = getCustomerInfo();

      console.log('🎯 [usePaymentLinkGenerator] Final customer info extracted:');
      console.log('  - Name:', customer.name);
      console.log('  - Email:', customer.email);
      console.log('  - Phone:', customer.phone);

      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        description: generateDescription(),
        expiryDays: getSmartExpiryDays(),
        gateway: 'payu',
        template: 'default',
        partialPaymentAllowed: false,
        apiMethod: 'rest',
      });

      console.log('✅ [usePaymentLinkGenerator] Form data updated');
    }
  }, [open, quote, customerInfo]);

  // Update form data
  const updateFormData = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate payment link
  const generatePaymentLink = async () => {
    setLoading(true);
    try {
      console.log('🔗 [usePaymentLinkGenerator] Starting payment link generation');
      
      const requestBody = {
        quoteId,
        amount,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        description: formData.description,
        expiryDays: formData.expiryDays,
        gateway: formData.gateway,
        template: formData.template,
        partialPaymentAllowed: formData.partialPaymentAllowed,
        customFields: customFields.length > 0 ? customFields : undefined,
      };

      console.log('📋 [usePaymentLinkGenerator] Request body:', requestBody);

      // Determine which edge function to call based on gateway
      const functionName = formData.gateway === 'payu' 
        ? 'create-payu-payment-link'
        : formData.gateway === 'stripe'
        ? 'create-stripe-payment-link'
        : 'create-payment-link';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody,
      });

      console.log('📡 [usePaymentLinkGenerator] Response received:', { data, error });

      if (error) {
        console.error('❌ [usePaymentLinkGenerator] Edge function error:', error);
        throw new Error(`API Error: ${error.message}`);
      }

      if (!data.success) {
        console.error('❌ [usePaymentLinkGenerator] Service error:', data.error);
        throw new Error(data.error || 'Failed to create payment link');
      }

      console.log('✅ [usePaymentLinkGenerator] Payment link created successfully');
      setCreatedLink(data);

      toast({
        title: 'Payment link created!',
        description: 'The payment link has been generated successfully.',
      });

    } catch (error: any) {
      console.error('❌ [usePaymentLinkGenerator] Generation failed:', error);
      
      const errorResponse: PaymentLinkResponse = {
        success: false,
        error: error.message || 'Failed to generate payment link. Please try again.',
      };
      
      setCreatedLink(errorResponse);
      
      toast({
        title: 'Failed to create payment link',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    const customer = getCustomerInfo();
    
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      description: generateDescription(),
      expiryDays: getSmartExpiryDays(),
      gateway: 'payu',
      template: 'default',
      partialPaymentAllowed: false,
      apiMethod: 'rest',
    });
    
    setCustomFields([]);
    setCreatedLink(null);
    
    console.log('🔄 [usePaymentLinkGenerator] Form reset completed');
  };

  return {
    formData,
    updateFormData,
    customFields,
    setCustomFields,
    createdLink,
    loading,
    generatePaymentLink,
    resetForm,
    getCustomerInfo,
  };
};