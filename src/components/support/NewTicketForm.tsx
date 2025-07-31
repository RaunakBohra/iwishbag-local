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
import { Loader2, HelpCircle, Package, MapPin, Calendar, DollarSign, Search } from 'lucide-react';
import { QuoteSelectionModal } from '@/components/admin/modals/QuoteSelectionModal';
import { useCreateCustomerTicket } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardState } from '@/hooks/useDashboardState';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketPriority,
  type TicketCategory,
} from '@/types/ticket';
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
  category: z.enum(['general', 'payment', 'shipping', 'refund', 'product', 'customs'] as const),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const).optional(),
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
  const { mutate: createTicket, isPending: isCreating } = useCreateCustomerTicket();
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Get user's quotes and orders for modal selection
  const { quotes, orders } = useDashboardState();
  const userQuotes = [...(quotes || []), ...(orders || [])].filter(
    (quote) => quote && quote.id && quote.destination_country,
  );

  const form = useForm<NewTicketForm>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'general',
      quote_id: preSelectedQuoteId || undefined,
    },
  });

  const selectedQuoteId = form.watch('quote_id');

  // Find selected quote for context display
  const selectedQuote: QuoteWithTracking | null =
    selectedQuoteId
      ? (userQuotes.find((quote) => quote.id === selectedQuoteId) as QuoteWithTracking)
      : null;

  // Handle quote selection from modal
  const handleQuoteSelect = (quote: any) => {
    if (quote) {
      form.setValue('quote_id', quote.id);
    } else {
      form.setValue('quote_id', undefined);
    }
    setShowQuoteModal(false);
  };

  const onSubmit = async (values: NewTicketForm) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    createTicket(
      {
        subject: values.subject,
        description: values.description,
        priority: values.priority || 'medium', // Default to medium for customer tickets
        category: values.category,
        quote_id: values.quote_id,
      },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
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

            {/* Order Selection - Advanced Modal Selection */}
            {userQuotes.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Related Order (Optional)
                </label>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuoteModal(true)}
                  className="w-full justify-start text-left h-auto p-4"
                  disabled={isCreating}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Search className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      {selectedQuote ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {selectedQuote.iwish_tracking_id || `Quote ${selectedQuote.id.slice(0, 8)}...`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedQuote.destination_country} • ${selectedQuote.final_total_usd?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          Click to select a quote or order
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {userQuotes.length} available
                    </div>
                  </div>
                </Button>
                
                {selectedQuote && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>Quote selected. Click above to change or clear selection.</span>
                  </div>
                )}
              </div>
            )}

            {/* Order Context Display - Shows details of selected order */}
            {selectedQuote && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg transition-all duration-300 ease-in-out">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-blue-900">Order Details</h4>
                      <Badge
                        variant={selectedQuote.status === 'delivered' ? 'default' : 'secondary'}
                      >
                        {selectedQuote.status}
                      </Badge>
                      {selectedQuote.tracking_status && (
                        <Badge variant="outline">{selectedQuote.tracking_status}</Badge>
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
                          <span>
                            Est. Delivery:{' '}
                            {new Date(selectedQuote.estimated_delivery_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedQuote.items && (
                      <div className="mt-2 text-xs text-blue-700">
                        Items:{' '}
                        {Array.isArray(selectedQuote.items)
                          ? selectedQuote.items
                              .map((item: any) => item?.name || 'Unnamed item')
                              .join(', ')
                          : 'Product details available'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

        {/* Quote Selection Modal */}
        <QuoteSelectionModal
          isOpen={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          quotes={userQuotes}
          selectedQuoteId={selectedQuoteId}
          onSelectQuote={handleQuoteSelect}
          title="Select Related Quote/Order"
          description="Choose a quote or order that this support ticket is related to. This helps our team provide better assistance."
          emptyMessage="You don't have any quotes or orders yet. Create a quote first to associate it with support tickets."
          showClearOption={true}
          viewMode="customer"
          maxHeight={500}
        />
      </CardContent>
    </Card>
  );
};
