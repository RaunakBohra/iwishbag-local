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
    <Alert className={`${getConfidenceColor(conversion.confidence)} ${className}`}>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">💱 Currency Conversion Applied</span>
            <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded-full">
              {getConfidenceText(conversion.confidence)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Your quote total</div>
              <div className="font-mono font-medium">
                {originalSymbol}{conversion.originalAmount.toFixed(2)} {conversion.originalCurrency}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">You'll be charged</div>
              <div className="font-mono font-bold text-lg">
                {convertedSymbol}{conversion.convertedAmount.toFixed(2)} {conversion.convertedCurrency}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t border-current border-opacity-20">
            <div className="flex justify-between items-center">
              <span>Exchange Rate:</span>
              <span className="font-mono font-medium bg-white bg-opacity-50 px-2 py-1 rounded">
                1 {conversion.originalCurrency} = {conversion.exchangeRate.toFixed(4)}{' '}
                {conversion.convertedCurrency}
              </span>
            </div>
            {conversion.warning && (
              <div className="mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {conversion.warning}
              </div>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};