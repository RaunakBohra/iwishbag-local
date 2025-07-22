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
import { Badge } from '@/components/ui/badge';
import { Loader2, HelpCircle, Package, MapPin, Calendar, DollarSign } from 'lucide-react';
import { useCreateCustomerTicket } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardState } from '@/hooks/useDashboardState';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketPriority,
  type TicketCategory,
} from '@/types/ticket';
import type { UnifiedQuote } from '@/types/unified-quote';
import type { Tables } from '@/integrations/supabase/types';

// Extended quote type that includes tracking fields (database has them, types might be out of sync)
type QuoteWithTracking = Tables<'quotes'> & {
  iwish_tracking_id?: string | null;
  tracking_status?: string | null;
  estimated_delivery_date?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  items?: any; // JSONB field
};

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

  // Get user's quotes and orders for dropdown selection
  const { quotes, orders } = useDashboardState();
  const userQuotes = [...(quotes || []), ...(orders || [])].filter(quote => 
    quote && quote.id && quote.destination_country
  );

  const form = useForm<NewTicketForm>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      help_type: 'other',
      quote_id: preSelectedQuoteId || '',
    },
  });

  // Watch help_type to conditionally show order selection
  const helpType = form.watch('help_type');
  const selectedQuoteId = form.watch('quote_id');

  // Clear quote_id when switching away from order_issue
  if (helpType !== 'order_issue' && selectedQuoteId) {
    form.setValue('quote_id', '');
  }

  // Find selected quote for context display
  const selectedQuote: QuoteWithTracking | null = selectedQuoteId 
    ? (userQuotes.find(quote => quote.id === selectedQuoteId) as QuoteWithTracking)
    : null;

  // Auto-populate subject when help type or order changes
  const currentSubject = form.watch('subject');
  const autoGenerateSubject = () => {
    if (!currentSubject || currentSubject.startsWith('Issue with') || currentSubject.startsWith('Payment Problem') || currentSubject.startsWith('Account Question')) {
      let newSubject = '';
      switch (helpType) {
        case 'order_issue':
          if (selectedQuote) {
            newSubject = `Issue with Order ${selectedQuote.iwish_tracking_id || selectedQuote.id.slice(0, 8)}`;
          } else {
            newSubject = 'Order or Delivery Issue';
          }
          break;
        case 'payment_problem':
          newSubject = 'Payment Problem';
          break;
        case 'account_question':
          newSubject = 'Account Question';
          break;
        default:
          newSubject = 'Support Request';
      }
      if (newSubject !== currentSubject) {
        form.setValue('subject', newSubject);
      }
    }
  };

  // Trigger auto-generation when help type or selected quote changes
  if (helpType || selectedQuoteId) {
    autoGenerateSubject();
  }

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
            {/* What do you need help with? - Now comes first */}
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

            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-2 bg-yellow-50 border text-xs">
                Debug: helpType={helpType}, userQuotes.length={userQuotes.length}
              </div>
            )}

            {/* Order Selection - Only shown for order issues */}
            {helpType === 'order_issue' && userQuotes.length > 0 && (
              <FormField
                control={form.control}
                name="quote_id"
                render={({ field }) => (
                  <FormItem className="transition-all duration-300 ease-in-out">
                    <FormLabel>Which order do you need help with?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the order you need help with" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userQuotes.map((quote) => (
                          <SelectItem key={quote.id} value={quote.id}>
                            {(quote as QuoteWithTracking).iwish_tracking_id
                              ? `${(quote as QuoteWithTracking).iwish_tracking_id} - ${quote.destination_country}`
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

            {/* Order Context Display - Shows details of selected order */}
            {selectedQuote && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg transition-all duration-300 ease-in-out">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-blue-900">Order Details</h4>
                      <Badge variant={selectedQuote.status === 'delivered' ? 'default' : 'secondary'}>
                        {selectedQuote.status}
                      </Badge>
                      {selectedQuote.tracking_status && (
                        <Badge variant="outline">
                          {selectedQuote.tracking_status}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                      {selectedQuote.iwish_tracking_id && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>ID: {selectedQuote.iwish_tracking_id}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>To: {selectedQuote.destination_country}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Total: ${selectedQuote.final_total_usd?.toFixed(2) || 'N/A'}</span>
                      </div>
                      
                      {selectedQuote.estimated_delivery_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Est. Delivery: {new Date(selectedQuote.estimated_delivery_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedQuote.items && (
                      <div className="mt-2 text-xs text-blue-700">
                        Items: {Array.isArray(selectedQuote.items) 
                          ? selectedQuote.items.map((item: any) => item?.name || 'Unnamed item').join(', ')
                          : 'Product details available'
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Helpful message when order issue is selected but no orders exist */}
            {helpType === 'order_issue' && userQuotes.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  We don't see any orders in your account yet. If you have a question about an order, 
                  please include the order details in your message below.
                </p>
              </div>
            )}

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject (auto-filled, you can edit)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of your issue" {...field} />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    We've suggested a subject based on your issue type, but feel free to modify it.
                  </p>
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
