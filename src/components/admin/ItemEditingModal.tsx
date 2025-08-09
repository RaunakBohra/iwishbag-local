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
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  DollarSign,
  Scale,
  AlertTriangle,
  Save,
  X,
  Edit3,
  ExternalLink,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { formatOrderAmount, getOrderCurrencyContext } from '@/utils/orderCurrencyUtils';

type OrderItem = Database['public']['Tables']['order_items']['Row'] & {
  item_revisions?: Database['public']['Tables']['item_revisions']['Row'][];
};

type OrderWithCurrency = {
  currency: string;
  profiles?: {
    preferred_display_currency?: string;
  };
  id: string;
};

// Validation schema for item editing
const itemEditSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  product_url: z.string().url().optional().or(z.literal('')),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50'),
  current_price: z.number().min(0, 'Price must be non-negative'),
  current_weight: z.number().min(0, 'Weight must be non-negative').optional(),
  seller_platform: z.string().optional(),
  seller_product_id: z.string().optional(),
  item_status: z.string().optional(),
  admin_notes: z.string().optional(),
  customer_notes: z.string().optional(),
  // Price variance tracking
  original_price: z.number().optional(),
  price_variance_reason: z.string().optional(),
});

type ItemEditFormData = z.infer<typeof itemEditSchema>;

interface ItemEditingModalProps {
  orderItem: OrderItem;
  order: OrderWithCurrency;
  isOpen: boolean;
  onClose: () => void;
}

const ITEM_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'ordered', label: 'Ordered from Seller' },
  { value: 'shipped_to_warehouse', label: 'Shipped to Warehouse' },
  { value: 'received_at_warehouse', label: 'Received at Warehouse' },
  { value: 'quality_checked', label: 'Quality Checked' },
  { value: 'shipped_to_customer', label: 'Shipped to Customer' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'refunded', label: 'Refunded' },
];

const SELLER_PLATFORMS = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'ebay', label: 'eBay' },
  { value: 'alibaba', label: 'Alibaba' },
  { value: 'etsy', label: 'Etsy' },
  { value: 'walmart', label: 'Walmart' },
  { value: 'target', label: 'Target' },
  { value: 'other', label: 'Other' },
];

export const ItemEditingModal: React.FC<ItemEditingModalProps> = ({
  orderItem,
  order,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  
  const currencyContext = getOrderCurrencyContext(order);

  // Calculate price variance
  const priceVariance = orderItem.price_variance || 0;
  const originalPrice = orderItem.current_price - priceVariance;

  // Form setup
  const form = useForm<ItemEditFormData>({
    resolver: zodResolver(itemEditSchema),
    defaultValues: {
      product_name: orderItem.product_name || '',
      product_url: orderItem.product_url || '',
      quantity: orderItem.quantity || 1,
      current_price: orderItem.current_price || 0,
      current_weight: orderItem.current_weight || 0,
      seller_platform: orderItem.seller_platform || '',
      seller_product_id: orderItem.seller_product_id || '',
      item_status: orderItem.item_status || 'pending',
      admin_notes: orderItem.admin_notes || '',
      customer_notes: orderItem.customer_notes || '',
      original_price: originalPrice,
      price_variance_reason: '',
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (orderItem) {
      const variance = orderItem.price_variance || 0;
      const original = orderItem.current_price - variance;
      
      form.reset({
        product_name: orderItem.product_name || '',
        product_url: orderItem.product_url || '',
        quantity: orderItem.quantity || 1,
        current_price: orderItem.current_price || 0,
        current_weight: orderItem.current_weight || 0,
        seller_platform: orderItem.seller_platform || '',
        seller_product_id: orderItem.seller_product_id || '',
        item_status: orderItem.item_status || 'pending',
        admin_notes: orderItem.admin_notes || '',
        customer_notes: orderItem.customer_notes || '',
        original_price: original,
        price_variance_reason: '',
      });
    }
  }, [orderItem, form]);

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (data: ItemEditFormData) => {
      const updates: any = {};
      
      // Track price changes
      const currentPrice = data.current_price;
      const originalPrice = data.original_price || orderItem.current_price;
      const newVariance = currentPrice - originalPrice;
      
      // Only include changed fields
      Object.keys(data).forEach((key) => {
        if (key === 'original_price' || key === 'price_variance_reason') return;
        
        const formValue = data[key as keyof ItemEditFormData];
        const originalValue = orderItem[key as keyof OrderItem];
        
        if (formValue !== originalValue && formValue !== undefined) {
          updates[key] = formValue;
        }
      });

      // Handle price variance if price changed
      if (newVariance !== (orderItem.price_variance || 0)) {
        updates.price_variance = newVariance;
        
        // Create revision record for significant price changes
        if (Math.abs(newVariance) > 0.01) {
          const revisionData = {
            order_item_id: orderItem.id,
            change_type: newVariance > 0 ? 'price_increase' : 'price_decrease',
            old_price: originalPrice,
            new_price: currentPrice,
            price_difference: newVariance,
            change_reason: data.price_variance_reason || 'Admin price adjustment',
            admin_notes: `Price updated from ${formatOrderAmount(originalPrice, currencyContext).customer} to ${formatOrderAmount(currentPrice, currencyContext).customer}`,
            customer_approval_status: Math.abs(newVariance) > originalPrice * 0.1 ? 'pending' : 'auto_approved',
            auto_approved: Math.abs(newVariance) <= originalPrice * 0.1, // Auto-approve changes under 10%
            total_cost_impact: newVariance * (orderItem.quantity || 1),
          };
          
          // Insert revision record
          await supabase.from('item_revisions').insert(revisionData);
        }
      }

      if (Object.keys(updates).length === 0) {
        return { success: true, changes: 0 };
      }

      // Add timestamp
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('order_items')
        .update(updates)
        .eq('id', orderItem.id);

      if (error) throw error;

      return { success: true, changes: Object.keys(updates).length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail', order.id] });
      
      toast({
        title: 'Item updated successfully',
        description: `${result.changes} field${result.changes !== 1 ? 's' : ''} updated for ${orderItem.product_name}`,
      });
      
      onClose();
    },
    onError: (error: any) => {
      console.error('Item update error:', error);
      toast({
        title: 'Update failed',
        description: `Failed to update item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ItemEditFormData) => {
    updateItemMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  // Calculate total price impact
  const watchedQuantity = form.watch('quantity');
  const watchedPrice = form.watch('current_price');
  const totalImpact = (watchedQuantity || 0) * (watchedPrice || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Item: {orderItem.product_name}
          </DialogTitle>
          <DialogDescription>
            Make changes to item details, pricing, and status. 
            Price changes over 10% will require customer approval.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Current Item Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Current Item Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge variant="outline" className="ml-2">{orderItem.item_status?.replace('_', ' ') || 'pending'}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Platform:</span>
                  <Badge variant="secondary" className="ml-2">{orderItem.seller_platform || 'N/A'}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Current Price:</span>
                  <span className="ml-2 font-medium">
                    {formatOrderAmount(orderItem.current_price || 0, currencyContext).customer}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Quantity:</span>
                  <span className="ml-2 font-medium">{orderItem.quantity} items</span>
                </div>
              </div>
              
              {priceVariance !== 0 && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">
                      Price Variance: {formatOrderAmount(priceVariance, currencyContext).customer} 
                      ({priceVariance > 0 ? 'increase' : 'decrease'})
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="status" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Status
                </TabsTrigger>
              </TabsList>

              {/* Product Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="product_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter product name..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="product_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product URL</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                placeholder="https://..."
                                {...field}
                              />
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(field.value, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="seller_platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SELLER_PLATFORMS.map((platform) => (
                                  <SelectItem key={platform.value} value={platform.value}>
                                    {platform.label}
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
                        name="seller_product_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seller Product ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="SKU/ASIN/Product ID"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="current_weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            Weight (kg)
                          </FormLabel>
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
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customer_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notes visible to customer..."
                              {...field}
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Notes (Internal)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Internal admin notes..."
                              {...field}
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Current automation status if available */}
                    {orderItem.order_automation_status && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <h5 className="font-medium text-sm text-blue-900 mb-1">Automation Status</h5>
                        <Badge variant="outline" className="text-xs">
                          {orderItem.order_automation_status}
                        </Badge>
                        {orderItem.seller_order_id && (
                          <p className="text-xs text-blue-700 mt-1">
                            Seller Order: {orderItem.seller_order_id}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Price & Quantity</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="50"
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
                        name="current_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Price *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="price_variance_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Change Reason</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Reason for price adjustment (if any)..."
                              {...field}
                              rows={3}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">Required for price changes over 10%</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Price Impact Analysis</h4>
                    
                    <div className="bg-gray-50 p-4 rounded space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Original Price:</span>
                        <span className="font-medium">
                          {formatOrderAmount(form.watch('original_price') || 0, currencyContext).customer}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>New Price:</span>
                        <span className="font-medium">
                          {formatOrderAmount(watchedPrice || 0, currencyContext).customer}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>Price Change:</span>
                        <span className={`font-medium ${
                          (watchedPrice - (form.watch('original_price') || 0)) > 0 
                            ? 'text-red-600' 
                            : (watchedPrice - (form.watch('original_price') || 0)) < 0 
                              ? 'text-green-600' 
                              : 'text-gray-600'
                        }`}>
                          {formatOrderAmount(watchedPrice - (form.watch('original_price') || 0), currencyContext).customer}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Quantity:</span>
                        <span className="font-medium">{watchedQuantity} items</span>
                      </div>
                      
                      <div className="flex justify-between text-sm border-t pt-2 font-semibold">
                        <span>Total Impact:</span>
                        <span>{formatOrderAmount(totalImpact, currencyContext).customer}</span>
                      </div>
                    </div>

                    {/* Customer approval status */}
                    {Math.abs(watchedPrice - (form.watch('original_price') || 0)) > (form.watch('original_price') || 0) * 0.1 && (
                      <div className="bg-amber-50 p-3 rounded border border-amber-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">
                            Large Price Change Detected
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                          Price changes over 10% will require customer approval and create a revision request.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Status Management Tab */}
              <TabsContent value="status" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="item_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select item status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ITEM_STATUSES.map((status) => (
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
                    <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                      <div>
                        <span className="text-gray-500">Added to Order:</span>
                        <span className="ml-2">{orderItem.created_at ? new Date(orderItem.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Updated:</span>
                        <span className="ml-2">{orderItem.updated_at ? new Date(orderItem.updated_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      {orderItem.seller_tracking_id && (
                        <div>
                          <span className="text-gray-500">Tracking ID:</span>
                          <span className="ml-2 font-mono text-xs">{orderItem.seller_tracking_id}</span>
                        </div>
                      )}
                    </div>

                    {/* Revision history if available */}
                    {orderItem.item_revisions && orderItem.item_revisions.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Recent Revisions</h5>
                        <div className="space-y-2">
                          {orderItem.item_revisions.slice(0, 3).map((revision) => (
                            <div key={revision.id} className="bg-blue-50 p-2 rounded text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{revision.change_type?.replace('_', ' ')}</span>
                                <Badge variant={revision.customer_approval_status === 'approved' ? 'default' : 'outline'} className="text-xs">
                                  {revision.customer_approval_status}
                                </Badge>
                              </div>
                              {revision.change_reason && (
                                <p className="text-gray-600 mt-1">{revision.change_reason}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between pt-6 border-t">
              <div className="text-sm text-gray-500">
                Changes will be logged. Customer approval required for significant price changes.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateItemMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateItemMutation.isPending}
                >
                  {updateItemMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {updateItemMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemEditingModal;