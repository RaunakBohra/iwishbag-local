import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tables } from '@/integrations/supabase/types';

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

  if (order.status !== 'shipped' && order.status !== 'completed') {
    return null;
  }

  if (!order.shipping_carrier || !order.tracking_number) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your order is being prepared for shipment. Tracking information will appear here soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Information</CardTitle>
        <CardDescription>
          Your order has been shipped. Track it using the details below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Carrier</p>
          <p className="text-lg font-semibold">{order.shipping_carrier}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Tracking Number</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-primary break-all">{order.tracking_number}</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(order.tracking_number!)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {trackingLink && (
          <Button asChild className="w-full">
            <a href={trackingLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Track Package
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
