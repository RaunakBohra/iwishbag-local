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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, HelpCircle } from 'lucide-react';
import { useCreateCustomerTicket, useUserTickets } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketPriority,
  type TicketCategory,
} from '@/types/ticket';

// Customer-friendly form validation schema
const newTicketSchema = z.object({
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject must be less than 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  help_type: z.enum(['order_issue', 'account_question', 'payment_problem', 'other'] as const),
  quote_id: z.string().optional(),
});

type NewTicketForm = z.infer<typeof newTicketSchema>;

interface NewTicketFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  preSelectedQuoteId?: string;
}

export const NewTicketForm = ({ onSuccess, onCancel, preSelectedQuoteId }: NewTicketFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const createTicketMutation = useCreateCustomerTicket();

  // Get user's quotes for dropdown selection
  const { data: userTickets } = useUserTickets(user?.id);
  const userQuotes = userTickets?.map((t) => t.quote).filter(Boolean) || [];

  const form = useForm<NewTicketForm>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      help_type: 'other',
      quote_id: preSelectedQuoteId || '',
    },
  });

  const onSubmit = async (values: NewTicketForm) => {
    if (!user) {
      console.error('User not authenticated');
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          Create Support Ticket
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Quote Selection (Optional) */}
            {userQuotes.length > 0 && (
              <FormField
                control={form.control}
                name="quote_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Order (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a quote/order if related" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No related order</SelectItem>
                        {userQuotes.map((quote) => (
                          <SelectItem key={quote.id} value={quote.id}>
                            {quote.iwish_tracking_id
                              ? `${quote.iwish_tracking_id} - ${quote.destination_country}`
                              : `Quote ${quote.id.slice(0, 8)}... - ${quote.destination_country}`}
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
                  <FormLabel>What do you need help with?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the type of help you need" />
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
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of your issue" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide detailed information about your issue. Include any relevant order details, error messages, or steps you've already taken."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
              </Button>

              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
