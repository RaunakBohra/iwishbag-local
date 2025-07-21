import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Package, Calendar, Truck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { trackingService } from '@/services/TrackingService';

interface TrackingInfoProps {
  order: Tables<'quotes'>;
}

const getTrackingLink = (carrier: string | null, trackingNumber: string | null) => {
  if (!carrier || !trackingNumber) return null;
  const carrierLower = carrier.toLowerCase();
  if (carrierLower.includes('dhl')) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  }
  if (carrierLower.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  }
  if (carrierLower.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  }
  return `https://www.google.com/search?q=${carrier} ${trackingNumber} tracking`;
};

export const TrackingInfo = ({ order }: TrackingInfoProps) => {
  const { toast } = useToast();
  const trackingLink = getTrackingLink(order.shipping_carrier, order.tracking_number);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard!',
      description: text,
    });
  };

  // Get iwishBag tracking info
  const iwishTrackingId = order.iwish_tracking_id;
  const trackingStatus = order.tracking_status;
  const estimatedDelivery = order.estimated_delivery_date;

  // Show tracking info if we have iwishBag tracking ID or traditional tracking
  const hasTracking = iwishTrackingId || (order.shipping_carrier && order.tracking_number);
  const showTrackingInfo =
    ['pending', 'preparing', 'shipped', 'delivered', 'exception'].includes(order.status) ||
    order.status === 'completed';

  if (!showTrackingInfo) {
    return null;
  }

  if (!hasTracking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your order is being processed. Tracking information will appear here once your order
            ships.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Truck className="w-5 h-5 mr-2" />
          Tracking Information
        </CardTitle>
        <CardDescription>
          {trackingStatus === 'delivered'
            ? 'Your order has been delivered successfully!'
            : trackingStatus === 'shipped'
              ? 'Your order is on its way!'
              : 'Track your order status below.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* iwishBag Tracking ID */}
        {iwishTrackingId && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">iwishBag Tracking ID</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-blue-600 font-mono">{iwishTrackingId}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(iwishTrackingId)}
                className="h-8 w-8"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {iwishTrackingId && (
              <Button asChild variant="outline" className="w-full mt-2">
                <a href={`/track/${iwishTrackingId}`} target="_blank" rel="noopener noreferrer">
                  <Package className="mr-2 h-4 w-4" />
                  View Full Tracking Details
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Current Status */}
        {trackingStatus && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Current Status</p>
            <Badge
              variant={trackingService.getStatusBadgeVariant(trackingStatus)}
              className="text-sm"
            >
              {trackingService.getStatusDisplayText(trackingStatus)}
            </Badge>
          </div>
        )}

        {/* Estimated Delivery */}
        {estimatedDelivery && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Estimated Delivery</p>
            <div className="flex items-center text-sm font-semibold text-gray-800">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              {new Date(estimatedDelivery).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        )}

        {/* Carrier Tracking (if available) */}
        {order.shipping_carrier && order.tracking_number && (
          <div className="space-y-1 pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-600">Carrier Details</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{order.shipping_carrier}</p>
                <p className="text-sm text-gray-600 font-mono">{order.tracking_number}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(order.tracking_number!)}
                className="h-8 w-8"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {trackingLink && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href={trackingLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Track on {order.shipping_carrier} Website
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
