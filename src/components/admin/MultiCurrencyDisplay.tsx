import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CurrencyDisplay {
  amount: string;
  currency: string;
  label: string;
  isPrimary?: boolean;
}

interface MultiCurrencyDisplayProps {
  currencies: CurrencyDisplay[];
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  compact?: boolean;
  cleanFormat?: boolean; // New prop for cleaner formatting
}

export const MultiCurrencyDisplay = ({
  currencies,
  orientation = 'vertical',
  showLabels = true,
  compact = false,
  cleanFormat = false,
}: MultiCurrencyDisplayProps) => {
  if (!currencies || currencies.length === 0) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  if (currencies.length === 1) {
    return (
      <span className={currencies[0].isPrimary ? 'font-semibold' : ''}>{currencies[0].amount}</span>
    );
  }

  const primaryCurrency = currencies.find((c) => c.isPrimary) || currencies[0];
  const otherCurrencies = currencies.filter((c) => !c.isPrimary);

  // Clean format: show currencies separated by " / "
  if (cleanFormat && currencies.length <= 2) {
    return (
      <div className="flex items-center gap-1">
        {currencies.map((currency, index) => (
          <React.Fragment key={index}>
            <span className={currency.isPrimary ? 'font-semibold' : ''}>{currency.amount}</span>
            {index < currencies.length - 1 && <span className="text-muted-foreground">/</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (compact && otherCurrencies.length > 0) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{primaryCurrency.amount}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help text-xs">
                +{otherCurrencies.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {otherCurrencies.map((currency, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{currency.amount}</span>
                    {showLabels && (
                      <span className="text-muted-foreground ml-1">({currency.currency})</span>
                    )}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  const containerClass =
    orientation === 'horizontal' ? 'flex items-center gap-2 flex-wrap' : 'space-y-1';

  return (
    <div className={containerClass}>
      {currencies.map((currency, index) => (
        <div
          key={index}
          className={`flex items-center gap-1 ${orientation === 'horizontal' ? '' : 'justify-between'}`}
        >
          <span className={currency.isPrimary ? 'font-semibold' : ''}>{currency.amount}</span>
          {showLabels && !cleanFormat && (
            <Badge variant={currency.isPrimary ? 'default' : 'outline'} className="text-xs">
              {currency.label}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
};
