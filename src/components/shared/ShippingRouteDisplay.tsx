import React from 'react';
import { formatShippingRoute } from '@/lib/countryUtils';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useUserRoles } from '@/hooks/useUserRoles';
import { ArrowRight, MapPin, Settings, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ShippingRouteDisplayProps {
  origin: string;
  destination: string;
  showCodes?: boolean;
  variant?: 'compact' | 'detailed';
  className?: string;
  showIcon?: boolean;
  iconType?: 'arrow' | 'mapPin';
  showConfigPrompt?: boolean; // New prop to show configuration prompt instead of dash
}

export function ShippingRouteDisplay({
  origin,
  destination,
  showCodes = false,
  variant = 'compact',
  className,
  showIcon = true,
  iconType = 'arrow',
  showConfigPrompt = false,
}: ShippingRouteDisplayProps) {
  const { data: countries = [] } = useAllCountries();
  const { isAdmin } = useUserRoles();

  // Validate inputs - check for empty strings too
  if (!origin || !destination || origin.trim() === '' || destination.trim() === '') {
    if (showConfigPrompt && isAdmin) {
      // Show configuration prompt for admins
      return (
        <div
          className={cn(
            'flex items-center space-x-2 text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1',
            className,
          )}
        >
          <AlertTriangle className="w-3 h-3" />
          <span className="text-xs font-medium">Route not configured</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (window.location.href = '/admin/shipping-routes')}
            className="h-5 px-2 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-100"
          >
            <Settings className="w-3 h-3 mr-1" />
            Setup
          </Button>
        </div>
      );
    }
    // Default fallback for non-admins or when prompt is disabled
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
            {countries.find((c) => c.code === origin)?.name || origin}
            {showCodes && ` (${origin})`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {showIcon && iconType === 'mapPin' && <MapPin className="h-3 w-3" />}
          <span>Destination:</span>
          <span className="font-medium text-foreground">
            {countries.find((c) => c.code === destination)?.name || destination}
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
      {showIcon && iconType === 'arrow' && <ArrowRight className="h-3 w-3 mx-1 inline" />}
    </span>
  );
}
