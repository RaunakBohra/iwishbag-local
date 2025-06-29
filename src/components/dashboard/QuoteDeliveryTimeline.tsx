import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Package, Truck, Clock, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { 
  DeliveryOption, 
  calculateDeliveryDates,
  DeliveryEstimate,
  calculateDeliveryEstimate
} from '@/lib/delivery-estimates';
import { format, parseISO, addBusinessDays } from 'date-fns';

interface QuoteDeliveryTimelineProps {
  quote: Tables<'quotes'>;
  className?: string;
}

export const QuoteDeliveryTimeline: React.FC<QuoteDeliveryTimelineProps> = ({
  quote,
  className = ''
}) => {
  const [deliveryTimeline, setDeliveryTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine the start date based on quote status
  const getStartDate = () => {
    // If quote is paid, use payment date
    if (quote.status === 'paid' && quote.paid_at) {
      return parseISO(quote.paid_at);
    }
    
    // Otherwise use quote creation date
    return parseISO(quote.created_at);
  };

  // Determine if this is a payment-phase timeline
  const isPaymentPhase = quote.status === 'paid' && quote.paid_at;

  // Fetch shipping route and delivery options
  useEffect(() => {
    const fetchDeliveryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get shipping route data
        const { data: routeData, error: routeError } = await supabase
          .from('shipping_routes')
          .select('processing_days, customs_clearance_days, delivery_options')
          .eq('origin_country', quote.origin_country || 'US')
          .eq('destination_country', quote.country_code)
          .eq('is_active', true)
          .single();

        if (routeError) {
          console.error('Error fetching shipping route:', routeError);
          setError('Unable to load delivery information');
          return;
        }

        if (!routeData) {
          setError('No shipping route found for this destination');
          return;
        }

        // Get the first available delivery option
        const deliveryOptions = routeData.delivery_options || [];
        if (deliveryOptions.length === 0) {
          setError('No delivery options available');
          return;
        }

        const selectedOption = deliveryOptions[0] as DeliveryOption;
        const startDate = getStartDate();

        // Calculate delivery timeline
        const timeline = calculateDeliveryDates(
          selectedOption,
          routeData.processing_days || 2,
          routeData.customs_clearance_days || 3,
          startDate
        );

        setDeliveryTimeline(timeline);
      } catch (err) {
        console.error('Error loading delivery timeline:', err);
        setError('Failed to load delivery information');
      } finally {
        setLoading(false);
      }
    };

    if (quote && quote.country_code) {
      fetchDeliveryData();
    }
  }, [quote.id, quote.status, quote.paid_at, quote.created_at, quote.country_code, quote.origin_country]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
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
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deliveryTimeline) {
    return null;
  }

  const startDate = getStartDate();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Delivery Timeline
          {isPaymentPhase && (
            <Badge variant="default" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Payment Confirmed
            </Badge>
          )}
        </CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>
              Timeline based on: {isPaymentPhase ? 'Payment Date' : 'Quote Request Date'}
            </span>
          </div>
          <div>
            Start date: {format(startDate, 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deliveryTimeline.phases.map((phase: any, idx: number) => (
            <div key={phase.phase} className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50">
              <div className="flex-shrink-0">
                {/* Icon for each phase */}
                {phase.icon === 'package' && <Package className="h-6 w-6 text-blue-500" />}
                {phase.icon === 'plane' && <Truck className="h-6 w-6 text-green-500" />}
                {phase.icon === 'building2' && <Clock className="h-6 w-6 text-yellow-500" />}
                {phase.icon === 'truck' && <CheckCircle className="h-6 w-6 text-purple-500" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{phase.title}</div>
                <div className="text-xs text-gray-500">{phase.description}</div>
                <div className="text-xs mt-1">
                  <span className="font-semibold">{phase.days} days</span>
                  {phase.estimatedDate && (
                    <span className="ml-2">({format(phase.estimatedDate, 'MMM d, yyyy')})</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline phase indicator */}
        {!isPaymentPhase && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Timeline will be updated after payment</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Once you complete payment, we'll recalculate the delivery timeline from your payment date for more accurate estimates.
            </p>
          </div>
        )}

        {/* Payment confirmation message */}
        {isPaymentPhase && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Payment Confirmed</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Your payment was received on {format(parseISO(quote.paid_at), 'MMM d, yyyy')}. 
              The delivery timeline above reflects the actual processing start date.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 