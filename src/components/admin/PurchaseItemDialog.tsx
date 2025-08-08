import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const purchaseFormSchema = z.object({
  actual_price: z.string().transform(val => parseFloat(val)),
  actual_weight: z.string().transform(val => parseFloat(val)),
  seller_order_id: z.string().min(1, 'Order ID is required'),
  seller_tracking: z.string().optional(),
  purchase_platform: z.string().min(1, 'Platform is required'),
  purchase_notes: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

interface PurchaseItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    product_name: string;
    price: number;
    weight: number;
    seller: string;
  };
  quoteId: string;
  onSuccess?: () => void;
}

export function PurchaseItemDialog({
  open,
  onOpenChange,
  item,
  quoteId,
  onSuccess
}: PurchaseItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      actual_price: item.price.toString(),
      actual_weight: item.weight.toString(),
      seller_order_id: '',
      seller_tracking: '',
      purchase_platform: item.seller.toLowerCase(),
      purchase_notes: '',
    },
  });

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const onSubmit = async (data: PurchaseFormData) => {
    try {
      setIsSubmitting(true);

      // Get current quote data
      const { data: quote, error: fetchError } = await supabase
        .from('quotes_v2')
        .select('operational_data')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Update operational data with purchase details
      const operationalData = quote.operational_data || {};
      const purchaseDetails = operationalData.purchase_details || {};
      
      purchaseDetails[item.id] = {
        actual_price: data.actual_price,
        actual_weight: data.actual_weight,
        seller_order_id: data.seller_order_id,
        seller_tracking: data.seller_tracking,
        purchase_platform: data.purchase_platform,
        purchase_notes: data.purchase_notes,
        purchased_at: new Date().toISOString(),
        purchased_by: (await supabase.auth.getUser()).data.user?.id,
      };

      // Upload receipt if provided
      let receiptUrl = null;
      if (receiptFile) {
        const fileName = `${quoteId}/${item.id}/receipt_${Date.now()}_${receiptFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('quote-attachments')
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('quote-attachments')
          .getPublicUrl(fileName);

        receiptUrl = publicUrl;
        purchaseDetails[item.id].receipt_url = receiptUrl;
      }

      // Update the quote with new operational data
      const { error: updateError } = await supabase
        .from('quotes_v2')
        .update({
          operational_data: {
            ...operationalData,
            purchase_details: purchaseDetails,
          },
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('quote_activity_log').insert({
        quote_id: quoteId,
        action: 'item_purchased',
        details: {
          item_id: item.id,
          item_name: item.product_name,
          actual_price: data.actual_price,
          actual_weight: data.actual_weight,
          price_variance: data.actual_price - item.price,
          weight_variance: data.actual_weight - item.weight,
        },
      });

      toast({
        title: 'Purchase recorded',
        description: `Successfully recorded purchase for ${item.product_name}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error recording purchase:', error);
      toast({
        title: 'Error',
        description: 'Failed to record purchase. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Purchase</DialogTitle>
          <DialogDescription>
            Enter the actual purchase details for {item.product_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="actual_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={item.price.toString()}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Estimated: ${item.price.toFixed(2)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder={item.weight.toString()}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Estimated: {item.weight}kg
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purchase_platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="ebay">eBay</SelectItem>
                      <SelectItem value="alibaba">Alibaba</SelectItem>
                      <SelectItem value="flipkart">Flipkart</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seller_order_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seller Order ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter order ID from seller" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seller_tracking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter tracking number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchase_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about the purchase"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Receipt Upload (Optional)</FormLabel>
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  className="cursor-pointer"
                />
                {receiptFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {receiptFile.name}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Record Purchase
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}