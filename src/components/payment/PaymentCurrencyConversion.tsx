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
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'medium':
        return 'text-orange-800 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-red-800 bg-red-50 border-red-200';
      default:
        return 'text-amber-800 bg-amber-50 border-amber-200';
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
    <div className={`text-xs text-muted-foreground p-2 bg-amber-50 rounded border border-amber-200 ${className}`}>
      <div className="flex items-center justify-between">
        <span>💱 {originalSymbol}{conversion.originalAmount.toFixed(2)} {conversion.originalCurrency}</span>
        <span className="font-mono">
          @ {conversion.exchangeRate.toFixed(4)} = {convertedSymbol}{conversion.convertedAmount.toFixed(2)} {conversion.convertedCurrency}
        </span>
      </div>
    </div>
  );
};