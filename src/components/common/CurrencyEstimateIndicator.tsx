import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencyEstimateIndicatorProps {
  isTransactional?: boolean;
  exchangeRateAge?: number; // Age in minutes
  exchangeRateSource?: 'live' | 'cached' | 'fallback';
  showTooltip?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

export function CurrencyEstimateIndicator({
  isTransactional = false,
  exchangeRateAge = 0,
  exchangeRateSource = 'cached',
  showTooltip = true,
  variant = 'default',
  className = '',
}: CurrencyEstimateIndicatorProps) {
  // Don't show indicator for transactional amounts
  if (isTransactional) {
    return null;
  }

  const isStale = exchangeRateAge > 60; // Consider stale after 1 hour
  const isVeryStale = exchangeRateAge > 1440; // Very stale after 24 hours

  const getIndicatorContent = () => {
    if (variant === 'minimal') {
      return <span className="text-xs text-orange-600 font-medium">Est.</span>;
    }

    if (variant === 'compact') {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-orange-50 text-orange-700 border-orange-200"
        >
          <Calculator className="h-2 w-2 mr-1" />
          Est.
        </Badge>
      );
    }

    // Default variant
    return (
      <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
        <Calculator className="h-2 w-2 mr-1" />
        Estimate
      </Badge>
    );
  };

  const getTooltipContent = () => {
    const formatAge = (minutes: number) => {
      if (minutes < 60) return `${minutes} minutes ago`;
      if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
      return `${Math.floor(minutes / 1440)} days ago`;
    };

    return (
      <div className="space-y-2 max-w-xs">
        <div className="font-semibold flex items-center gap-2">
          <Calculator className="h-3 w-3" />
          Currency Estimate
        </div>
        <div className="text-sm space-y-1">
          <p>
            This amount is for display purposes only and represents an estimate based on current
            exchange rates.
          </p>

          <div className="bg-orange-50 p-2 rounded border mt-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-700">
                <strong>Important:</strong> Actual transaction amounts may differ due to:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Real-time exchange rate fluctuations</li>
                  <li>Payment gateway currency conversion fees</li>
                  <li>Bank or provider-specific rates</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-gray-600 space-y-1">
              <div>
                <strong>Rate Source:</strong>{' '}
                {exchangeRateSource === 'live'
                  ? 'Live'
                  : exchangeRateSource === 'cached'
                    ? 'Cached'
                    : 'Fallback'}
              </div>
              {exchangeRateAge > 0 && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    isVeryStale ? 'text-red-600' : isStale ? 'text-orange-600' : 'text-gray-600',
                  )}
                >
                  {(isStale || isVeryStale) && <AlertTriangle className="h-2 w-2" />}
                  <strong>Updated:</strong> {formatAge(exchangeRateAge)}
                  {isVeryStale && ' (Very Stale)'}
                  {isStale && !isVeryStale && ' (Stale)'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const content = getIndicatorContent();

  if (!showTooltip) {
    return <div className={className}>{content}</div>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={className}>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AmountWithEstimateProps {
  amount: number;
  currency: string;
  isTransactional?: boolean;
  exchangeRateAge?: number;
  exchangeRateSource?: 'live' | 'cached' | 'fallback';
  showCurrency?: boolean;
  className?: string;
}

export function AmountWithEstimate({
  amount,
  currency,
  isTransactional = false,
  exchangeRateAge = 0,
  exchangeRateSource = 'cached',
  showCurrency = true,
  className = '',
}: AmountWithEstimateProps) {
  const formatAmount = (value: number, curr: string) => {
    // Simple formatting - you can replace with your currency formatting utility
    const symbol = curr === 'USD' ? '$' : curr === 'INR' ? '₹' : curr === 'EUR' ? '€' : curr;
    return `${symbol}${value.toLocaleString()}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="font-medium">
        {showCurrency ? formatAmount(amount, currency) : amount.toLocaleString()}
      </span>
      <CurrencyEstimateIndicator
        isTransactional={isTransactional}
        exchangeRateAge={exchangeRateAge}
        exchangeRateSource={exchangeRateSource}
        variant="compact"
      />
    </div>
  );
}

// Usage examples in comments:
/*
// For quote displays (estimates)
<CurrencyEstimateIndicator 
  isTransactional={false}
  exchangeRateAge={30}
  exchangeRateSource="cached"
/>

// For payment amounts (no indicator shown)
<CurrencyEstimateIndicator 
  isTransactional={true}
/>

// Compact version for tight spaces
<CurrencyEstimateIndicator 
  variant="compact"
  isTransactional={false}
/>

// With amount formatting
<AmountWithEstimate
  amount={1234.56}
  currency="USD"
  isTransactional={false}
  exchangeRateAge={45}
  exchangeRateSource="cached"
/>
*/
