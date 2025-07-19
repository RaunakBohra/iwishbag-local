import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Removed unused Button and Separator imports
import {
  Package,
  Truck,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Info,
  CheckCircle,
} from 'lucide-react';
import {
  DeliveryEstimate,
  formatDeliveryEstimate,
  createDeliveryTimeline,
} from '@/lib/delivery-estimates';
import { WeatherAlertBanner } from './WeatherAlertBanner';
import { EnhancedDeliveryTimeline } from './EnhancedDeliveryTimeline';
import { format, parseISO } from 'date-fns';

interface QuoteInfo {
  status: string;
  paid_at?: string;
  created_at: string;
}

interface CustomerDeliveryInfoProps {
  estimate: DeliveryEstimate;
  quote?: QuoteInfo;
  originCountry: string;
  destinationCountry: string;
  orderNumber?: string;
  className?: string;
}

export const CustomerDeliveryInfo: React.FC<CustomerDeliveryInfoProps> = ({
  estimate,
  quote,
  originCountry,
  destinationCountry,
  orderNumber,
  className = '',
}) => {
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

  const startDate = getStartDate();
  const timeline = createDeliveryTimeline(estimate, startDate);
  const formattedEstimate = formatDeliveryEstimate(estimate);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Information
            {orderNumber && (
              <Badge variant="outline" className="ml-auto">
                Order #{orderNumber}
              </Badge>
            )}
            {isPaymentPhase && (
              <Badge variant="default" className="ml-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Payment Confirmed
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeline Phase Indicator */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-center gap-2 text-teal-800">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">
                Timeline based on: {isPaymentPhase ? 'Payment Date' : 'Quote Request Date'}
              </span>
            </div>
            <p className="text-xs text-teal-700 mt-1">
              Start date: {format(startDate, 'EEEE, MMMM d, yyyy')}
            </p>
            {!isPaymentPhase && quote && (
              <p className="text-xs text-teal-700 mt-1">
                Timeline will be updated after payment for more accurate estimates.
              </p>
            )}
          </div>

          {/* Delivery Method Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-teal-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-teal-600" />
                <span className="font-medium text-teal-900">Delivery Method</span>
              </div>
              <p className="text-teal-800">{estimate.option.name}</p>
              <p className="text-sm text-teal-700">via {estimate.option.carrier}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                <span className="font-medium text-teal-900">Estimated Time</span>
              </div>
              <p className="text-teal-800 font-semibold">{formattedEstimate}</p>
              <p className="text-sm text-teal-700">
                From {originCountry} to {destinationCountry}
              </p>
            </div>
          </div>

          {/* Route Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium text-gray-900">Origin</p>
              <p className="text-sm text-gray-600">{originCountry}</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded">
              <Truck className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium text-gray-900">Carrier</p>
              <p className="text-sm text-gray-600">{estimate.option.carrier}</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium text-gray-900">Destination</p>
              <p className="text-sm text-gray-600">{destinationCountry}</p>
            </div>
          </div>

          {/* Expected Delivery Date */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Expected Delivery</span>
            </div>
            <p className="text-green-800 font-semibold">
              {format(estimate.estimated_delivery_max, 'EEEE, MMMM do, yyyy')}
            </p>
            <p className="text-sm text-green-700 mt-1">
              Based on {isPaymentPhase ? 'payment date' : 'quote request date'}:{' '}
              {format(startDate, 'MMM do, yyyy')}
            </p>
          </div>

          {/* Processing Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-900">Order Processing</span>
              </div>
              <p className="text-yellow-800">
                {estimate.processing_days} business day
                {estimate.processing_days > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Payment verification and order preparation
              </p>
            </div>

            <div className="p-3 bg-orange-50 rounded border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-purple-900">Customs Processing</span>
              </div>
              <p className="text-orange-800">
                {estimate.customs_processing_days} business day
                {estimate.customs_processing_days > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-orange-700 mt-1">Customs clearance and inspection</p>
            </div>
          </div>

          {/* Payment Confirmation Message */}
          {isPaymentPhase && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
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

      {/* Weather Alert Banner */}
      <WeatherAlertBanner
        originCountry={originCountry}
        destinationCountry={destinationCountry}
        showDetails={true}
      />

      {/* Enhanced Delivery Timeline */}
      <EnhancedDeliveryTimeline timeline={timeline} currentDate={new Date()} />

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p className="flex items-start gap-2">
              <span className="text-teal-600 font-medium">•</span>
              <span>
                Delivery times are estimates and may vary due to customs processing and local
                conditions.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-teal-600 font-medium">•</span>
              <span>We'll provide tracking information once your order is shipped.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-teal-600 font-medium">•</span>
              <span>Contact us if you have any questions about your delivery.</span>
            </p>
            {!isPaymentPhase && (
              <p className="flex items-start gap-2">
                <span className="text-orange-600 font-medium">•</span>
                <span>
                  Complete payment to get the most accurate delivery timeline based on your payment
                  date.
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
