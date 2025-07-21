import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Phone, ShieldCheck, Truck } from 'lucide-react';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
  country: z.string().min(2, 'Please select your country').optional(),
});

interface PhoneCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const PhoneCollectionModal: React.FC<PhoneCollectionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
      country: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof phoneSchema>) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Update auth.users phone
      const { error: authError } = await supabase.auth.updateUser({
        phone: values.phone,
      });

      if (authError) {
        console.error('Auth phone update error:', authError);
        toast({
          title: 'Error updating phone',
          description: authError.message,
          variant: 'destructive',
        });
        return;
      }

      // Update profile if country is provided
      if (values.country) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            country: values.country,
            // Set currency based on country
            preferred_display_currency:
              values.country === 'US'
                ? 'USD'
                : values.country === 'IN'
                  ? 'INR'
                  : values.country === 'NP'
                    ? 'NPR'
                    : values.country === 'GB'
                      ? 'GBP'
                      : values.country === 'CA'
                        ? 'CAD'
                        : null,
          })
          .eq('id', user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Don't fail the whole process for profile error
        }
      }

      toast({
        title: 'Phone number saved!',
        description: 'Your phone number has been added to your account.',
      });

      onComplete();
    } catch (error) {
      console.error('Phone collection error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save phone number. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            We need your phone number for order updates and delivery coordination.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Benefits */}
          <div className="grid grid-cols-1 gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Truck className="h-4 w-4" />
              <span>Delivery updates and coordination</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              <span>Order security and verification</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>
                      Include country code for international numbers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country (Optional)</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        disabled={isSubmitting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select your country</option>
                        <option value="US">United States</option>
                        <option value="IN">India</option>
                        <option value="NP">Nepal</option>
                        <option value="GB">United Kingdom</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="JP">Japan</option>
                        <option value="SG">Singapore</option>
                      </select>
                    </FormControl>
                    <FormDescription>Helps us set your preferred currency</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Skip for now
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Saving...' : 'Save Phone'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
