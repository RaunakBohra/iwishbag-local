import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, AlertCircle } from 'lucide-react';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { PaymentGateway } from '@/types/payment';

interface PaymentMethodSectionProps {
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentCurrency: string;
  shippingCountry: string;
  availableGateways: PaymentGateway[];
  isProcessing: boolean;
  loading?: boolean;
}

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  paymentMethod,
  setPaymentMethod,
  paymentCurrency,
  shippingCountry,
  availableGateways,
  isProcessing,
  loading = false
}) => {
  const selectedGateway = availableGateways?.find(g => g.id === paymentMethod);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Method</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{paymentCurrency}</Badge>
            <Badge variant="secondary">{shippingCountry}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(availableGateways?.length || 0) === 0 ? (
          <div className="flex items-center space-x-2 text-orange-600 p-4 bg-orange-50 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">No payment methods available</p>
              <p className="text-sm">
                Payment methods are being loaded or none are configured for your region.
              </p>
            </div>
          </div>
        ) : (
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            currency={paymentCurrency}
            country={shippingCountry}
            availableGateways={availableGateways}
            disabled={isProcessing}
          />
        )}

        {/* Selected Payment Method Details */}
        {selectedGateway && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{selectedGateway.name}</h4>
                <p className="text-sm text-gray-600">
                  {selectedGateway.description || `Pay securely with ${selectedGateway.name}`}
                </p>
              </div>
              {selectedGateway.logo && (
                <img 
                  src={selectedGateway.logo} 
                  alt={selectedGateway.name}
                  className="h-8 w-auto"
                />
              )}
            </div>

            {/* Payment Method Features */}
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedGateway.features?.map((feature) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>

            {/* Processing Time */}
            {selectedGateway.processing_time && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Processing time:</span> {selectedGateway.processing_time}
              </div>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 p-3 bg-green-50 rounded-lg">
          <Shield className="h-4 w-4 text-green-600" />
          <span>
            Your payment information is encrypted and secure. We never store your card details.
          </span>
        </div>

        {/* Payment Method Specific Instructions */}
        {paymentMethod === 'bank_transfer' && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-900">Bank Transfer Instructions:</p>
            <p className="text-blue-800 mt-1">
              After placing your order, you'll receive bank details via email. 
              Please complete the transfer within 24 hours to secure your order.
            </p>
          </div>
        )}

        {paymentMethod === 'wire_transfer' && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-900">Wire Transfer Instructions:</p>
            <p className="text-blue-800 mt-1">
              International wire transfer details will be provided after order confirmation. 
              Processing may take 3-5 business days.
            </p>
          </div>
        )}

        {(paymentMethod === 'khalti' || paymentMethod === 'esewa' || paymentMethod === 'fonepay') && (
          <div className="p-3 bg-purple-50 rounded-lg text-sm">
            <p className="font-medium text-purple-900">Mobile Payment Instructions:</p>
            <p className="text-purple-800 mt-1">
              You'll be redirected to {selectedGateway?.name} to complete your payment. 
              Please have your mobile wallet ready.
            </p>
          </div>
        )}

        {paymentMethod === 'payu' && (
          <div className="p-3 bg-orange-50 rounded-lg text-sm">
            <p className="font-medium text-orange-900">PayU Payment:</p>
            <p className="text-orange-800 mt-1">
              You'll be redirected to PayU's secure checkout page. 
              Supports cards, net banking, and UPI.
            </p>
          </div>
        )}

        {paymentMethod === 'airwallex' && (
          <div className="p-3 bg-indigo-50 rounded-lg text-sm">
            <p className="font-medium text-indigo-900">Airwallex Payment:</p>
            <p className="text-indigo-800 mt-1">
              International payment processing with competitive exchange rates. 
              Supports major credit and debit cards worldwide.
            </p>
          </div>
        )}

        {paymentMethod === 'stripe' && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium text-gray-900">Stripe Payment:</p>
            <p className="text-gray-800 mt-1">
              Complete your payment directly on this page. 
              Supports all major credit and debit cards.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};