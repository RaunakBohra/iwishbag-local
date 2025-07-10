import React from 'react';
import { formatShippingRoute } from '@/lib/countryUtils';
import { useAllCountries } from '@/hooks/useAllCountries';
import { ArrowRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShippingRouteDisplayProps {
  origin: string;
  destination: string;
  showCodes?: boolean;
  variant?: 'compact' | 'detailed';
  className?: string;
  showIcon?: boolean;
  iconType?: 'arrow' | 'mapPin';
}

export function ShippingRouteDisplay({
  origin,
  destination,
  showCodes = false,
  variant = 'compact',
  className,
  showIcon = true,
  iconType = 'arrow',
}: ShippingRouteDisplayProps) {
  const { data: countries = [] } = useAllCountries();

  // Validate inputs - check for empty strings too
  if (!origin || !destination || origin.trim() === '' || destination.trim() === '') {
    return <span className={cn('text-gray-400', className)}>—</span>;
  }

  const routeText = formatShippingRoute(origin, destination, countries, showCodes);

  if (variant === 'detailed') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {showIcon && iconType === 'mapPin' && <MapPin className="h-3 w-3" />}
          <span>Origin:</span>
          <span className="font-medium text-foreground">
            {countries.find(c => c.code === origin)?.name || origin}
            {showCodes && ` (${origin})`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {showIcon && iconType === 'mapPin' && <MapPin className="h-3 w-3" />}
          <span>Destination:</span>
          <span className="font-medium text-foreground">
            {countries.find(c => c.code === destination)?.name || destination}
            {showCodes && ` (${destination})`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {showIcon && iconType === 'mapPin' && <MapPin className="h-3 w-3" />}
      <span>{routeText}</span>
      {showIcon && iconType === 'arrow' && (
        <ArrowRight className="h-3 w-3 mx-1 inline" />
      )}
    </span>
  );
}