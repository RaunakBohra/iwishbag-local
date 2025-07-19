import React from 'react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatDualCurrencyNew, getCurrencySymbolFromCountry } from '../../lib/currencyUtils';
import { AlertTriangle, CheckCircle, Info, Calculator } from 'lucide-react';

interface DualCurrencyDisplayProps {
  amount: number | null | undefined;
  originCountry: string;
  destinationCountry: string;
  exchangeRate?: number;
  exchangeRateSource?: 'shipping_route' | 'country_settings' | 'fallback';
  warning?: string;
  showTooltip?: boolean;
  className?: string;
  isTransactional?: boolean; // Whether this is a real transaction or display estimate
  showEstimateIndicator?: boolean; // Whether to show "Estimate" badge for non-transactional displays
}

export function DualCurrencyDisplay({
  amount,
  originCountry,
  destinationCountry,
  exchangeRate,
  exchangeRateSource = 'shipping_route',
  warning,
  showTooltip = true,
  className = '',
  isTransactional = false,
  showEstimateIndicator = true,
}: DualCurrencyDisplayProps) {
  const { origin, destination, short } = formatDualCurrencyNew(
    amount,
    originCountry,
    destinationCountry,
    exchangeRate,
  );

  const isSameCurrency = origin === destination;
  const hasWarning = warning || exchangeRateSource === 'fallback';

  const getStatusIcon = () => {
    if (hasWarning) {
      return <AlertTriangle className="h-3 w-3 text-orange-500" />;
    }
    if (exchangeRateSource === 'shipping_route') {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    return <Info className="h-3 w-3 text-teal-500" />;
  };

  const getStatusBadge = () => {
    const badges = [];

    // Add estimate indicator for non-transactional displays
    if (!isTransactional && showEstimateIndicator && !isSameCurrency) {
      badges.push(
        <Badge
          key="estimate"
          variant="secondary"
          className="text-xs bg-orange-50 text-orange-700 border-orange-200"
        >
          <Calculator className="h-2 w-2 mr-1" />
          Estimate
        </Badge>,
      );
    }

    // Add exchange rate source badge
    if (exchangeRateSource === 'shipping_route') {
      badges.push(
        <Badge key="route" variant="outline" className="text-xs bg-green-50">
          Route Rate
        </Badge>,
      );
    } else if (exchangeRateSource === 'country_settings') {
      badges.push(
        <Badge key="usd" variant="outline" className="text-xs bg-teal-50">
          USD Rate
        </Badge>,
      );
    } else {
      badges.push(
        <Badge key="fallback" variant="destructive" className="text-xs">
          Fallback
        </Badge>,
      );
    }

    return badges;
  };

  const TooltipContent_Component = () => (
    <div className="space-y-2">
      <div className="font-semibold">Currency Conversion Details</div>
      <div className="text-sm space-y-1">
        <div>Origin: {origin}</div>
        <div>Destination: {destination}</div>
        {exchangeRate && exchangeRate !== 1 && (
          <div>
            Rate: 1 {getCurrencySymbolFromCountry(originCountry)} = {exchangeRate}{' '}
            {getCurrencySymbolFromCountry(destinationCountry)}
          </div>
        )}
        <div className="flex items-center gap-1 flex-wrap">Source: {getStatusBadge()}</div>
        {!isTransactional && (
          <div className="text-orange-600 text-xs bg-orange-50 p-2 rounded border">
            💡 This is a display estimate only. Actual transaction amounts may vary based on
            real-time exchange rates.
          </div>
        )}
        {warning && <div className="text-orange-600 text-xs">{warning}</div>}
      </div>
    </div>
  );

  if (isSameCurrency) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className="font-medium">{origin}</span>
        {showTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <div>Same currency - no conversion needed</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-medium">{short}</span>

      {showTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1 flex-wrap">
              {getStatusIcon()}
              {getStatusBadge()}
            </TooltipTrigger>
            <TooltipContent>
              <TooltipContent_Component />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
      )}
    </div>
  );
}

interface SimpleDualCurrencyProps {
  amount: number | null | undefined;
  originCountry: string;
  destinationCountry: string;
  exchangeRate?: number;
  className?: string;
}

export function SimpleDualCurrency({
  amount,
  originCountry,
  destinationCountry,
  exchangeRate,
  className = '',
}: SimpleDualCurrencyProps) {
  const { short } = formatDualCurrencyNew(amount, originCountry, destinationCountry, exchangeRate);

  return <span className={`font-medium ${className}`}>{short}</span>;
}

interface CurrencyInputLabelProps {
  countryCode: string;
  label: string;
  required?: boolean;
  className?: string;
}

export function CurrencyInputLabel({
  countryCode,
  label,
  required = false,
  className = '',
}: CurrencyInputLabelProps) {
  const symbol = getCurrencySymbolFromCountry(countryCode);

  return (
    <label className={`block text-sm font-medium text-gray-700 ${className}`}>
      {label} ({symbol}){required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
