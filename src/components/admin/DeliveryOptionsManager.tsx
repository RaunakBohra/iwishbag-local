// =========================
// IMPORTANT DEVELOPER NOTE
// =========================
//
// The shipping route display in this component MUST use the shared utilities:
//   - getQuoteRouteCountries (from src/lib/route-specific-customs.ts)
//   - formatShippingRoute (from src/lib/countryUtils.ts)
//
// This ensures the origin → destination route is always correct and consistent
// with other admin UI sections (e.g., AdminQuoteDetailPage, AdminQuoteListItem, etc).
//
// If the route display ever breaks or needs to be changed, update the shared logic
// in those utilities and all sections will remain in sync.
// =========================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Truck, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAllCountries } from '@/hooks/useAllCountries';
import { currencyService } from '@/services/CurrencyService';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';

// Delivery option interface
interface DeliveryOption {
  id: string;
  name: string;
  min_days: number;
  max_days: number;
  cost: number;
}

// Shipping route interface
interface ShippingRoute {
  id: number;
  origin_country: string;
  destination_country: string;
  base_shipping_cost: number;
  cost_per_kg: number;
  shipping_per_kg: number;
  cost_percentage: number;
  processing_days: number;
  customs_clearance_days: number;
  weight_unit: string;
  delivery_options?: DeliveryOptionExtended[];
  weight_tiers?: Array<{ min: number; max: number; cost: number }>;
  carriers?: Array<{ name: string; costMultiplier: number; days: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Extended delivery option with additional fields
interface DeliveryOptionExtended {
  id?: string;
  name?: string;
  carrier?: string;
  min_days?: number;
  max_days?: number;
  price?: number;
  cost?: number;
  active?: boolean;
}

// Quote interface
interface Quote {
  id: string;
  origin_country?: string;
  destination_country?: string;
  shipping_route_id?: string;
  shipping_address?: string | ShippingAddress;
  enabled_delivery_options?: string[];
  [key: string]: unknown; // For other properties
}

// Shipping address interface
interface ShippingAddress {
  destination_country?: string;
  country?: string;
  [key: string]: unknown; // For other properties
}

interface DeliveryOptionsManagerProps {
  quote: Quote;
  onOptionsChange?: (enabledOptions: string[]) => void;
  className?: string;
}

export const DeliveryOptionsManager: React.FC<DeliveryOptionsManagerProps> = ({
  quote,
  onOptionsChange,
  className = '',
}) => {
  const { data: allCountries = [] } = useAllCountries();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shippingRoute, setShippingRoute] = useState<ShippingRoute | null>(null);
  const [allDeliveryOptions, setAllDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [enabledOptions, setEnabledOptions] = useState<string[]>([]);
  const [routeOrigin, setRouteOrigin] = useState<string>('');
  const [routeDestination, setRouteDestination] = useState<string>('');

  // Fetch shipping route and delivery options
  useEffect(() => {
    const fetchShippingData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the same logic as CustomsTierDisplay for consistency
        const shippingAddress = quote.shipping_address
          ? typeof quote.shipping_address === 'string'
            ? JSON.parse(quote.shipping_address)
            : quote.shipping_address
          : null;

        const origin = quote.origin_country || 'US';
        let destination =
          shippingAddress?.destination_country ||
          shippingAddress?.country ||
          quote.destination_country;
        if (destination && destination.length > 2) {
          const found = allCountries.find((c) => c.name === destination);
          if (found) destination = found.code;
        }

        let currentRoute = null;
        // 1. Try to fetch by shipping_route_id if present
        if (quote.shipping_route_id) {
          const { data: routeById, error: routeByIdError } = await supabase
            .from('shipping_routes')
            .select('*')
            .eq('id', quote.shipping_route_id)
            .single();
          if (routeByIdError || !routeById) {
            console.error('Error fetching shipping route by id:', routeByIdError);
          } else {
            currentRoute = routeById;
          }
        }

        // 2. Fallback to origin/destination matching using getQuoteRouteCountries
        if (!currentRoute) {
          // First try to find exact match
          const { data: routeData, error: routeError } = await supabase
            .from('shipping_routes')
            .select('*')
            .eq('origin_country', origin)
            .eq('destination_country', destination)
            .eq('is_active', true)
            .maybeSingle();

          if (routeError) {
            console.error('Error fetching shipping route:', routeError);
          } else if (routeData) {
            currentRoute = routeData;
          }

          // If no exact match found, try to find any route for destination country
          if (!currentRoute) {
            const { data: fallbackRoute, error: fallbackError } = await supabase
              .from('shipping_routes')
              .select('*')
              .eq('destination_country', destination)
              .eq('is_active', true)
              .maybeSingle();

            if (fallbackError) {
              console.error('Error fetching fallback shipping route:', fallbackError);
            } else if (fallbackRoute) {
              currentRoute = fallbackRoute;
            }
          }

          // If still no route found, create a default one
          if (!currentRoute) {
            console.warn(`No shipping route found for ${origin} → ${destination}, using default`);
            currentRoute = {
              id: 0,
              origin_country: origin,
              destination_country: destination,
              base_shipping_cost: 25.0,
              cost_per_kg: 5.0,
              shipping_per_kg: 5.0,
              cost_percentage: 2.5,
              processing_days: 2,
              customs_clearance_days: 3,
              weight_unit: 'kg',
              delivery_options: [
                {
                  id: 'default',
                  name: 'Standard Delivery',
                  carrier: 'Standard',
                  min_days: 7,
                  max_days: 14,
                  price: 25.0,
                  active: true,
                },
              ],
              weight_tiers: [
                { min: 0, max: 1, cost: 15.0 },
                { min: 1, max: 3, cost: 25.0 },
                { min: 3, max: 5, cost: 35.0 },
              ],
              carriers: [{ name: 'Standard', costMultiplier: 1.0, days: '7-14' }],
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        }

        setShippingRoute(currentRoute);
        console.log('DEBUG: shippingRoute used in DeliveryOptionsManager:', currentRoute);

        // --- Store route origin and destination ---
        setRouteOrigin(origin);
        setRouteDestination(destination);
        // --- END ---

        // Parse delivery options
        let options: DeliveryOption[] = [];
        if (currentRoute.delivery_options && Array.isArray(currentRoute.delivery_options)) {
          options = currentRoute.delivery_options.map(
            (opt: DeliveryOptionExtended, index: number) => ({
              id: opt.id || `option-${index}`,
              name: opt.name || `Option ${index + 1}`,
              min_days: opt.min_days || 0,
              max_days: opt.max_days || 0,
              cost: opt.cost || opt.price || 0,
            }),
          );
        }

        // Create default option if none exist
        if (options.length === 0) {
          options = [
            {
              id: 'default',
              name: 'Standard Delivery',
              min_days: 7,
              max_days: 14,
              cost: 0,
            },
          ];
        }

        setAllDeliveryOptions(options);

        // Set enabled options from quote or default to all
        const quoteEnabledOptions = quote.enabled_delivery_options || [];
        if (quoteEnabledOptions.length === 0) {
          // If no options are set, enable all by default
          setEnabledOptions(options.map((opt) => opt.id));
        } else {
          setEnabledOptions(quoteEnabledOptions);
        }
      } catch (err) {
        console.error('Error fetching shipping data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load delivery options';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchShippingData();
  }, [
    quote.id,
    quote.shipping_route_id,
    quote.origin_country,
    quote.destination_country,
    quote.enabled_delivery_options,
    quote.shipping_address,
    allCountries,
  ]);

  const handleOptionToggle = async (optionId: string, enabled: boolean) => {
    try {
      const newEnabledOptions = enabled
        ? [...enabledOptions, optionId]
        : enabledOptions.filter((id) => id !== optionId);

      setEnabledOptions(newEnabledOptions);

      // Update the quote in the database
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ enabled_delivery_options: newEnabledOptions })
        .eq('id', quote.id);

      if (updateError) {
        console.error('Error updating quote delivery options:', updateError);
        // Revert the change if update failed
        setEnabledOptions(enabledOptions);
        return;
      }

      // Notify parent component
      onOptionsChange?.(newEnabledOptions);
    } catch (err) {
      console.error('Error toggling delivery option:', err);
      // Revert the change if update failed
      setEnabledOptions(enabledOptions);
    }
  };

  const enableAllOptions = async () => {
    const allOptionIds = allDeliveryOptions.map((opt) => opt.id);
    await handleOptionToggle(allOptionIds[0], true); // This will trigger the update for all
    setEnabledOptions(allOptionIds);
  };

  const disableAllOptions = async () => {
    setEnabledOptions([]);
    // Update the quote in the database
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ enabled_delivery_options: [] })
      .eq('id', quote.id);

    if (updateError) {
      console.error('Error updating quote delivery options:', updateError);
      return;
    }

    onOptionsChange?.([]);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Options Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600">Loading delivery options...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Options Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!shippingRoute || allDeliveryOptions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Options Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No delivery options available for this quote</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Delivery Options Management</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={enableAllOptions}
              disabled={enabledOptions.length === allDeliveryOptions.length}
            >
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disableAllOptions}
              disabled={enabledOptions.length === 0}
            >
              Disable All
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Control which delivery options are available to the customer for this quote.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Information */}
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-teal-700">Shipping Route:</span>
            {routeOrigin && routeDestination && (
              <ShippingRouteDisplay
                origin={routeOrigin}
                destination={routeDestination}
                showCodes={true}
                className="font-medium text-teal-900"
                showIcon={false}
              />
            )}
          </div>
        </div>

        {/* Delivery Options */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Available Options</h4>

          {allDeliveryOptions.map((option) => {
            const isEnabled = enabledOptions.includes(option.id);
            const processingDays = shippingRoute.processing_days || 0;
            const customsDays = shippingRoute.customs_clearance_days || 0;
            const totalMinDays = processingDays + customsDays + option.min_days;
            const totalMaxDays = processingDays + customsDays + option.max_days;

            return (
              <div
                key={option.id}
                className={`p-4 border rounded-lg transition-colors ${
                  isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleOptionToggle(option.id, checked)}
                    />
                    <div>
                      <h5 className="font-medium text-gray-900">{option.name}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isEnabled ? 'default' : 'secondary'}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {option.cost > 0 && (
                          <Badge variant="outline">
                            {(() => {
                              const purchaseCountry = quote.destination_country || 'US';
                              const deliveryCountry = quote.destination_country || 'US';
                              const exchangeRate = quote.exchange_rate;

                              // Format dual currency inline using CurrencyService
                              const formatDualCurrency = (
                                amount: number,
                                originCountry: string,
                                destinationCountry: string,
                                exchangeRate?: number,
                              ) => {
                                const originCurrency =
                                  currencyService.getCurrencyForCountrySync(originCountry);
                                const destinationCurrency =
                                  currencyService.getCurrencyForCountrySync(destinationCountry);

                                const originSymbol =
                                  currencyService.getCurrencySymbol(originCurrency);
                                const originFormatted = `${originSymbol}${amount.toLocaleString()}`;

                                if (exchangeRate && exchangeRate !== 1) {
                                  let convertedAmount = amount * exchangeRate;
                                  const noDecimalCurrencies = [
                                    'NPR',
                                    'INR',
                                    'JPY',
                                    'KRW',
                                    'VND',
                                    'IDR',
                                  ];
                                  if (noDecimalCurrencies.includes(destinationCurrency)) {
                                    convertedAmount = Math.round(convertedAmount);
                                  } else {
                                    convertedAmount = Math.round(convertedAmount * 100) / 100;
                                  }
                                  const destinationSymbol =
                                    currencyService.getCurrencySymbol(destinationCurrency);
                                  const destinationFormatted = `${destinationSymbol}${convertedAmount.toLocaleString()}`;

                                  return {
                                    origin: originFormatted,
                                    destination: destinationFormatted,
                                  };
                                }

                                return {
                                  origin: originFormatted,
                                  destination: originFormatted,
                                };
                              };

                              const dualCurrency = formatDualCurrency(
                                option.cost,
                                purchaseCountry,
                                deliveryCountry,
                                exchangeRate,
                              );
                              const showDualCurrency =
                                purchaseCountry !== deliveryCountry &&
                                exchangeRate &&
                                exchangeRate !== 1;

                              return showDualCurrency ? (
                                <div className="text-xs">
                                  <div>{dualCurrency.origin}</div>
                                  <div className="text-muted-foreground">
                                    {dualCurrency.destination}
                                  </div>
                                </div>
                              ) : (
                                `${option.cost.toFixed(2)}`
                              );
                            })()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Total Days:</span>
                    <span className="font-medium text-gray-900">
                      {totalMinDays}-{totalMaxDays} days
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Shipping:</span>
                    <span className="font-medium text-gray-900">
                      {option.min_days}-{option.max_days} days
                    </span>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-3 h-3" />
                    <span>Processing: {processingDays} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    <span>Customs: {customsDays} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-3 h-3" />
                    <span>
                      Delivery: {option.min_days}-{option.max_days} days
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Enabled Options:</span>
            <span className="font-medium text-gray-900">
              {enabledOptions.length} of {allDeliveryOptions.length}
            </span>
          </div>
          {enabledOptions.length === 0 && (
            <p className="text-xs text-red-600 mt-1">
              ⚠️ No delivery options are enabled. Customers won't be able to select any delivery
              method.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
