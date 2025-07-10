import React from 'react';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CreditCard, Smartphone, Globe, Landmark, Banknote } from 'lucide-react';

interface PaymentMethodDebugProps {
  country?: string;
  currency?: string;
}

const getGatewayIcon = (code: string) => {
  switch (code) {
    case 'stripe':
    case 'payu':
    case 'razorpay':
      return <CreditCard className="h-4 w-4" />;
    case 'esewa':
    case 'khalti':
    case 'fonepay':
    case 'upi':
    case 'paytm':
    case 'grabpay':
    case 'alipay':
      return <Smartphone className="h-4 w-4" />;
    case 'airwallex':
    case 'paypal':
      return <Globe className="h-4 w-4" />;
    case 'bank_transfer':
      return <Landmark className="h-4 w-4" />;
    case 'cod':
      return <Banknote className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

const getGatewayColor = (code: string) => {
  switch (code) {
    case 'stripe':
      return 'bg-blue-100 text-blue-800';
    case 'payu':
      return 'bg-purple-100 text-purple-800';
    case 'razorpay':
      return 'bg-indigo-100 text-indigo-800';
    case 'paypal':
      return 'bg-blue-100 text-blue-800';
    case 'esewa':
      return 'bg-green-100 text-green-800';
    case 'khalti':
      return 'bg-purple-100 text-purple-800';
    case 'fonepay':
      return 'bg-blue-100 text-blue-800';
    case 'upi':
      return 'bg-green-100 text-green-800';
    case 'paytm':
      return 'bg-cyan-100 text-cyan-800';
    case 'grabpay':
      return 'bg-green-100 text-green-800';
    case 'alipay':
      return 'bg-blue-100 text-blue-800';
    case 'airwallex':
      return 'bg-orange-100 text-orange-800';
    case 'bank_transfer':
      return 'bg-gray-100 text-gray-800';
    case 'cod':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const PaymentMethodDebug: React.FC<PaymentMethodDebugProps> = ({ 
  country, 
  currency 
}) => {
  const { getAvailablePaymentMethods, availableMethods, isLoading } = usePaymentGateways();

  if (!country || !currency) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Payment Methods Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Select a country and currency to see available payment methods.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const availableMethodsList = getAvailablePaymentMethods();

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          Available Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-gray-600">
          <p><strong>Country:</strong> {country}</p>
          <p><strong>Currency:</strong> {currency}</p>
          <p><strong>Available Methods:</strong> {availableMethods?.length || 0}</p>
        </div>
        
        {isLoading ? (
          <div className="text-sm text-gray-500">Loading payment methods...</div>
        ) : availableMethodsList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableMethodsList.map((method) => (
              <Badge 
                key={method.code} 
                variant="secondary" 
                className={`${getGatewayColor(method.code)} flex items-center gap-1`}
              >
                {getGatewayIcon(method.code)}
                {method.name}
              </Badge>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No payment methods available for {country} with {currency}. 
              Only bank transfer and COD will be available.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          <p>💡 This shows what payment options will be available at checkout.</p>
        </div>
      </CardContent>
    </Card>
  );
}; 