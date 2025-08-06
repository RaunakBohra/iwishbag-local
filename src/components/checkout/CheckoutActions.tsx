import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, CreditCard, AlertTriangle, UserPlus, Mail } from 'lucide-react';
import { isAddressComplete } from '@/lib/addressUtils';

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  destination_country?: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
}

interface ContactFormData {
  email: string;
  phone: string;
}

interface CheckoutActionsProps {
  // Form data
  addressFormData: AddressFormData;
  guestContact: ContactFormData;
  paymentMethod: string;
  isGuestCheckout: boolean;
  
  // State
  isProcessing: boolean;
  hasItems: boolean;
  
  // Actions
  onPlaceOrder: () => void;
  onShowAuthModal: () => void;
  onSendGuestLink: () => void;
  
  // Validation
  canPlaceOrder: boolean;
  validationErrors: string[];
  
  // Optional props
  totalAmount?: number;
  paymentCurrency?: string;
  loading?: boolean;
}

export const CheckoutActions: React.FC<CheckoutActionsProps> = ({
  addressFormData,
  guestContact,
  paymentMethod,
  isGuestCheckout,
  isProcessing,
  hasItems,
  onPlaceOrder,
  onShowAuthModal,
  onSendGuestLink,
  canPlaceOrder,
  validationErrors,
  totalAmount,
  paymentCurrency,
  loading = false
}) => {
  const isAddressValid = isAddressComplete(addressFormData);
  const isContactValid = isGuestCheckout ? guestContact.email.includes('@') : true;
  const isPaymentMethodSelected = paymentMethod !== '';

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Order Total Summary */}
          {totalAmount && paymentCurrency && (
            <div className="flex justify-between items-center text-lg font-semibold border-b pb-4">
              <span>Total:</span>
              <span className="flex items-center space-x-2">
                <Badge variant="secondary">{paymentCurrency}</Badge>
                <span>{totalAmount.toLocaleString()}</span>
              </span>
            </div>
          )}

          {/* Validation Status */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${hasItems ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={hasItems ? 'text-gray-900' : 'text-red-600'}>
                Cart items ({hasItems ? 'Ready' : 'Empty'})
              </span>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isAddressValid ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={isAddressValid ? 'text-gray-900' : 'text-red-600'}>
                Shipping address ({isAddressValid ? 'Complete' : 'Required'})
              </span>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isContactValid ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={isContactValid ? 'text-gray-900' : 'text-red-600'}>
                Contact info ({isContactValid ? 'Valid' : 'Required'})
              </span>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isPaymentMethodSelected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={isPaymentMethodSelected ? 'text-gray-900' : 'text-red-600'}>
                Payment method ({isPaymentMethodSelected ? 'Selected' : 'Required'})
              </span>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Please fix the following:</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Place Order Button */}
          <Button
            onClick={onPlaceOrder}
            disabled={!canPlaceOrder || isProcessing}
            size="lg"
            className="w-full"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Place Order</span>
              </div>
            )}
          </Button>

          {/* Guest Options */}
          {isGuestCheckout && (
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm text-gray-600 text-center">
                Want to save your order and track it easily?
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowAuthModal}
                  disabled={isProcessing}
                >
                  <UserPlus className="h-3 w-3 mr-2" />
                  Create Account
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSendGuestLink}
                  disabled={isProcessing || !guestContact.email}
                >
                  <Mail className="h-3 w-3 mr-2" />
                  Email Link
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Create an account to track orders, save addresses, and get updates
              </p>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center space-x-2 text-xs text-gray-600 p-3 bg-gray-50 rounded-lg">
            <Shield className="h-3 w-3 text-green-600" />
            <span>
              Secure checkout • SSL encrypted • Your data is protected
            </span>
          </div>

          {/* Payment Method Info */}
          {paymentMethod && (
            <div className="text-xs text-gray-600 text-center">
              Paying with {paymentMethod.replace('_', ' ').toUpperCase()}
              {paymentMethod === 'stripe' && ' (Card payment)'}
              {paymentMethod === 'bank_transfer' && ' (Manual transfer)'}
              {paymentMethod === 'wire_transfer' && ' (International wire)'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};