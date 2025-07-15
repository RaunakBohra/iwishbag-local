import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Package, Truck, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Quote } from '@/types/quote';
import { ShippingRouteDB } from '@/types/shipping';

interface DeliveryOption {
  id: string;
  name: string;
  min_days: number;
  max_days: number;
  cost: number;
}

interface DeliveryTimelineProps {
  quote: Quote | null;
  onDeliveryOptionChange?: (optionId: string) => void;
  selectedOptionId?: string;
  className?: string;
}

export const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({
  quote,
  onDeliveryOptionChange,
  selectedOptionId,
  className = ''
}) => {
  const { getStatusConfig } = useStatusManagement();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shippingRoute, setShippingRoute] = useState<ShippingRouteDB | null>(null);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<DeliveryOption | null>(null);

  // Fetch shipping route and delivery options
  useEffect(() => {
    if (!quote) return;

    const fetchShippingData = async () => {
      try {
        setLoading(true);
        setError(null);

        let currentRoute = null;
        // 1. Try to fetch by shipping_route_id if present
        if (quote.shipping_route_id) {
          const { data: routeById, error: routeByIdError } = await supabase
            .from('shipping_routes')
            .select('*')
            .eq('id', quote.shipping_route_id)
            .maybeSingle();
          if (routeByIdError || !routeById) {
            console.error('Error fetching shipping route by id:', routeByIdError);
          } else {
            currentRoute = routeById;
          }
        }

        // 2. Fallback to origin/destination matching
        if (!currentRoute) {
          const originCountry = quote.origin_country || 'US';
          const destinationCountry = quote.destination_country;

          console.log('[DeliveryTimeline] Fetching shipping route:', {
            originCountry,
            destinationCountry,
            quoteId: quote.id
          });

          const { data: routeData, error: routeError } = await supabase
            .from('shipping_routes')
            .select('*')
            .eq('origin_country', originCountry)
            .eq('destination_country', destinationCountry)
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
              .eq('destination_country', destinationCountry)
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
            console.warn(`No shipping route found for ${originCountry} → ${destinationCountry}, using default`);
            currentRoute = {
              id: 0,
              origin_country: originCountry,
              destination_country: destinationCountry,
              base_shipping_cost: 25.00,
              cost_per_kg: 5.00,
              shipping_per_kg: 5.00,
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
                  price: 25.00,
                  active: true
                }
              ],
              weight_tiers: [
                { min: 0, max: 1, cost: 15.00 },
                { min: 1, max: 3, cost: 25.00 },
                { min: 3, max: 5, cost: 35.00 },
              ],
              carriers: [
                { name: 'Standard', costMultiplier: 1.0, days: '7-14' }
              ],
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
        }

        setShippingRoute(currentRoute);

        // Parse delivery options
        let options: DeliveryOption[] = [];
        if (currentRoute.delivery_options && Array.isArray(currentRoute.delivery_options)) {
          options = currentRoute.delivery_options.map((opt, index: number) => ({
            id: opt.id || `option-${index}`,
            name: opt.name || `Option ${index + 1}`,
            min_days: opt.min_days || 0,
            max_days: opt.max_days || 0,
            cost: opt.cost || 0
          }));
        }

        // Create default option if none exist
        if (options.length === 0) {
          options = [{
            id: 'default',
            name: 'Standard Delivery',
            min_days: 7,
            max_days: 14,
            cost: 0
          }];
        }

        // Filter options based on quote's enabled_delivery_options
        const quoteEnabledOptions = quote.enabled_delivery_options || [];
        if (quoteEnabledOptions.length > 0) {
          options = options.filter(option => quoteEnabledOptions.includes(option.id));
        }

        setDeliveryOptions(options);
        
        // Set selected option
        const defaultOption = selectedOptionId 
          ? options.find(opt => opt.id === selectedOptionId) 
          : options[0];
        setSelectedOption(defaultOption || options[0]);

      } catch (err) {
        console.error('Error fetching shipping data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load delivery information';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchShippingData();
  }, [quote?.id, quote?.shipping_route_id, quote?.origin_country, quote?.destination_country, selectedOptionId, quote?.enabled_delivery_options]);

  // Early return if no quote data
  if (!quote) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No quote data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate timeline dates
  const calculateTimeline = (option: DeliveryOption) => {
    if (!shippingRoute) return null;

    // DYNAMIC: Check if quote status indicates payment received
    const statusConfig = getStatusConfig(quote.status, quote.status.includes('paid') || quote.status.includes('ordered') ? 'order' : 'quote');
    const isPaymentReceived = statusConfig?.isSuccessful && (quote.status.includes('paid') || quote.status === 'ordered');
    
    const startDate = isPaymentReceived && quote.payment_date 
      ? new Date(quote.payment_date) 
      : new Date(quote.created_at);

    const processingDays = shippingRoute.processing_days || 0;
    const customsDays = shippingRoute.customs_clearance_days || 0;
    const deliveryMinDays = option.min_days || 0;
    const deliveryMaxDays = option.max_days || 0;

    // Calculate total days
    const totalMinDays = processingDays + customsDays + deliveryMinDays;
    const totalMaxDays = processingDays + customsDays + deliveryMaxDays;

    // Calculate dates
    const minDate = new Date(startDate);
    minDate.setDate(minDate.getDate() + totalMinDays);
    
    const maxDate = new Date(startDate);
    maxDate.setDate(maxDate.getDate() + totalMaxDays);

    return {
      minDate,
      maxDate,
      totalMinDays,
      totalMaxDays,
      processingDays,
      customsDays,
      deliveryMinDays,
      deliveryMaxDays
    };
  };

  // Format date range
  const formatDateRange = (minDate: Date, maxDate: Date) => {
    const minMonth = minDate.toLocaleDateString('en-US', { month: 'short' });
    const minDay = minDate.getDate();
    const maxMonth = maxDate.toLocaleDateString('en-US', { month: 'short' });
    const maxDay = maxDate.getDate();
    
    if (minMonth === maxMonth) {
      return `${minMonth} ${minDay}-${maxDay}`;
    } else {
      return `${minMonth} ${minDay} - ${maxMonth} ${maxDay}`;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600">Loading delivery information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedOption || !shippingRoute) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No delivery options available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeline = calculateTimeline(selectedOption);
  if (!timeline) return null;

  return (
    <Card className={`${className} border-0 shadow-none p-0 pt-4 border-t`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Delivery Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Timeline Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900">Estimated Delivery</h4>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedOption.name}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Delivery Window:</span>
              <span className="font-medium text-blue-900">
                {formatDateRange(timeline.minDate, timeline.maxDate)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Total Days:</span>
              <span className="font-medium text-blue-900">
                {timeline.totalMinDays}-{timeline.totalMaxDays} days
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Based on route:</span>
              <ShippingRouteDisplay 
                origin={shippingRoute.origin_country} 
                destination={shippingRoute.destination_country}
                className="font-medium text-blue-900"
                showIcon={false}
              />
            </div>
          </div>
        </div>

        {/* Timeline Breakdown */}
        <div className="space-y-3">
          <h5 className="font-medium text-gray-900">Timeline Breakdown</h5>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Processing</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {timeline.processingDays} days
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Customs Clearance</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {timeline.customsDays} days
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Shipping & Delivery</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {timeline.deliveryMinDays}-{timeline.deliveryMaxDays} days
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Options */}
        {deliveryOptions.length > 1 && (
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">Delivery Options</h5>
            <div className="space-y-2">
              {deliveryOptions.map((option) => {
                const optionTimeline = calculateTimeline(option);
                return (
                  <Button
                    key={option.id}
                    variant={selectedOption.id === option.id ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => {
                      setSelectedOption(option);
                      onDeliveryOptionChange?.(option.id);
                    }}
                  >
                    <span>{option.name}</span>
                    {optionTimeline && (
                      <span className="text-xs">
                        {formatDateRange(optionTimeline.minDate, optionTimeline.maxDate)}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 