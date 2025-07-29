import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeliveryIntegration } from '@/hooks/useDeliveryIntegration';
import { Loader2, Truck, Package, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryManagementProps {
  quote: any;
  onUpdate?: () => void;
}

export const DeliveryManagement: React.FC<DeliveryManagementProps> = ({ quote, onUpdate }) => {
  const { createDeliveryOrder, trackDelivery, loading } = useDeliveryIntegration();
  const [trackingInfo, setTrackingInfo] = useState<any>(null);
  const [ncmBranches, setNcmBranches] = useState({
    from: quote.ncm_from_branch || 'TINKUNE',
    to: quote.ncm_to_branch || '',
    instruction: quote.ncm_delivery_instruction || ''
  });

  const hasDeliveryOrder = quote.delivery_provider && quote.delivery_tracking_number;

  const handleCreateDeliveryOrder = async () => {
    try {
      // Update NCM specific fields if it's a Nepal order
      if (quote.destination_country === 'NP') {
        const { error } = await supabase
          .from('quotes' as any)
          .update({
            ncm_from_branch: ncmBranches.from,
            ncm_to_branch: ncmBranches.to,
            ncm_delivery_instruction: ncmBranches.instruction
          })
          .eq('id', quote.id);

        if (error) throw error;
      }

      await createDeliveryOrder({ quoteId: quote.id, quote });
      onUpdate?.();
    } catch (error) {
      console.error('Error creating delivery order:', error);
    }
  };

  const handleTrackDelivery = async () => {
    if (!quote.delivery_tracking_number) return;
    
    try {
      const info = await trackDelivery(
        quote.delivery_tracking_number,
        quote.delivery_provider
      );
      setTrackingInfo(info);
    } catch (error) {
      console.error('Error tracking delivery:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'secondary',
      pickup_scheduled: 'blue',
      picked_up: 'blue',
      in_transit: 'yellow',
      out_for_delivery: 'orange',
      delivered: 'green',
      failed: 'red',
      returned: 'red',
      cancelled: 'gray'
    };
    return colors[status] || 'secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'returned':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Truck className="h-5 w-5" />
          <span>Delivery Management</span>
        </CardTitle>
        <CardDescription>
          Manage shipping and delivery for this order
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasDeliveryOrder ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                No delivery order created yet. Create one to start tracking.
              </p>
            </div>

            {quote.destination_country === 'NP' && (
              <div className="space-y-4">
                <h4 className="font-medium">NCM Branch Selection</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Branch</Label>
                    <Select
                      value={ncmBranches.from}
                      onValueChange={(value) => setNcmBranches(prev => ({ ...prev, from: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TINKUNE">Tinkune (Kathmandu)</SelectItem>
                        <SelectItem value="POKHARA">Pokhara</SelectItem>
                        <SelectItem value="BIRATNAGAR">Biratnagar</SelectItem>
                        <SelectItem value="CHITWAN">Chitwan</SelectItem>
                        <SelectItem value="BUTWAL">Butwal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>To Branch</Label>
                    <Select
                      value={ncmBranches.to}
                      onValueChange={(value) => setNcmBranches(prev => ({ ...prev, to: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TINKUNE">Tinkune (Kathmandu)</SelectItem>
                        <SelectItem value="POKHARA">Pokhara</SelectItem>
                        <SelectItem value="BIRATNAGAR">Biratnagar</SelectItem>
                        <SelectItem value="CHITWAN">Chitwan</SelectItem>
                        <SelectItem value="BUTWAL">Butwal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Delivery Instructions</Label>
                  <Textarea
                    value={ncmBranches.instruction}
                    onChange={(e) => setNcmBranches(prev => ({ ...prev, instruction: e.target.value }))}
                    placeholder="Special delivery instructions..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleCreateDeliveryOrder}
              disabled={loading || (quote.destination_country === 'NP' && !ncmBranches.to)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Delivery Order...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Create Delivery Order
                </>
              )}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Delivery Info</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Provider</Label>
                  <p className="font-medium">{quote.delivery_provider}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tracking Number</Label>
                  <p className="font-mono text-sm">{quote.delivery_tracking_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Provider Order ID</Label>
                  <p className="font-mono text-sm">{quote.delivery_provider_order_id || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estimated Delivery</Label>
                  <p>{quote.delivery_estimated_date ? formatDate(quote.delivery_estimated_date) : 'Not available'}</p>
                </div>
              </div>

              {quote.destination_country === 'NP' && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-sm">NCM Details</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>From: {quote.ncm_from_branch || 'Not set'}</p>
                    <p>To: {quote.ncm_to_branch || 'Not set'}</p>
                    {quote.ncm_delivery_instruction && (
                      <p>Instructions: {quote.ncm_delivery_instruction}</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              <Button
                onClick={handleTrackDelivery}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Tracking Info...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Track Shipment
                  </>
                )}
              </Button>

              {trackingInfo && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Current Status</h4>
                    <Badge variant={getStatusColor(trackingInfo.status) as any}>
                      {getStatusIcon(trackingInfo.status)}
                      <span className="ml-1">{trackingInfo.status.replace(/_/g, ' ').toUpperCase()}</span>
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Tracking Events</Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {trackingInfo.events?.map((event: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          <div className="flex-1">
                            <p className="font-medium">{event.description}</p>
                            <p className="text-muted-foreground">
                              {formatDate(event.timestamp)}
                              {event.location && ` • ${event.location}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {trackingInfo.proof && (
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">Proof of Delivery</Label>
                      <div className="mt-2 text-sm">
                        {trackingInfo.proof.receivedBy && (
                          <p>Received by: {trackingInfo.proof.receivedBy}</p>
                        )}
                        {trackingInfo.proof.signature && (
                          <p>Signature available</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};