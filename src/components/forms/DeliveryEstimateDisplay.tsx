import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Removed unused Button, RadioGroup, RadioGroupItem, Label imports
import {
  Truck,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Package,
  AlertCircle,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryOption, calculateDeliveryDates, DeliveryPhase } from '@/lib/delivery-estimates';
import { format, parseISO, addBusinessDays } from 'date-fns';
// Removed unused Tables import

// Define estimate structure
interface DeliveryEstimate {
  origin_country?: string;
  destination_country: string;
}

// Define quote structure for delivery estimates
interface QuoteForDelivery {
  id: string;
  status: string;
  paid_at?: string;
  created_at: string;
}

// Define timeline structure
interface DeliveryTimeline {
  phases: DeliveryPhase[];
  // Add other timeline properties as needed
}

interface DeliveryEstimateDisplayProps {
  estimate: DeliveryEstimate;
  quote?: QuoteForDelivery;
  className?: string;
}

export const DeliveryEstimateDisplay = ({
  estimate,
  quote,
  className = '',
}: DeliveryEstimateDisplayProps) => {
  const [selectedOption, setSelectedOption] = useState<DeliveryOption | null>(null);
  const [deliveryTimeline, setDeliveryTimeline] = useState<DeliveryTimeline | null>(null);
  const [processingDays, setProcessingDays] = useState(2);
  const [customsClearanceDays, setCustomsClearanceDays] = useState(3);
  const [_loading, _setLoading] = useState(false);

  // Determine the start date based on quote status
  const getStartDate = () => {
    if (!quote) return new Date();

    // If quote is paid, use payment date
    if (quote.status === 'paid' && quote.paid_at) {
      return parseISO(quote.paid_at);
    }

    // Otherwise use quote creation date
    return parseISO(quote.created_at);
  };

  // Determine if this is a payment-phase timeline
  const isPaymentPhase = quote?.status === 'paid' && quote?.paid_at;

  // Fetch shipping route data to get processing and customs clearance days
  useEffect(() => {
    const fetchShippingRoute = async () => {
      try {
        const { data, error } = await supabase
          .from('shipping_routes')
          .select('processing_days, customs_clearance_days, delivery_options')
          .eq('origin_country', estimate.origin_country || 'US')
          .eq('destination_country', estimate.destination_country)
          .eq('is_active', true)
          .single();

        if (data && !error) {
          setProcessingDays(data.processing_days || 2);
          setCustomsClearanceDays(data.customs_clearance_days || 3);
          // Set default delivery option if not already selected
          if (!selectedOption && data.delivery_options && data.delivery_options.length > 0) {
            setSelectedOption(data.delivery_options[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching shipping route:', error);
      }
    };
    fetchShippingRoute();
    // eslint-disable-next-line
  }, [estimate.origin_country, estimate.destination_country]);

  // Calculate delivery timeline when options or days change
  useEffect(() => {
    if (selectedOption) {
      const startDate = getStartDate();
      const timeline = calculateDeliveryDates(
        selectedOption,
        processingDays,
        customsClearanceDays,
        startDate,
      );
      setDeliveryTimeline(timeline);
    }
  }, [
    selectedOption,
    processingDays,
    customsClearanceDays,
    quote?.status,
    quote?.paid_at,
    quote?.created_at,
  ]); // Fixed: removed getStartDate from dependencies to avoid recreation issue

  if (!deliveryTimeline || !selectedOption) {
    return <div>Loading delivery estimate...</div>;
  }

  // Calculate min/max delivery dates for the range
  const shippingMinDays = selectedOption.min_days;
  const shippingMaxDays = selectedOption.max_days;
  const totalMinDays = processingDays + customsClearanceDays + shippingMinDays + 1; // +1 for local delivery
  const totalMaxDays = processingDays + customsClearanceDays + shippingMaxDays + 1;
  const startDate = getStartDate();
  const minDate = addBusinessDays(startDate, totalMinDays);
  const maxDate = addBusinessDays(startDate, totalMaxDays);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Estimated Delivery Timeline
          {isPaymentPhase && (
            <Badge variant="default" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Payment Confirmed
            </Badge>
          )}
        </CardTitle>
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>
              <strong>Timeline based on:</strong>{' '}
              {isPaymentPhase ? 'Payment Date' : 'Quote Request Date'}
            </span>
          </div>
          <div>
            <strong>Start date:</strong> {format(startDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <div>
            <strong>Estimated delivery:</strong> {format(minDate, 'MMM d, yyyy')} –{' '}
            {format(maxDate, 'MMM d, yyyy')}
          </div>
          <div>
            <strong>Latest expected delivery:</strong> {format(maxDate, 'EEEE, MMMM d, yyyy')}
          </div>
          {!isPaymentPhase && quote && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Timeline will be updated after payment</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Once you complete payment, we'll recalculate the delivery timeline from your payment
                date for more accurate estimates.
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deliveryTimeline.phases.map((phase, _idx) => (
            <div
              key={phase.phase}
              className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex-shrink-0">
                {/* Icon for each phase */}
                {phase.icon === 'package' && <Package className="h-6 w-6 text-blue-500" />}
                {phase.icon === 'plane' && <Truck className="h-6 w-6 text-green-500" />}
                {phase.icon === 'building2' && (
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                )}
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

        {/* Additional information for payment phase */}
        {isPaymentPhase && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Payment Confirmed</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Your payment was received on {format(parseISO(quote.paid_at), 'MMM d, yyyy')}. The
              delivery timeline above reflects the actual processing start date.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
