import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Truck, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryOption } from '@/types/shipping';
import { optimizedCurrencyService } from '@/services/OptimizedCurrencyService';

interface DeliveryOptionsDisplayProps {
  routeId: number;
  purchaseCountry?: string;
  deliveryCountry?: string;
  exchangeRate?: number;
}

export const DeliveryOptionsDisplay = ({
  routeId,
  purchaseCountry = 'US',
  deliveryCountry = 'US',
  exchangeRate,
}: DeliveryOptionsDisplayProps) => {
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeliveryOptions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('shipping_routes')
          .select('delivery_options, processing_days')
          .eq('id', routeId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data?.delivery_options) {
          const options = Array.isArray(data.delivery_options)
            ? data.delivery_options.filter((opt: DeliveryOption) => opt.active)
            : [];
          setDeliveryOptions(options);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (routeId) {
      fetchDeliveryOptions();
    }
  }, [routeId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">Error loading delivery options: {error}</div>;
  }

  if (!deliveryOptions || deliveryOptions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No delivery options configured for this route.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deliveryOptions.map((option) => (
        <Card key={option.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-teal-600" />
                  <span className="font-medium text-sm">{option.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {option.carrier}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {option.min_days}-{option.max_days} days
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {(() => {
                      // Format dual currency inline using CurrencyService
                      const formatDualCurrency = (
                        amount: number,
                        originCountry: string,
                        destinationCountry: string,
                        exchangeRate?: number,
                      ) => {
                        const originCurrency =
                          optimizedCurrencyService.getCurrencyForCountrySync(originCountry);
                        const destinationCurrency =
                          optimizedCurrencyService.getCurrencyForCountrySync(destinationCountry);

                        const originSymbol = optimizedCurrencyService.getCurrencySymbol(originCurrency);
                        const originFormatted = `${originSymbol}${amount.toLocaleString()}`;

                        if (exchangeRate && exchangeRate !== 1) {
                          let convertedAmount = amount * exchangeRate;
                          const noDecimalCurrencies = ['NPR', 'INR', 'JPY', 'KRW', 'VND', 'IDR'];
                          if (noDecimalCurrencies.includes(destinationCurrency)) {
                            convertedAmount = Math.round(convertedAmount);
                          } else {
                            convertedAmount = Math.round(convertedAmount * 100) / 100;
                          }
                          const destinationSymbol =
                            optimizedCurrencyService.getCurrencySymbol(destinationCurrency);
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
                        option.price,
                        purchaseCountry,
                        deliveryCountry,
                        exchangeRate,
                      );
                      const showDualCurrency =
                        purchaseCountry !== deliveryCountry && exchangeRate && exchangeRate !== 1;

                      return showDualCurrency ? (
                        <div className="text-xs">
                          <div>{dualCurrency.origin}</div>
                          <div className="text-muted-foreground">{dualCurrency.destination}</div>
                        </div>
                      ) : (
                        <span>${option.price.toFixed(2)}</span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
