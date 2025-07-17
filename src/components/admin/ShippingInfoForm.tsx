import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useOrderMutations, type ShippingData } from '@/hooks/useOrderMutations';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ship } from 'lucide-react';

const shippingSchema = z.object({
  shipping_carrier: z.string().min(1, 'Shipping carrier is required'),
  tracking_number: z.string().min(1, 'Tracking number is required'),
});

type ShippingFormValues = ShippingData;

interface ShippingInfoFormProps {
  quote: Tables<'quotes'>;
}

export const ShippingInfoForm = ({ quote }: ShippingInfoFormProps) => {
  const { updateShippingInfo, isUpdatingShipping } = useOrderMutations(quote.id);

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      shipping_carrier: quote.shipping_carrier || '',
      tracking_number: quote.tracking_number || '',
    },
  });

  const onSubmit = (data: ShippingFormValues) => {
    updateShippingInfo(data);
  };

  const canBeShipped = ['paid', 'ordered'].includes(quote.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Management</CardTitle>
        <CardDescription>Enter tracking information to mark the order as shipped.</CardDescription>
      </CardHeader>
      <CardContent>
        {quote.status === 'shipped' || quote.status === 'completed' ? (
          <div className="space-y-2 text-sm">
            <p>
              <strong>Status:</strong> Marked as {quote.status}
            </p>
            <p>
              <strong>Carrier:</strong> {quote.shipping_carrier}
            </p>
            <p>
              <strong>Tracking #:</strong> {quote.tracking_number}
            </p>
            {quote.shipped_at && (
              <p>
                <strong>Shipped On:</strong> {new Date(quote.shipped_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="shipping_carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Carrier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., DHL, FedEx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tracking_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Tracking number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isUpdatingShipping || !canBeShipped}
                className="w-full"
              >
                <Ship className="mr-2 h-4 w-4" />
                {isUpdatingShipping ? 'Saving...' : 'Save & Mark as Shipped'}
              </Button>
              {!canBeShipped && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Order must be in 'paid' or 'ordered' status to be shipped.
                </p>
              )}
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};
