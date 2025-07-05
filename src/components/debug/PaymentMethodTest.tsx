import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Smartphone, 
  Landmark, 
  Banknote, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// Test payment method displays
const TEST_PAYMENT_METHODS = [
  {
    code: 'payu',
    name: 'PayU',
    description: 'Pay using UPI, cards, net banking, or wallets.',
    icon: 'smartphone',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: '5-15 minutes',
    fees: '2.5%'
  },
  {
    code: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Pay via bank transfer. Details provided after order.',
    icon: 'landmark',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: '1-3 business days',
    fees: 'No additional fees'
  },
  {
    code: 'cod',
    name: 'Cash on Delivery',
    description: 'Pay in cash when your order arrives.',
    icon: 'banknote',
    is_mobile_only: false,
    requires_qr: false,
    processing_time: 'Pay upon delivery',
    fees: 'No additional fees'
  }
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'credit-card':
      return <CreditCard className="h-4 w-4" />;
    case 'smartphone':
      return <Smartphone className="h-4 w-4" />;
    case 'landmark':
      return <Landmark className="h-4 w-4" />;
    case 'banknote':
      return <Banknote className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

export const PaymentMethodTest: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = React.useState('payu');

  const renderPaymentMethod = (method: any) => {
    return (
      <Label
        key={method.code}
        htmlFor={method.code}
        className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer"
      >
        <RadioGroupItem 
          value={method.code} 
          id={method.code} 
          className="mt-1"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getIcon(method.icon)}
            <span className="font-medium">{method.name}</span>
            
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Test
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{method.processing_time}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>{method.fees}</span>
            </div>
          </div>
        </div>
      </Label>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method Test
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <RadioGroup 
          value={selectedMethod} 
          onValueChange={setSelectedMethod}
          className="space-y-4"
        >
          {TEST_PAYMENT_METHODS.map(renderPaymentMethod)}
        </RadioGroup>
        
        {TEST_PAYMENT_METHODS.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No payment methods available for your location. Please contact support.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h4 className="font-medium mb-2">Debug Info:</h4>
          <p>Selected Method: {selectedMethod}</p>
          <p>Available Methods: {TEST_PAYMENT_METHODS.length}</p>
          <p>Methods: {TEST_PAYMENT_METHODS.map(m => m.code).join(', ')}</p>
        </div>
      </CardContent>
    </Card>
  );
}; 