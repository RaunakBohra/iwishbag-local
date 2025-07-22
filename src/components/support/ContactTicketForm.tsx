import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, Clock } from 'lucide-react';
import { useCreateCustomerTicket, useUserTickets } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { businessHoursService } from '@/config/businessHours';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketPriority,
  type TicketCategory,
} from '@/types/ticket';

// Customer-friendly form schema (simplified)
const contactTicketSchema = z.object({
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject must be less than 200 characters'),
  description: z
    .string()
    .min(10, 'Please provide more details about your issue')
    .max(2000, 'Description must be less than 2000 characters'),
  help_type: z.enum(['order_issue', 'account_question', 'payment_problem', 'other'] as const),
  quote_id: z.string().optional(),
});

type ContactTicketForm = z.infer<typeof contactTicketSchema>;

interface ContactTicketFormProps {
  onSuccess?: () => void;
  className?: string;
}

export const ContactTicketForm = ({ onSuccess, className }: ContactTicketFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const createTicketMutation = useCreateCustomerTicket();

  // Get user's quotes for dropdown selection
  const { data: userTickets } = useUserTickets(user?.id);
  const userQuotes = userTickets?.map((t) => t.quote).filter(Boolean) || [];

  const form = useForm<ContactTicketForm>({
    resolver: zodResolver(contactTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      help_type: 'other',
      quote_id: '',
    },
  });

  const onSubmit = async (values: ContactTicketForm) => {
    if (!user) {
      // Redirect to auth if not logged in
      window.location.href = '/auth';
      return;
    }

    setIsSubmitting(true);

    try {
      await createTicketMutation.mutateAsync({
        quote_id: values.quote_id || undefined,
        subject: values.subject,
        description: values.description,
        help_type: values.help_type,
      });

      // Reset form on success
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className={`text-center p-8 border rounded-lg ${className || ''}`}>
        <h3 className="text-lg font-semibold mb-2">Sign in to create a support ticket</h3>
        <p className="text-gray-600 mb-4">
          Track your issues and get personalized help with your orders.
        </p>
        <Button
          onClick={() => (window.location.href = '/auth')}
          className="bg-teal-600 hover:bg-teal-700"
        >
          Sign In / Create Account
        </Button>
      </div>
    );
  }

  // Business hours status
  const isCurrentlyBusinessHours = businessHoursService.isCurrentlyBusinessHours();
  const responseMessage = businessHoursService.getAutoResponseMessage();

  return (
    <div className={className}>
      {/* Business Hours Notice */}
      <div className={`mb-4 p-3 rounded-lg border text-sm ${isCurrentlyBusinessHours 
        ? 'bg-green-50 border-green-200 text-green-800' 
        : 'bg-orange-50 border-orange-200 text-orange-800'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {isCurrentlyBusinessHours ? 'Support team is online' : 'Support team is offline'}
          </span>
        </div>
        <p className="text-xs opacity-90">
          {responseMessage}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Quote Selection (if user has quotes) */}
          {userQuotes.length > 0 && (
            <FormField
              control={form.control}
              name="quote_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Related Order (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select an order if this is related to a specific purchase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No related order</SelectItem>
                      {userQuotes.map((quote) => (
                        <SelectItem key={quote.id} value={quote.id}>
                          {quote.iwish_tracking_id
                            ? `${quote.iwish_tracking_id} - ${quote.destination_country}`
                            : `Order ${quote.id.slice(0, 8)}... - ${quote.destination_country}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* What do you need help with? */}
          <FormField
            control={form.control}
            name="help_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">What do you need help with?</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="order_issue">Order or Delivery Issue</SelectItem>
                    <SelectItem value="payment_problem">Payment Problem</SelectItem>
                    <SelectItem value="account_question">Account Question</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Subject */}
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Subject</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Brief description of your issue"
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please provide detailed information about your issue. Include any relevant order details, error messages, or steps you've already taken."
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Creating Ticket...' : 'Create Support Ticket'}
          </Button>
        </form>
      </Form>
    </div>
  );
};
