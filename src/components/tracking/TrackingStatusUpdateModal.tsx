import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  Bell,
  Send,
  User,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  Navigation,
  Save,
  X,
  Calendar,
  MessageSquare,
} from 'lucide-react';

// Validation schema for tracking status update
const trackingUpdateSchema = z.object({
  new_status: z.string().min(1, 'Status is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  estimated_delivery: z.string().optional(),
  carrier_tracking_number: z.string().optional(),
  shipping_carrier: z.string().optional(),
  notify_customer: z.boolean(),
  notification_method: z.enum(['email', 'sms', 'both']).optional(),
  custom_message: z.string().optional(),
  internal_notes: z.string().optional(),
});

type TrackingUpdateFormData = z.infer<typeof trackingUpdateSchema>;

interface TrackingRecord {
  id: string;
  tracking_id: string;
  tracking_type: 'package' | 'consolidation' | 'shipment';
  current_status: string;
  origin_location: string;
  destination_location: string;
  estimated_delivery: string;
  customer_id: string;
  customer_info?: {
    name: string;
    email: string;
    phone?: string;
    country: string;
  };
}

interface TrackingStatusUpdateModalProps {
  trackingRecord: TrackingRecord;
  isOpen: boolean;
  onClose: () => void;
}

const TRACKING_STATUSES = [
  { 
    value: 'package_received', 
    label: 'Package Received',
    description: 'Package has been received at warehouse',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'processing', 
    label: 'Processing',
    description: 'Package is being processed',
    applicableTo: ['package', 'consolidation']
  },
  { 
    value: 'consolidating', 
    label: 'Consolidating',
    description: 'Package is being consolidated with other items',
    applicableTo: ['consolidation']
  },
  { 
    value: 'ready_for_shipment', 
    label: 'Ready for Shipment',
    description: 'Package is ready to be shipped',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'shipped', 
    label: 'Shipped',
    description: 'Package has been dispatched from warehouse',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'in_transit', 
    label: 'In Transit',
    description: 'Package is on its way to destination',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'customs_clearance', 
    label: 'Customs Clearance',
    description: 'Package is clearing customs',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'out_for_delivery', 
    label: 'Out for Delivery',
    description: 'Package is out for final delivery',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'delivered', 
    label: 'Delivered',
    description: 'Package has been successfully delivered',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'exception', 
    label: 'Exception',
    description: 'There is an issue with the shipment',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
  { 
    value: 'returned', 
    label: 'Returned',
    description: 'Package has been returned to sender',
    applicableTo: ['package', 'consolidation', 'shipment']
  },
];

const NOTIFICATION_TEMPLATES = {
  shipped: {
    subject: 'Your order is on its way! 📦',
    message: 'Great news! Your order has been shipped and is on its way to you. You can track its progress using your tracking ID.'
  },
  in_transit: {
    subject: 'Your package is in transit 🚚',
    message: 'Your package is currently in transit and making its way to the destination. We\'ll keep you updated on its progress.'
  },
  customs_clearance: {
    subject: 'Your package is clearing customs 🏛️',
    message: 'Your package has arrived in the destination country and is currently clearing customs. This process typically takes 1-3 business days.'
  },
  out_for_delivery: {
    subject: 'Your package is out for delivery today! 🎉',
    message: 'Exciting news! Your package is out for delivery and should arrive today. Please ensure someone is available to receive it.'
  },
  delivered: {
    subject: 'Package delivered successfully ✅',
    message: 'Your package has been delivered successfully! We hope you love your items. Thank you for choosing iwishBag!'
  },
  exception: {
    subject: 'Update on your shipment ⚠️',
    message: 'There has been an update on your shipment that requires attention. Please check the tracking details or contact our support team.'
  },
};

export const TrackingStatusUpdateModal: React.FC<TrackingStatusUpdateModalProps> = ({
  trackingRecord,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('status');

  // Form setup
  const form = useForm<TrackingUpdateFormData>({
    resolver: zodResolver(trackingUpdateSchema),
    defaultValues: {
      new_status: trackingRecord.current_status,
      location: '',
      description: '',
      estimated_delivery: trackingRecord.estimated_delivery?.split('T')[0] || '',
      carrier_tracking_number: '',
      shipping_carrier: '',
      notify_customer: true,
      notification_method: 'both',
      custom_message: '',
      internal_notes: '',
    },
  });

  // Status update mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async (data: TrackingUpdateFormData) => {
      // Create status history entry
      const statusUpdate = {
        tracking_record_id: trackingRecord.id,
        status: data.new_status,
        location: data.location,
        timestamp: new Date().toISOString(),
        description: data.description,
        updated_by: 'current_admin', // Would get from auth context
        carrier_tracking_number: data.carrier_tracking_number,
        shipping_carrier: data.shipping_carrier,
      };

      // Update tracking record
      const trackingUpdate = {
        current_status: data.new_status,
        estimated_delivery: data.estimated_delivery,
        updated_at: new Date().toISOString(),
      };

      // In a real implementation, these would be separate API calls
      // For now, we'll simulate the updates
      console.log('Updating tracking record:', trackingUpdate);
      console.log('Adding status history:', statusUpdate);

      // Send customer notification if requested
      if (data.notify_customer && trackingRecord.customer_info) {
        const template = NOTIFICATION_TEMPLATES[data.new_status as keyof typeof NOTIFICATION_TEMPLATES];
        const notificationData = {
          customer_id: trackingRecord.customer_id,
          tracking_id: trackingRecord.tracking_id,
          notification_type: data.notification_method,
          subject: template?.subject || `Tracking Update - ${data.new_status}`,
          message: data.custom_message || template?.message || data.description,
          email: trackingRecord.customer_info.email,
          phone: trackingRecord.customer_info.phone,
        };

        console.log('Sending notification:', notificationData);
        
        // Simulate notification API call
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        trackingUpdate,
        statusUpdate,
        notificationSent: data.notify_customer,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tracking'] });
      
      toast({
        title: 'Tracking updated successfully',
        description: `Status updated to "${form.getValues('new_status')}"${result.notificationSent ? ' and customer notified' : ''}.`,
      });
      
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      console.error('Tracking update error:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update tracking status',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: TrackingUpdateFormData) => {
    updateTrackingMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  // Get applicable statuses for this tracking type
  const applicableStatuses = TRACKING_STATUSES.filter(status => 
    status.applicableTo.includes(trackingRecord.tracking_type)
  );

  // Auto-fill notification message when status changes
  const selectedStatus = form.watch('new_status');
  const statusTemplate = NOTIFICATION_TEMPLATES[selectedStatus as keyof typeof NOTIFICATION_TEMPLATES];

  React.useEffect(() => {
    if (statusTemplate && !form.getValues('custom_message')) {
      form.setValue('custom_message', statusTemplate.message);
    }
  }, [selectedStatus, statusTemplate, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Update Tracking Status: {trackingRecord.tracking_id}
          </DialogTitle>
          <DialogDescription>
            Update the tracking status and optionally notify the customer about the change.
          </DialogDescription>
        </DialogHeader>

        {/* Current Status Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Current Tracking Information</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Type:</span>
              <Badge variant="outline" className="ml-2 capitalize">{trackingRecord.tracking_type}</Badge>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <Badge variant="secondary" className="ml-2">{trackingRecord.current_status.replace('_', ' ')}</Badge>
            </div>
            <div>
              <span className="text-gray-500">Customer:</span>
              <span className="ml-2 font-medium">{trackingRecord.customer_info?.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Destination:</span>
              <span className="ml-2">{trackingRecord.destination_location}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Status Update
                </TabsTrigger>
                <TabsTrigger value="shipping" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipping Info
                </TabsTrigger>
                <TabsTrigger value="notification" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Customer Notification
                </TabsTrigger>
              </TabsList>

              {/* Status Update Tab */}
              <TabsContent value="status" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="new_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select new status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {applicableStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  <div className="flex flex-col">
                                    <span>{status.label}</span>
                                    <span className="text-xs text-gray-500">{status.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Location *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., JFK Airport, New York"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Where is the package currently located?
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_delivery"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Updated Estimated Delivery</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the current status and any relevant details..."
                              {...field}
                              rows={4}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            This description will be visible to the customer
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="internal_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internal Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Internal notes for staff only..."
                              {...field}
                              rows={3}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            These notes are only visible to admin staff
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Shipping Information Tab */}
              <TabsContent value="shipping" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Carrier Information</h4>
                    
                    <FormField
                      control={form.control}
                      name="shipping_carrier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Carrier</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., DHL, FedEx, UPS"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carrier_tracking_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carrier Tracking Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="External carrier tracking number"
                              {...field}
                              className="font-mono"
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            The tracking number provided by the shipping carrier
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Route Information</h4>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Origin:</span>
                          <span className="font-medium">{trackingRecord.origin_location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Destination:</span>
                          <span className="font-medium">{trackingRecord.destination_location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer Country:</span>
                          <span className="font-medium">{trackingRecord.customer_info?.country}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-2">Shipping Tips</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Update carrier info when package is handed over</li>
                        <li>• Provide accurate tracking numbers for customer visibility</li>
                        <li>• Update location at major transit points</li>
                        <li>• Set realistic delivery estimates</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Customer Notification Tab */}
              <TabsContent value="notification" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Settings</h4>
                    
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="notify_customer"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border-gray-300"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Send notification to customer about this status update
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {form.watch('notify_customer') && (
                        <FormField
                          control={form.control}
                          name="notification_method"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notification Method</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select notification method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="email">Email Only</SelectItem>
                                  <SelectItem value="sms">SMS Only</SelectItem>
                                  <SelectItem value="both">Both Email & SMS</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Customer Contact Info */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Customer Contact</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>{trackingRecord.customer_info?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{trackingRecord.customer_info?.email || 'No email'}</span>
                        </div>
                        {trackingRecord.customer_info?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span>{trackingRecord.customer_info.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="custom_message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Custom message for the customer..."
                              {...field}
                              rows={8}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Leave empty to use the default message template
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {statusTemplate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-2">Default Template Preview</h5>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-blue-600 font-medium">Subject:</span>
                            <p className="text-sm text-blue-800">{statusTemplate.subject}</p>
                          </div>
                          <div>
                            <span className="text-xs text-blue-600 font-medium">Message:</span>
                            <p className="text-sm text-blue-700">{statusTemplate.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between pt-6 border-t">
              <div className="text-sm text-gray-500">
                Status update will be logged and visible in tracking history.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateTrackingMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTrackingMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateTrackingMutation.isPending ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TrackingStatusUpdateModal;