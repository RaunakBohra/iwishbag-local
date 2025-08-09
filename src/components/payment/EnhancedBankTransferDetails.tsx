import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import {
  Loader2,
  AlertCircle,
  Copy,
  QrCode,
  Check,
  Smartphone,
  Building2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PaymentProofButton } from './PaymentProofButton';
import { ImprovedPaymentProofUpload } from './ImprovedPaymentProofUpload';
import { countryStandardizationService } from '@/services/CountryStandardizationService';
import { CheckoutService } from '@/services/CheckoutService';

type BankAccountType = Tables<'bank_account_details'>;

interface EnhancedBankTransferDetailsProps {
  orderId: string;
  orderDisplayId: string;
  amount: number;
  currency: string;
}

export const EnhancedBankTransferDetails: React.FC<EnhancedBankTransferDetailsProps> = ({
  orderId,
  orderDisplayId,
  amount,
  currency,
}) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialize country standardization service
  const [isCountryServiceReady, setIsCountryServiceReady] = useState(false);

  useEffect(() => {
    const initializeCountryService = async () => {
      await countryStandardizationService.initialize();
      setIsCountryServiceReady(true);
    };
    initializeCountryService();
  }, []);

  // Get the destination country and payment status from the order
  // First try orders table, then fallback to quotes_v2 for backward compatibility
  const { data: orderDetails } = useQuery({
    queryKey: ['order-destination', orderId],
    queryFn: async () => {
      try {
        // First try to get from orders table
        const checkoutService = CheckoutService.getInstance();
        const order = await checkoutService.getOrderById(orderId);
        
        if (order && order.delivery_address) {
          return {
            destination_country: order.delivery_address.destination_country || order.delivery_address.country,
            payment_status: order.status === 'pending_payment' ? 'pending' : 'paid',
            order_type: 'order'
          };
        }
      } catch (orderError) {
        console.log('Order not found, trying quotes_v2 for backward compatibility');
      }

      // Fallback to quotes_v2 for backward compatibility
      try {
        const { data, error } = await supabase
          .from('quotes_v2')
          .select('destination_country, payment_status')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        return { ...data, order_type: 'quote' };
      } catch (error) {
        throw new Error('Could not find order or quote details');
      }
    },
  });

  const {
    data: bankAccounts,
    isLoading,
    isError,
    error,
  } = useQuery<BankAccountType[], Error>({
    queryKey: ['bankAccounts', currency, orderDetails?.destination_country, isCountryServiceReady],
    queryFn: async () => {
      if (!orderDetails?.destination_country) {
        // No destination country, get fallback accounts only
        let query = supabase.from('bank_account_details').select('*').eq('is_active', true);
        
        // Try to match currency first, but also include accounts with no currency (universal fallbacks)
        if (currency) {
          query = query.or(`currency_code.eq.${currency},currency_code.is.null`);
        }
        
        query = query
          .or('is_fallback.eq.true,destination_country.is.null')
          .order('is_fallback', { ascending: false })
          .order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data as BankAccountType[];
      }

      // Standardize the destination country to country code
      const standardizedCountry = countryStandardizationService.standardizeCountry(orderDetails.destination_country);

      // First, try to get country-specific bank accounts using standardized country code
      const { data: countrySpecific, error: countryError } = await supabase
        .from('bank_account_details')
        .select('*')
        .eq('is_active', true)
        .eq('currency_code', currency)
        .eq('destination_country', standardizedCountry);

      if (!countryError && countrySpecific && countrySpecific.length > 0) {
        return countrySpecific as BankAccountType[];
      }

      // If no country-specific accounts, get fallback accounts with flexible currency matching
      let query = supabase.from('bank_account_details').select('*').eq('is_active', true);

      // Try to match currency first, but also include accounts with no currency (universal fallbacks)
      if (currency) {
        query = query.or(`currency_code.eq.${currency},currency_code.is.null`);
      }

      // Prioritize fallback accounts
      query = query
        .or('is_fallback.eq.true,destination_country.is.null')
        .order('is_fallback', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as BankAccountType[];
    },
    enabled: !!orderDetails && isCountryServiceReady, // Wait for both order details and country service
  });

  // Check if payment proof exists (via messages) - get latest one
  const { data: paymentProofMessages } = useQuery({
    queryKey: ['payment-proof-messages', orderId, orderDetails?.order_type],
    queryFn: async () => {
      try {
        let query = supabase
          .from('messages')
          .select('*')
          .eq('message_type', 'payment_proof')
          .order('created_at', { ascending: false });

        // Query based on whether this is an order or quote
        if (orderDetails?.order_type === 'order') {
          // For orders, look for order_id
          query = query.eq('order_id', orderId);
        } else {
          // For quotes (legacy/fallback), look for quote_id
          query = query.eq('quote_id', orderId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Error fetching payment proof messages:', error.message);
          // Don't throw error - just return empty array to allow component to work
          return [];
        }
        
        return data || []; // Return all, we'll use the first (latest) one
      } catch (error) {
        console.warn('Failed to fetch payment proof messages:', error);
        return []; // Graceful fallback
      }
    },
    enabled: !!orderDetails, // Only run when we have order details
    refetchInterval: 5000, // Refetch every 5 seconds to get updates
  });

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: 'Copied!',
        description: `${fieldName} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy manually',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !bankAccounts || bankAccounts.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {isError
            ? `Error loading bank details: ${error?.message}`
            : `No active bank accounts found for ${currency} currency. Please contact support for bank transfer details.`}
        </AlertDescription>
      </Alert>
    );
  }

  const defaultAccount = bankAccounts[0];
  const hasUPI = !!defaultAccount.upi_id || !!defaultAccount.upi_qr_string;
  const hasQR = !!defaultAccount.payment_qr_url;

  // Don't show payment instructions if payment is already confirmed
  const isPaymentComplete =
    orderDetails?.payment_status === 'paid' || orderDetails?.payment_status === 'overpaid';

  return (
    <div className="space-y-4">
      {!isPaymentComplete && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Payment Instructions</CardTitle>
              <Badge variant="outline" className="font-mono">
                Order: {orderDisplayId}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={hasQR ? 'qr' : hasUPI ? 'upi' : 'bank'} className="w-full">
              <TabsList
                className={`grid w-full ${hasUPI && hasQR ? 'grid-cols-3' : hasUPI || hasQR ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                {hasQR && (
                  <TabsTrigger value="qr" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </TabsTrigger>
                )}
                <TabsTrigger value="bank" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Details
                </TabsTrigger>
                {hasUPI && (
                  <TabsTrigger value="upi" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    UPI
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="bank" className="space-y-4 mt-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Bank Name</p>
                      <p className="font-medium">{defaultAccount.bank_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(defaultAccount.bank_name, 'Bank Name')}
                    >
                      {copiedField === 'Bank Name' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Account Name</p>
                      <p className="font-medium">{defaultAccount.account_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(defaultAccount.account_name, 'Account Name')}
                    >
                      {copiedField === 'Account Name' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Account Number</p>
                      <p className="font-medium font-mono">{defaultAccount.account_number}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(defaultAccount.account_number, 'Account Number')
                      }
                    >
                      {copiedField === 'Account Number' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {defaultAccount.swift_code && (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600">SWIFT Code</p>
                        <p className="font-medium">{defaultAccount.swift_code}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(defaultAccount.swift_code, 'SWIFT Code')}
                      >
                        {copiedField === 'SWIFT Code' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Display additional fields from custom_fields */}
                  {defaultAccount.custom_fields &&
                    typeof defaultAccount.custom_fields === 'object' &&
                    Object.entries(defaultAccount.custom_fields as Record<string, unknown>).map(
                      ([key, value]) => {
                        if (!value) return null;
                        const label =
                          (defaultAccount.field_labels as Record<string, string>)?.[key] || key;
                        return (
                          <div key={key} className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-gray-600">{label}</p>
                              <p className="font-medium">{String(value)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(String(value), label)}
                            >
                              {copiedField === label ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        );
                      },
                    )}

                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Amount to Transfer</p>
                      <p className="font-bold text-lg">
                        {amount.toFixed(2)} {currency}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${amount.toFixed(2)} ${currency}`, 'Amount')}
                    >
                      {copiedField === 'Amount' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Reference/Memo</p>
                      <p className="font-medium font-mono">{orderDisplayId}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(orderDisplayId, 'Reference')}
                    >
                      {copiedField === 'Reference' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {defaultAccount.instructions && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{defaultAccount.instructions}</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {hasUPI && (
                <TabsContent value="upi" className="space-y-4 mt-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600">UPI ID</p>
                        <p className="font-medium font-mono">{defaultAccount.upi_id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(defaultAccount.upi_id!, 'UPI ID')}
                      >
                        {copiedField === 'UPI ID' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="font-bold text-lg">
                          {amount.toFixed(2)} {currency}
                        </p>
                      </div>
                    </div>

                    {defaultAccount.upi_qr_string && (
                      <div className="text-center mt-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(defaultAccount.upi_qr_string)}`}
                          alt="UPI QR Code"
                          className="mx-auto"
                        />
                        <p className="text-sm text-gray-600 mt-2">Scan with any UPI app</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {hasQR && (
                <TabsContent value="qr" className="space-y-4 mt-4">
                  <div className="text-center">
                    <img
                      src={defaultAccount.payment_qr_url!}
                      alt="Payment QR Code"
                      className="mx-auto max-w-xs"
                    />
                    <p className="text-sm text-gray-600 mt-2">Scan to pay</p>
                    <p className="font-bold text-lg mt-2">
                      {amount.toFixed(2)} {currency}
                    </p>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Payment Proof Upload - Only show if payment not complete */}
      {!isPaymentComplete && (
        <div className="space-y-4">
          {paymentProofMessages && paymentProofMessages.length > 0 && (
            <div className="space-y-2">
              {/* Show status based on verification */}
              {paymentProofMessages[0].verification_status === 'pending' && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Payment proof uploaded on{' '}
                    {new Date(paymentProofMessages[0].created_at).toLocaleDateString()}. Our team
                    is reviewing it and will update you soon.
                  </AlertDescription>
                </Alert>
              )}

              {paymentProofMessages[0].verification_status === 'verified' && (
                <Alert className="border-teal-200 bg-teal-50">
                  <Check className="h-4 w-4 text-teal-600" />
                  <AlertDescription className="text-teal-800">
                    Payment proof verified! Waiting for final confirmation.
                  </AlertDescription>
                </Alert>
              )}

              {paymentProofMessages[0].verification_status === 'confirmed' && (
                <Alert className="border-green-200 bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Payment confirmed! Your order is being processed.
                  </AlertDescription>
                </Alert>
              )}

              {paymentProofMessages[0].verification_status === 'rejected' && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Your payment proof could not be verified.
                    {paymentProofMessages[0].admin_notes && (
                      <div className="mt-1 font-medium">
                        Reason: {paymentProofMessages[0].admin_notes}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Show upload component if no proof yet or if rejected */}
          {(!paymentProofMessages || paymentProofMessages.length === 0 || 
            paymentProofMessages[0].verification_status === 'rejected') && (
            <ImprovedPaymentProofUpload
              quoteId={orderId}
              orderId={orderDisplayId}
              recipientId={null}
              orderType={orderDetails?.order_type === 'order' ? 'order' : 'quote'}
            />
          )}
        </div>
      )}

      {/* Payment Complete Message */}
      {isPaymentComplete && (
        <Card className="shadow-sm border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Check className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Payment Confirmed!</p>
                <p className="text-sm text-green-700 mt-1">
                  {orderDetails?.payment_status === 'overpaid'
                    ? 'Your payment has been received. We will contact you regarding the overpayment.'
                    : 'Your payment has been successfully confirmed. We are processing your order.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
