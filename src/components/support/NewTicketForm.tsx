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
import { useUnifiedSupport } from '@/hooks/useUnifiedSupport';
import { useAuth } from '@/contexts/AuthContext';
import type { TicketCategory, TicketPriority } from '@/services/UnifiedSupportEngine';

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
  category: z.enum(['general', 'payment', 'shipping', 'refund', 'product', 'customs'] as const),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const).default('medium'),
  quote_id: z.string().optional(),
});

type NewTicketForm = z.infer<typeof newTicketSchema>;

interface NewTicketFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  preSelectedQuoteId?: string;
}

export const NewTicketForm = ({ onSuccess, onCancel, preSelectedQuoteId }: NewTicketFormProps) => {
  const { user } = useAuth();
  const { createTicket, isCreating } = useUnifiedSupport({ 
    userId: user?.id,
    autoRefresh: false 
  });

  // TODO: Get user's quotes for dropdown selection
  // This would need to be implemented with a separate quotes hook
  const userQuotes: any[] = [];

  const form = useForm<NewTicketForm>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'general',
      priority: 'medium',
      quote_id: preSelectedQuoteId || '',
    },
  });

  const onSubmit = async (values: NewTicketForm) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      await createTicket({
        subject: values.subject,
        description: values.description,
        priority: values.priority,
        category: values.category,
        quote_id: values.quote_id || undefined,
      });

      // Reset form on success
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting ticket:', error);
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

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
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
                      <SelectItem value="general">General Question</SelectItem>
                      <SelectItem value="payment">Payment Issue</SelectItem>
                      <SelectItem value="shipping">Shipping & Delivery</SelectItem>
                      <SelectItem value="refund">Refund Request</SelectItem>
                      <SelectItem value="product">Product Question</SelectItem>
                      <SelectItem value="customs">Customs & Duties</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low - General inquiry</SelectItem>
                      <SelectItem value="medium">Medium - Standard issue</SelectItem>
                      <SelectItem value="high">High - Important issue</SelectItem>
                      <SelectItem value="urgent">Urgent - Critical issue</SelectItem>
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
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreating ? 'Creating Ticket...' : 'Create Ticket'}
              </Button>

              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
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
