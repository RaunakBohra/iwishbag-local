import React, { useState, useEffect } from 'react';
import { priceFormatter, PriceResult, DualPriceResult } from '@/lib/PriceFormatter';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { AlertCircle } from 'lucide-react';

export interface PriceProps {
  amount: number | null | undefined;
  originCountry: string;
  destinationCountry?: string;
  userPreferredCurrency?: string;
  exchangeRate?: number;
  showWarnings?: boolean;
  className?: string;
  showSkeleton?: boolean;
}

export interface DualPriceProps {
  amount: number | null | undefined;
  originCountry: string;
  destinationCountry: string;
  exchangeRate?: number;
  showWarnings?: boolean;
  className?: string;
  showSkeleton?: boolean;
}

export interface AdminPriceProps extends DualPriceProps {
  showExchangeRate?: boolean;
}

export const Price: React.FC<PriceProps> = ({
  amount,
  originCountry,
  destinationCountry,
  userPreferredCurrency,
  exchangeRate,
  showWarnings = false,
  className = '',
  showSkeleton = true
}) => {
  const { data: userProfile } = useUserProfile();
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const formatPrice = async () => {
      if (amount === null || amount === undefined) {
        setPriceResult({ formatted: 'N/A', currency: 'USD', amount: 0 });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await priceFormatter.formatPrice(amount, {
          originCountry,
          destinationCountry,
          userPreferredCurrency: userPreferredCurrency || userProfile?.preferred_display_currency,
          exchangeRate,
          showWarnings
        });

        setPriceResult(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format price';
        setError(errorMessage);
        setPriceResult({
          formatted: `$${amount.toLocaleString()}`,
          currency: 'USD',
          amount,
          warning: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    };

    formatPrice();
  }, [amount, originCountry, destinationCountry, userPreferredCurrency, userProfile?.preferred_display_currency, exchangeRate, showWarnings]);

  if (isLoading && showSkeleton) {
    return <Skeleton className={`h-4 w-16 ${className}`} />;
  }

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-red-500 flex items-center gap-1 ${className}`}>
              <AlertCircle size={14} />
              {priceResult?.formatted || 'Error'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const hasWarning = priceResult?.warning && showWarnings;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${hasWarning ? 'text-orange-600' : ''} ${className}`}>
            {hasWarning && <AlertCircle size={14} className="inline mr-1" />}
            {priceResult?.formatted || 'N/A'}
          </span>
        </TooltipTrigger>
        {hasWarning && (
          <TooltipContent>
            <p>{priceResult?.warning}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export const DualPrice: React.FC<DualPriceProps> = ({
  amount,
  originCountry,
  destinationCountry,
  exchangeRate,
  showWarnings = false,
  className = '',
  showSkeleton = true
}) => {
  const [dualPriceResult, setDualPriceResult] = useState<DualPriceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const formatDualPrice = async () => {
      if (amount === null || amount === undefined) {
        setDualPriceResult({
          origin: { formatted: 'N/A', currency: 'USD', amount: 0 },
          destination: { formatted: 'N/A', currency: 'USD', amount: 0 },
          display: 'N/A'
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await priceFormatter.formatDualPrice(amount, {
          originCountry,
          destinationCountry,
          exchangeRate,
          showWarnings
        });

        setDualPriceResult(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format dual price';
        setError(errorMessage);
        setDualPriceResult({
          origin: { formatted: `$${amount.toLocaleString()}`, currency: 'USD', amount },
          destination: { formatted: `$${amount.toLocaleString()}`, currency: 'USD', amount },
          display: `$${amount.toLocaleString()}`,
          warning: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    };

    formatDualPrice();
  }, [amount, originCountry, destinationCountry, exchangeRate, showWarnings]);

  if (isLoading && showSkeleton) {
    return <Skeleton className={`h-4 w-24 ${className}`} />;
  }

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-red-500 flex items-center gap-1 ${className}`}>
              <AlertCircle size={14} />
              {dualPriceResult?.display || 'Error'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const hasWarning = dualPriceResult?.warning && showWarnings;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${hasWarning ? 'text-orange-600' : ''} ${className}`}>
            {hasWarning && <AlertCircle size={14} className="inline mr-1" />}
            {dualPriceResult?.display || 'N/A'}
          </span>
        </TooltipTrigger>
        {hasWarning && (
          <TooltipContent>
            <p>{dualPriceResult?.warning}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export const AdminPrice: React.FC<AdminPriceProps> = ({
  amount,
  originCountry,
  destinationCountry,
  exchangeRate,
  showWarnings = true,
  showExchangeRate = true,
  className = '',
  showSkeleton = true
}) => {
  const [dualPriceResult, setDualPriceResult] = useState<DualPriceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const formatAdminPrice = async () => {
      if (amount === null || amount === undefined) {
        setDualPriceResult({
          origin: { formatted: 'N/A', currency: 'USD', amount: 0 },
          destination: { formatted: 'N/A', currency: 'USD', amount: 0 },
          display: 'N/A'
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await priceFormatter.formatDualPrice(amount, {
          originCountry,
          destinationCountry,
          exchangeRate,
          showWarnings: true // Always show warnings for admins
        });

        setDualPriceResult(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format admin price';
        setError(errorMessage);
        setDualPriceResult({
          origin: { formatted: `$${amount.toLocaleString()}`, currency: 'USD', amount },
          destination: { formatted: `$${amount.toLocaleString()}`, currency: 'USD', amount },
          display: `$${amount.toLocaleString()}`,
          warning: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    };

    formatAdminPrice();
  }, [amount, originCountry, destinationCountry, exchangeRate]);

  if (isLoading && showSkeleton) {
    return <Skeleton className={`h-4 w-32 ${className}`} />;
  }

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-red-500 flex items-center gap-1 ${className}`}>
              <AlertCircle size={14} />
              {dualPriceResult?.display || 'Error'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const hasWarning = dualPriceResult?.warning && showWarnings;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${hasWarning ? 'text-orange-600' : ''} ${className}`}>
            {hasWarning && <AlertCircle size={14} className="inline mr-1" />}
            <span className="font-medium">{dualPriceResult?.display || 'N/A'}</span>
            {showExchangeRate && dualPriceResult?.exchangeRate && dualPriceResult.exchangeRate !== 1 && (
              <span className="text-xs text-gray-500 ml-1">
                (Rate: {dualPriceResult.exchangeRate.toFixed(4)})
              </span>
            )}
          </div>
        </TooltipTrigger>
        {hasWarning && (
          <TooltipContent>
            <p>{dualPriceResult?.warning}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

// Utility components for common use cases
export const QuotePrice: React.FC<{ quote: any; className?: string }> = ({ quote, className }) => {
  if (!quote) return <span className={className}>N/A</span>;

  const originCountry = quote.origin_country || quote.purchase_country || 'US';
  const destinationCountry = quote.destination_country || 
    (quote.shipping_address?.destination_country || quote.shipping_address?.country || 'US');

  return (
    <Price
      amount={quote.final_total}
      originCountry={originCountry}
      destinationCountry={destinationCountry}
      exchangeRate={quote.exchange_rate}
      className={className}
    />
  );
};

export const CartItemPrice: React.FC<{ 
  item: any; 
  quantity?: number; 
  className?: string 
}> = ({ item, quantity = 1, className }) => {
  const amount = item.finalTotal ? item.finalTotal * quantity : item.final_total * quantity;
  
  return (
    <Price
      amount={amount}
      originCountry={item.purchaseCountryCode || item.origin_country || item.country || 'US'}
      destinationCountry={item.destinationCountryCode || item.destination_country || 'US'}
      className={className}
    />
  );
};

export const OrderPrice: React.FC<{ order: any; className?: string }> = ({ order, className }) => {
  if (!order) return <span className={className}>N/A</span>;

  return (
    <Price
      amount={order.final_total}
      originCountry={order.origin_country || order.purchase_country || 'US'}
      destinationCountry={order.destination_country || 'US'}
      exchangeRate={order.exchange_rate}
      className={className}
    />
  );
};