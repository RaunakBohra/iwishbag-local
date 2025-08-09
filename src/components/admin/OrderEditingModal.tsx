import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Package,
  CreditCard,
  Truck,
  Settings,
  AlertTriangle,
  Save,
  X,
  Edit3,
  MapPin,
  MessageCircle
} from 'lucide-react';
import { formatOrderAmount, getOrderCurrencyContext } from '@/utils/orderCurrencyUtils';
import { orderEditingService } from '@/services/OrderEditingService';
import { useAuth } from '@/contexts/AuthContext';

type OrderWithDetails = Database['public']['Tables']['orders']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'];
  order_items?: (Database['public']['Tables']['order_items']['Row'] & {
    item_revisions?: Database['public']['Tables']['item_revisions']['Row'][];
  })[];
  customer_delivery_preferences?: Database['public']['Tables']['customer_delivery_preferences']['Row'][];
};

// Validation schema for order editing
const orderEditSchema = z.object({
  // Customer Information
  customer_notes: z.string().optional(),
  admin_notes: z.string().optional(),
  
  // Delivery Settings
  delivery_method: z.string().optional(),
  consolidation_preference: z.string().optional(),
  primary_warehouse: z.string().optional(),
  max_consolidation_wait_days: z.number().min(1).max(30).optional(),
  delivery_address: z.any().optional(), // JSON field for delivery address
  
  // Order Settings
  automation_enabled: z.boolean().optional(),
  quality_check_requested: z.boolean().optional(),
  photo_documentation_required: z.boolean().optional(),
  
  // Status Updates
  status: z.string().optional(),
  overall_status: z.string().optional(),
  
  // Financial Adjustments
  manual_adjustment_amount: z.number().optional(),
  manual_adjustment_reason: z.string().optional(),
  
  // Customer Profile Updates (for reference - these need separate handling)
  customer_full_name: z.string().optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
  customer_country: z.string().optional(),
});

type OrderEditFormData = z.infer<typeof orderEditSchema>;

interface OrderEditingModalProps {
  order: OrderWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

const ORDER_STATUSES = [
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'seller_ordered', label: 'Seller Ordered' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const OVERALL_STATUSES = [
  { value: 'payment_pending', label: 'Payment Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'automation_in_progress', label: 'Automation in Progress' },
  { value: 'revision_needed', label: 'Revision Needed' },
  { value: 'ready_to_ship', label: 'Ready to Ship' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'exception', label: 'Exception' },
];

const WAREHOUSES = [
  { value: 'usa_primary', label: 'USA Primary' },
  { value: 'usa_secondary', label: 'USA Secondary' },
  { value: 'uk_primary', label: 'UK Primary' },
  { value: 'canada_primary', label: 'Canada Primary' },
];

const DELIVERY_METHODS = [
  { value: 'standard_shipping', label: 'Standard Shipping' },
  { value: 'express_shipping', label: 'Express Shipping' },
  { value: 'priority_shipping', label: 'Priority Shipping' },
  { value: 'air_cargo', label: 'Air Cargo' },
  { value: 'sea_cargo', label: 'Sea Cargo' },
];

const CONSOLIDATION_PREFERENCES = [
  { value: 'immediate', label: 'Ship Immediately' },
  { value: 'weekly', label: 'Weekly Consolidation' },
  { value: 'bi_weekly', label: 'Bi-Weekly Consolidation' },
  { value: 'monthly', label: 'Monthly Consolidation' },
  { value: 'manual', label: 'Manual Control' },
];

export const OrderEditingModal: React.FC<OrderEditingModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('customer');

  const currencyContext = getOrderCurrencyContext(order);

  // Form setup
  const form = useForm<OrderEditFormData>({
    resolver: zodResolver(orderEditSchema),
    defaultValues: {
      customer_notes: order.customer_notes || '',
      admin_notes: order.admin_notes || '',
      delivery_method: order.delivery_method || '',
      consolidation_preference: order.consolidation_preference || '',
      primary_warehouse: order.primary_warehouse || '',
      max_consolidation_wait_days: order.max_consolidation_wait_days || 7,
      delivery_address: order.delivery_address || null,
      automation_enabled: order.automation_enabled || false,
      quality_check_requested: order.quality_check_requested || false,
      photo_documentation_required: order.photo_documentation_required || false,
      status: order.status,
      overall_status: order.overall_status || '',
      manual_adjustment_amount: 0,
      manual_adjustment_reason: '',
      // Customer profile data (read-only reference)
      customer_full_name: order.profiles?.full_name || '',
      customer_email: order.profiles?.email || '',
      customer_phone: order.profiles?.phone || '',
      customer_country: order.profiles?.country || '',
    },
  });

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      form.reset({
        customer_notes: order.customer_notes || '',
        admin_notes: order.admin_notes || '',
        delivery_method: order.delivery_method || '',
        consolidation_preference: order.consolidation_preference || '',
        primary_warehouse: order.primary_warehouse || '',
        max_consolidation_wait_days: order.max_consolidation_wait_days || 7,
        delivery_address: order.delivery_address || null,
        automation_enabled: order.automation_enabled || false,
        quality_check_requested: order.quality_check_requested || false,
        photo_documentation_required: order.photo_documentation_required || false,
        status: order.status,
        overall_status: order.overall_status || '',
        manual_adjustment_amount: 0,
        manual_adjustment_reason: '',
        // Customer profile data (read-only reference)
        customer_full_name: order.profiles?.full_name || '',
        customer_email: order.profiles?.email || '',
        customer_phone: order.profiles?.phone || '',
        customer_country: order.profiles?.country || '',
      });
    }
  }, [order, form]);

  // Update order mutation using service
  const updateOrderMutation = useMutation({
    mutationFn: async (data: OrderEditFormData) => {
      const updates: any = {};
      
      // Only include changed fields
      Object.keys(data).forEach((key) => {
        const formValue = data[key as keyof OrderEditFormData];
        const originalValue = order[key as keyof typeof order];
        
        if (formValue !== originalValue && formValue !== undefined) {
          updates[key] = formValue;
        }
      });

      if (Object.keys(updates).length === 0) {
        return { success: true, updatedFields: [] };
      }

      // Use the OrderEditingService for validation and updates
      const result = await orderEditingService.updateOrder({
        orderId: order.id,
        updates,
        adminUserId: user?.id,
        changeReason: 'Admin order edit via OrderDetailPage',
      });

      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail', order.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      
      const changeCount = result.updatedFields.length;
      
      if (changeCount > 0) {
        let description = `${changeCount} field${changeCount > 1 ? 's' : ''} updated`;
        
        // Add recalculation information if performed
        if (result.recalculationPerformed && result.recalculationChanges) {
          const { totalChange, shippingChange } = result.recalculationChanges;
          if (Math.abs(totalChange) > 0.01) {
            description += `. Order total ${totalChange > 0 ? 'increased' : 'decreased'} by ${formatOrderAmount(Math.abs(totalChange), currencyContext).customer}`;
          }
          if (Math.abs(shippingChange) > 0.01) {
            description += `. Shipping ${shippingChange > 0 ? 'increased' : 'decreased'} by ${formatOrderAmount(Math.abs(shippingChange), currencyContext).customer}`;
          }
        }
        
        toast({
          title: result.customerApprovalRequired ? 'Order updated - Customer approval required' : 'Order updated successfully',
          description,
          variant: result.customerApprovalRequired ? 'default' : 'default',
        });
        
        // Show additional notification for customer approval
        if (result.customerApprovalRequired) {
          setTimeout(() => {
            toast({
              title: 'Customer Approval Required',
              description: 'Significant changes were made that require customer approval. They will be notified automatically.',
              variant: 'default',
            });
          }, 2000);
        }
      } else {
        toast({
          title: 'No changes made',
          description: 'Order was already up to date with the provided values.',
        });
      }
      
      onClose();
    },
    onError: (error: any) => {
      console.error('Order update error:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update order',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: OrderEditFormData) => {
    updateOrderMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Order: {order.order_number}
          </DialogTitle>
          <DialogDescription>
            Make changes to order details, delivery preferences, and settings.
            Changes will be logged and the customer will be notified when appropriate.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Current Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Current Order Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge variant="outline" className="ml-2">{order.status.replace('_', ' ')}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Overall:</span>
                  <Badge variant="secondary" className="ml-2">{order.overall_status?.replace('_', ' ') || 'N/A'}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>
                  <span className="ml-2 font-medium">
                    {formatOrderAmount(order.total_amount, currencyContext).customer}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Items:</span>
                  <span className="ml-2 font-medium">{order.total_items} items</span>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="customer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="delivery" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="status" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Status
                </TabsTrigger>
              </TabsList>

              {/* Customer Information Tab */}
              <TabsContent value="customer" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer Profile Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Profile (Read-Only)
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-500">Name:</span>
                          <p className="font-medium mt-1">{order.profiles?.full_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Country:</span>
                          <p className="font-medium mt-1">{order.profiles?.country || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="font-medium mt-1">{order.profiles?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <p className="font-medium mt-1">{order.profiles?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Currency:</span>
                          <p className="font-medium mt-1">{order.profiles?.preferred_display_currency || order.currency}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Customer ID:</span>
                          <p className="font-medium mt-1 font-mono text-xs">{order.customer_id?.slice(-8) || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          💡 To edit customer profile information, go to Customer Management → Customer Profile
                        </p>
                      </div>
                    </div>

                    {/* Current Delivery Address */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Current Delivery Address
                      </h5>
                      {order.delivery_address ? (
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <pre className="whitespace-pre-wrap text-xs">
                            {typeof order.delivery_address === 'string' 
                              ? order.delivery_address 
                              : JSON.stringify(order.delivery_address, null, 2)
                            }
                          </pre>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm bg-amber-50 p-3 rounded border border-amber-200">
                          ⚠️ No delivery address set for this order
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Editable Customer Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium mb-3">Order-Specific Notes & Settings</h4>
                    
                    <FormField
                      control={form.control}
                      name="customer_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer-Visible Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add notes that will be visible to the customer..."
                              {...field}
                              rows={4}
                              className="resize-none"
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">These notes will be displayed to the customer in their order details</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internal Admin Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Internal notes for admin team..."
                              {...field}
                              rows={4}
                              className="resize-none"
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">Private notes only visible to admin team</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quick Actions */}
                    <div className="pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-sm mb-3">Quick Actions</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Navigate to customer profile
                            if (order.customer_id) {
                              window.open(`/admin/customers/${order.customer_id}`, '_blank');
                            }
                          }}
                          disabled={!order.customer_id}
                        >
                          <User className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Open customer communication modal
                            // This would trigger the parent component's customer message modal
                            toast({
                              title: 'Customer Communication',
                              description: 'Use the "Contact Customer" button in the header for messaging.',
                            });
                          }}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Contact
                        </Button>
                      </div>
                    </div>

                    {/* Order Payment Information */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-sm text-blue-900 mb-2">Payment Information</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Payment Method:</span>
                          <span className="font-medium text-blue-900">
                            {order.payment_method?.replace('_', ' ') || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Payment Status:</span>
                          <Badge variant="outline" className="text-xs">
                            {order.payment_status || 'pending'}
                          </Badge>
                        </div>
                        {order.payment_completed_at && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Paid At:</span>
                            <span className="font-medium text-blue-900 text-xs">
                              {new Date(order.payment_completed_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-blue-700">Amount Paid:</span>
                          <span className="font-medium text-blue-900">
                            {formatOrderAmount(order.amount_paid || 0, currencyContext).customer}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Delivery Settings Tab */}
              <TabsContent value="delivery" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Preferences
                    </h4>

                    <FormField
                      control={form.control}
                      name="delivery_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select delivery method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DELIVERY_METHODS.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
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
                      name="consolidation_preference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consolidation Preference</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select consolidation preference" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONSOLIDATION_PREFERENCES.map((pref) => (
                                <SelectItem key={pref.value} value={pref.value}>
                                  {pref.label}
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
                      name="primary_warehouse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Warehouse</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select primary warehouse" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WAREHOUSES.map((warehouse) => (
                                <SelectItem key={warehouse.value} value={warehouse.value}>
                                  {warehouse.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Delivery Settings</h4>

                    <FormField
                      control={form.control}
                      name="max_consolidation_wait_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Consolidation Wait (Days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <h5 className="text-sm font-medium">Current Delivery Address</h5>
                      {order.delivery_address ? (
                        <div className="p-3 bg-gray-50 rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(order.delivery_address, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No delivery address set</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Order Features</h4>
                    
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="automation_enabled"
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
                              Enable automation for this order
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quality_check_requested"
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
                              Request quality check
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="photo_documentation_required"
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
                              Require photo documentation
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Financial Adjustments</h4>
                    
                    <FormField
                      control={form.control}
                      name="manual_adjustment_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manual Adjustment Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manual_adjustment_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adjustment Reason</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Reason for manual adjustment..."
                              {...field}
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {order.variance_amount && order.variance_amount !== 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">
                            Current Variance: {formatOrderAmount(order.variance_amount, currencyContext).customer}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Status Management Tab */}
              <TabsContent value="status" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Status Updates</h4>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select order status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ORDER_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
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
                      name="overall_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select overall status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {OVERALL_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Status Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2">{new Date(order.created_at!).toLocaleDateString()}</span>
                      </div>
                      {order.payment_completed_at && (
                        <div>
                          <span className="text-gray-500">Payment Completed:</span>
                          <span className="ml-2">{new Date(order.payment_completed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {order.shipped_at && (
                        <div>
                          <span className="text-gray-500">Shipped:</span>
                          <span className="ml-2">{new Date(order.shipped_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {order.delivered_at && (
                        <div>
                          <span className="text-gray-500">Delivered:</span>
                          <span className="ml-2">{new Date(order.delivered_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Item Status Summary</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Active: {order.active_items || 0}</div>
                        <div>Shipped: {order.shipped_items || 0}</div>
                        <div>Delivered: {order.delivered_items || 0}</div>
                        <div>Cancelled: {order.cancelled_items || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-500">
                Changes will be logged and audited. Customer notifications will be sent when appropriate.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateOrderMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateOrderMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderEditingModal;