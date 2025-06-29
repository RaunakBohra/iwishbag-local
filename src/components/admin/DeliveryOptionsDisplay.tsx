import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Truck, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryOption } from '@/types/shipping';

interface DeliveryOptionsDisplayProps {
  routeId: number;
}

export const DeliveryOptionsDisplay = ({ routeId }: DeliveryOptionsDisplayProps) => {
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
          .single();

        if (error) {
          throw error;
        }

        if (data?.delivery_options) {
          const options = Array.isArray(data.delivery_options) 
            ? data.delivery_options.filter((opt: any) => opt.active)
            : [];
          setDeliveryOptions(options);
        }
      } catch (err: any) {
        setError(err.message);
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
    return (
      <div className="text-sm text-red-600">
        Error loading delivery options: {error}
      </div>
    );
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
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">{option.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {option.carrier}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{option.min_days}-{option.max_days} days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>${option.price.toFixed(2)}</span>
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