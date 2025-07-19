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
          'border rounded-lg transition-all duration-200',
          isSelected 
            ? 'border-teal-500 bg-teal-50 shadow-sm' 
            : 'border-gray-200 bg-white hover:border-gray-300',
          disabled && 'opacity-50',
        )}
      >
        <Label
          htmlFor={method.code}
          className={cn(
            'flex items-center space-x-3 p-4 cursor-pointer',
            disabled && 'cursor-not-allowed',
          )}
        >
          <RadioGroupItem value={method.code} id={method.code} disabled={disabled} />

          <div className="flex items-center gap-3">
            {getIcon(method.icon)}
            <div className="flex items-center gap-2">
              <span className="font-medium">{method.name}</span>
              {isRecommended && showRecommended && (
                <Badge variant="outline" className="text-xs text-teal-600 border-teal-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              )}
            </div>
          </div>
        </Label>

        {/* Expandable details section */}
        {isSelected && (
          <div className="px-4 pb-3 border-t border-gray-100">
            <div className="pt-3">
              <p className="text-sm text-gray-600 mb-2">{method.description}</p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
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
    <div className="space-y-3">
        <RadioGroup
          key={validSelectedMethod}
          value={validSelectedMethod}
          onValueChange={handleMethodChange}
          className="space-y-2"
          disabled={disabled}
        >
          {availablePaymentMethods.map(renderPaymentMethod)}
        </RadioGroup>

        {availablePaymentMethods.length === 0 && (
          <Alert className="border-gray-200 bg-gray-50">
            <AlertTriangle className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-700">
              No payment methods available for your location. Please contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* QR Code payment instructions */}
        {getPaymentMethodDisplay(validSelectedMethod).requires_qr && (
          <Alert className="mt-4 border-teal-200 bg-teal-50">
            <QrCode className="h-4 w-4 text-teal-600" />
            <AlertDescription className="text-teal-800">
              <strong>QR Code Payment:</strong> After selecting this method, you'll see a QR code to
              scan with your mobile app. The payment will be processed once you complete the
              transaction in the app.
            </AlertDescription>
          </Alert>
        )}

    </div>
  );
};
