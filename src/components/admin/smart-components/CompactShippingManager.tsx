// ============================================================================
// COMPACT SHIPPING MANAGER - Phase 1 Basic Tracking
// Minimal implementation: Generate tracking IDs, mark as shipped, basic carrier selection
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  Package,
  Calendar,
  Hash,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trackingService, type TrackingStatus } from '@/services/TrackingService';
import type { UnifiedQuote } from '@/types/unified-quote';

interface CompactShippingManagerProps {
  quote: UnifiedQuote;
  onUpdateQuote: () => void;
  compact?: boolean;
}

// Common carriers for Phase 1
const CARRIERS = [
  { value: 'dhl', label: 'DHL Express' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'bluedart', label: 'Blue Dart' },
  { value: 'delhivery', label: 'Delhivery' },
  { value: 'dtdc', label: 'DTDC' },
  { value: 'other', label: 'Other' },
];

export const CompactShippingManager: React.FC<CompactShippingManagerProps> = ({
  quote,
  onUpdateQuote,
  compact = true,
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [carrierTrackingNumber, setCarrierTrackingNumber] = useState<string>('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>('');

  // Get current tracking info from quote
  const iwishTrackingId = quote.iwish_tracking_id;
  const trackingStatus = quote.tracking_status as TrackingStatus | null;
  const shippingCarrier = quote.shipping_carrier;
  const carrierTrackingNum = quote.tracking_number;
  const estimatedDelivery = quote.estimated_delivery_date;

  // Status display helpers
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'preparing':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'exception':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleGenerateTrackingId = async () => {
    if (!quote.id) return;

    setIsGenerating(true);
    try {
      const newTrackingId = await trackingService.generateTrackingId(quote.id);

      if (newTrackingId) {
        toast({
          title: 'Tracking ID Generated',
          description: `iwishBag Tracking ID: ${newTrackingId}`,
          duration: 3000,
        });
        onUpdateQuote(); // Refresh parent component
      } else {
        toast({
          title: 'Generation Failed',
          description: 'Unable to generate tracking ID. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating tracking ID:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while generating tracking ID.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsShipped = async () => {
    if (!quote.id || !selectedCarrier || !carrierTrackingNumber) {
      toast({
        title: 'Missing Information',
        description: 'Please select carrier and enter tracking number.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const success = await trackingService.markAsShipped(
        quote.id,
        selectedCarrier,
        carrierTrackingNumber,
        estimatedDeliveryDate || undefined,
      );

      if (success) {
        toast({
          title: 'Marked as Shipped',
          description: `Package shipped via ${selectedCarrier}`,
          duration: 3000,
        });

        // Reset form
        setSelectedCarrier('');
        setCarrierTrackingNumber('');
        setEstimatedDeliveryDate('');

        onUpdateQuote(); // Refresh parent component
      } else {
        toast({
          title: 'Update Failed',
          description: 'Unable to mark as shipped. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error marking as shipped:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating shipping status.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TrackingStatus) => {
    if (!quote.id) return;

    setIsUpdating(true);
    try {
      const success = await trackingService.updateTrackingStatus(quote.id, {
        tracking_status: newStatus,
      });

      if (success) {
        toast({
          title: 'Status Updated',
          description: `Status changed to ${trackingService.getStatusDisplayText(newStatus)}`,
          duration: 2000,
        });
        onUpdateQuote();
      } else {
        toast({
          title: 'Update Failed',
          description: 'Unable to update status. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating status.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="shadow-sm border-purple-200 bg-purple-50/20">
      <CardContent className="p-4">
        <div className="text-sm font-medium text-purple-800 mb-4 flex items-center">
          <Truck className="w-4 h-4 mr-2" />
          Shipping Management
        </div>

        {/* Current Status Display */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">iwishBag Tracking</span>
            {iwishTrackingId ? (
              <div className="flex items-center space-x-2">
                <Hash className="w-3 h-3 text-gray-500" />
                <span className="text-sm font-mono font-medium text-blue-600">
                  {iwishTrackingId}
                </span>
              </div>
            ) : (
              <Button
                onClick={handleGenerateTrackingId}
                disabled={isGenerating}
                size="sm"
                variant="outline"
                className="h-6 text-xs"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Generate ID
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <div className="flex items-center space-x-2">
              {getStatusIcon(trackingStatus)}
              <Badge variant={trackingService.getStatusBadgeVariant(trackingStatus)}>
                {trackingService.getStatusDisplayText(trackingStatus)}
              </Badge>
            </div>
          </div>

          {shippingCarrier && carrierTrackingNum && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Carrier</span>
              <div className="text-sm font-medium text-gray-800">
                {shippingCarrier} - {carrierTrackingNum}
              </div>
            </div>
          )}

          {estimatedDelivery && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Expected Delivery</span>
              <div className="flex items-center space-x-1 text-sm font-medium text-gray-800">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span>{new Date(estimatedDelivery).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Shipping Actions */}
        {trackingStatus === 'pending' || trackingStatus === 'preparing' ? (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">Ship This Order</div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="carrier" className="text-xs text-gray-600">
                  Carrier
                </Label>
                <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tracking" className="text-xs text-gray-600">
                  Tracking Number
                </Label>
                <Input
                  id="tracking"
                  value={carrierTrackingNumber}
                  onChange={(e) => setCarrierTrackingNumber(e.target.value)}
                  placeholder="Enter tracking #"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="delivery-date" className="text-xs text-gray-600">
                Expected Delivery (Optional)
              </Label>
              <Input
                id="delivery-date"
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <Button
              onClick={handleMarkAsShipped}
              disabled={isUpdating || !selectedCarrier || !carrierTrackingNumber}
              size="sm"
              className="w-full h-8 text-xs"
            >
              {isUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              Mark as Shipped
            </Button>
          </div>
        ) : null}

        {/* Quick Status Updates */}
        {trackingStatus && trackingStatus !== 'delivered' && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">Quick Updates</div>
            <div className="flex flex-wrap gap-1">
              {trackingStatus === 'pending' && (
                <Button
                  onClick={() => handleUpdateStatus('preparing')}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                >
                  Mark Preparing
                </Button>
              )}
              {trackingStatus === 'shipped' && (
                <Button
                  onClick={() => handleUpdateStatus('delivered')}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                >
                  Mark Delivered
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Customer Tracking Link */}
        {iwishTrackingId && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Customer tracking:
              <span className="ml-1 text-blue-600 font-mono">/track/{iwishTrackingId}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
