import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, Loader2 } from 'lucide-react';
import { usePaymentCurrencyConversion } from '@/hooks/usePaymentCurrencyConversion';
import { PaymentGateway } from '@/types/payment';
import { currencyService } from '@/services/CurrencyService';

interface PaymentCurrencyConversionProps {
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  originCountry?: string;
  className?: string;
}

export const PaymentCurrencyConversion: React.FC<PaymentCurrencyConversionProps> = ({
  gateway,
  amount,
  currency,
  originCountry = 'US',
  className,
}) => {
  const { conversion, loading, error } = usePaymentCurrencyConversion({
    gateway,
    amount,
    currency,
    originCountry,
    enabled: true,
  });

  if (loading) {
    return (
      <Alert className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          <span className="font-medium">Calculating currency conversion...</span>
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">Currency conversion error:</span> {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!conversion) {
    return null;
  }

  // If no conversion is needed, don't show anything
  if (!conversion.needsConversion) {
    return null;
  }

  const originalSymbol = currencyService.getCurrencySymbol(conversion.originalCurrency);
  const convertedSymbol = currencyService.getCurrencySymbol(conversion.convertedCurrency);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'Current exchange rate';
      case 'medium':
        return 'Estimated exchange rate';
      case 'low':
        return 'Approximate exchange rate';
      default:
        return 'Exchange rate';
    }
  };

  return (
    <Alert className={`${getConfidenceColor(conversion.confidence)} ${className}`}>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <div>
            <span className="font-medium">Currency conversion required:</span>
          </div>
          <div className="text-sm">
            <div className="flex justify-between">
              <span>Display amount:</span>
              <span className="font-mono">
                {originalSymbol}
                {conversion.originalAmount.toFixed(2)} {conversion.originalCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Gateway charge:</span>
              <span className="font-mono font-bold">
                {convertedSymbol}
                {conversion.convertedAmount.toFixed(2)} {conversion.convertedCurrency}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{getConfidenceText(conversion.confidence)}:</span>
              <span>
                1 {conversion.originalCurrency} = {conversion.exchangeRate.toFixed(4)}{' '}
                {conversion.convertedCurrency}
              </span>
            </div>
          </div>
          {conversion.warning && (
            <div className="text-xs text-muted-foreground mt-2">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              {conversion.warning}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};