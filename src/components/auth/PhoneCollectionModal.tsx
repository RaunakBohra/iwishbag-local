import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Phone, CheckCircle } from 'lucide-react';

const phoneSchema = z.object({
  phone: z.string().min(8, 'Please enter a valid phone number (minimum 8 digits)'),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

interface PhoneCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhoneAdded?: () => void;
  title?: string;
  description?: string;
  skipOption?: boolean;
}

export const PhoneCollectionModal: React.FC<PhoneCollectionModalProps> = ({
  open,
  onOpenChange,
  onPhoneAdded,
  title = 'Add Your Phone Number',
  description = 'We need your phone number to complete this action and keep you updated on your orders.',
  skipOption = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  });

  const handleSubmit = async (values: PhoneFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update phone in auth.users
      const { error } = await supabase.auth.updateUser({
        phone: values.phone,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Phone Number Added',
        description: 'Your phone number has been saved successfully.',
      });

      onOpenChange(false);
      onPhoneAdded?.();
    } catch (error) {
      console.error('Error updating phone:', error);
      toast({
        title: 'Error',
        description: 'Failed to save phone number. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    // Note: Don't call onPhoneAdded since user skipped
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 shadow-2xl max-w-md rounded-xl overflow-hidden">
        {/* Header with icon */}
        <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-400 px-6 pt-6 pb-4 -mx-6 -mt-6 mb-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-white text-xl font-semibold text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="text-white/90 text-center text-sm">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 8901"
                      {...field}
                      className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-colors h-11"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Phone Number
                  </>
                )}
              </Button>

              {skipOption && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="px-6 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg h-11"
                >
                  Skip for Now
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
