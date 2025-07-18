import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Smartphone,
  Globe,
  Landmark,
  Banknote,
  Shield,
  Clock,
  CheckCircle,
  QrCode,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { PaymentGateway, PaymentMethodDisplay } from '@/types/payment';
import { cn } from '@/lib/utils';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentGateway;
  onMethodChange: (method: PaymentGateway) => void;
  amount: number;
  currency: string;
  showRecommended?: boolean;
  disabled?: boolean;
  // Accept payment methods from parent to avoid duplicate hook calls
  availableMethods?: PaymentGateway[];
  methodsLoading?: boolean;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'credit-card':
      return <CreditCard className="h-4 w-4" />;
    case 'smartphone':
      return <Smartphone className="h-4 w-4" />;
    case 'globe':
      return <Globe className="h-4 w-4" />;
    case 'landmark':
      return <Landmark className="h-4 w-4" />;
    case 'banknote':
      return <Banknote className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

// Add this component for PayU amount display notice
const PayUAmountNotice = () => (
  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <div className="flex items-start gap-2">
      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="text-sm text-amber-800">
        <p className="font-medium">PayU Amount Display Notice</p>
        <p className="mt-1">
          PayU may display the amount in paise (smallest currency unit) instead of rupees. This is
          normal and the payment will process correctly. For example: ₹10,334.33 may appear as
          1033433.
        </p>
      </div>
    </div>
  </div>
);

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  amount,
  currency,
  showRecommended = true,
  disabled = false,
  availableMethods: propAvailableMethods,
  methodsLoading: propMethodsLoading,
}) => {
  // Use payment methods from props if provided, otherwise call hook (for backward compatibility)
  const {
    availableMethods: hookAvailableMethods,
    methodsLoading: hookIsLoading,
    getRecommendedPaymentMethod,
    getPaymentMethodDisplay,
    _PAYMENT_METHOD_DISPLAYS,
  } = usePaymentGateways();

  // Prefer props over hook data (for guest checkout)
  const availableMethods =
    propAvailableMethods !== undefined ? propAvailableMethods : hookAvailableMethods;
  const isLoading = propMethodsLoading !== undefined ? propMethodsLoading : hookIsLoading;

  // Ensure selectedMethod is always a valid available method
  const validSelectedMethod = availableMethods?.includes(selectedMethod)
    ? selectedMethod
    : availableMethods?.[0] || 'bank_transfer';

  // Notify parent if the valid method differs from the prop
  useEffect(() => {
    if (validSelectedMethod !== selectedMethod && availableMethods?.length) {
      onMethodChange(validSelectedMethod);
    }
  }, [validSelectedMethod, selectedMethod, availableMethods, onMethodChange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 p-4 border rounded-lg">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug logging removed to prevent console spam

  const availablePaymentMethods =
    availableMethods?.map((code) => getPaymentMethodDisplay(code)).filter(Boolean) || [];
  const recommendedMethod = getRecommendedPaymentMethod();

  const handleMethodChange = (method: string) => {
    if (disabled) return;

    // Convert string to PaymentGateway type
    const paymentMethod = method as PaymentGateway;

    onMethodChange(paymentMethod);
  };

  const renderPaymentMethod = (method: PaymentMethodDisplay) => {
    const isSelected = validSelectedMethod === method.code;
    const isRecommended = method.code === recommendedMethod;

    return (
      <div
        key={method.code}
        className={cn(
          'border rounded-lg transition-colors',
          isSelected && 'border-primary bg-primary/5',
          disabled && 'opacity-50',
        )}
      >
        <Label
          htmlFor={method.code}
          className={cn(
            'flex items-center space-x-3 p-3 cursor-pointer',
            disabled && 'cursor-not-allowed',
          )}
        >
          <RadioGroupItem value={method.code} id={method.code} disabled={disabled} />

          <div className="flex items-center gap-3">
            {getIcon(method.icon)}
            <div className="flex items-center gap-2">
              <span className="font-medium">{method.name}</span>
              {isRecommended && showRecommended && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              )}
            </div>
          </div>
        </Label>

        {/* Expandable details section */}
        {isSelected && (
          <div className="px-3 pb-3 border-t border-gray-200">
            <div className="pt-3">
              <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {method.is_mobile_only && (
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    <span>Mobile Only</span>
                  </div>
                )}

                {method.requires_qr && (
                  <div className="flex items-center gap-1">
                    <QrCode className="w-3 h-3" />
                    <span>QR Code</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
      </CardHeader>

      <CardContent>
        <RadioGroup
          key={validSelectedMethod}
          value={validSelectedMethod}
          onValueChange={handleMethodChange}
          className="space-y-4"
          disabled={disabled}
        >
          {availablePaymentMethods.map(renderPaymentMethod)}
        </RadioGroup>

        {availablePaymentMethods.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No payment methods available for your location. Please contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* QR Code payment instructions */}
        {getPaymentMethodDisplay(validSelectedMethod).requires_qr && (
          <Alert className="mt-4 border-purple-200 bg-purple-50">
            <QrCode className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <strong>QR Code Payment:</strong> After selecting this method, you'll see a QR code to
              scan with your mobile app. The payment will be processed once you complete the
              transaction in the app.
            </AlertDescription>
          </Alert>
        )}

        {/* PayU Amount Display Notice */}
        {validSelectedMethod === 'payu' && <PayUAmountNotice />}
      </CardContent>
    </Card>
  );
};
