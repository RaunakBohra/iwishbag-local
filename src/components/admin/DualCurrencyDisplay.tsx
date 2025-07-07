import React from 'react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { formatDualCurrencyNew, getCurrencySymbolFromCountry } from '../../lib/currencyUtils';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface DualCurrencyDisplayProps {
  amount: number | null | undefined;
  originCountry: string;
  destinationCountry: string;
  exchangeRate?: number;
  exchangeRateSource?: 'shipping_route' | 'country_settings' | 'fallback';
  warning?: string;
  showTooltip?: boolean;
  className?: string;
}

export function DualCurrencyDisplay({
  amount,
  originCountry,
  destinationCountry,
  exchangeRate,
  exchangeRateSource = 'shipping_route',
  warning,
  showTooltip = true,
  className = ''
}: DualCurrencyDisplayProps) {
  const { origin, destination, short } = formatDualCurrencyNew(
    amount,
    originCountry,
    destinationCountry,
    exchangeRate
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
    return <Info className="h-3 w-3 text-blue-500" />;
  };

  const getStatusBadge = () => {
    if (exchangeRateSource === 'shipping_route') {
      return <Badge variant="outline" className="text-xs bg-green-50">Route Rate</Badge>;
    }
    if (exchangeRateSource === 'country_settings') {
      return <Badge variant="outline" className="text-xs bg-blue-50">USD Rate</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Fallback</Badge>;
  };

  const TooltipContent_Component = () => (
    <div className="space-y-2">
      <div className="font-semibold">Currency Conversion Details</div>
      <div className="text-sm space-y-1">
        <div>Origin: {origin}</div>
        <div>Destination: {destination}</div>
        {exchangeRate && exchangeRate !== 1 && (
          <div>Rate: 1 {getCurrencySymbolFromCountry(originCountry)} = {exchangeRate} {getCurrencySymbolFromCountry(destinationCountry)}</div>
        )}
        <div className="flex items-center gap-1">
          Source: {getStatusBadge()}
        </div>
        {warning && (
          <div className="text-orange-600 text-xs">{warning}</div>
        )}
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
            <TooltipTrigger className="flex items-center gap-1">
              {getStatusIcon()}
              {getStatusBadge()}
            </TooltipTrigger>
            <TooltipContent>
              <TooltipContent_Component />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="flex items-center gap-1">
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
  className = ''
}: SimpleDualCurrencyProps) {
  const { short } = formatDualCurrencyNew(
    amount,
    originCountry,
    destinationCountry,
    exchangeRate
  );

  return (
    <span className={`font-medium ${className}`}>
      {short}
    </span>
  );
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
  className = ''
}: CurrencyInputLabelProps) {
  const symbol = getCurrencySymbolFromCountry(countryCode);
  
  return (
    <label className={`block text-sm font-medium text-gray-700 ${className}`}>
      {label} ({symbol})
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}