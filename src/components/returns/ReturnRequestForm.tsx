/**
 * Return Request Form Component
 * 
 * Allows customers to create refund requests for completed orders.
 * Integrates with existing create_refund_request database function.
 * 
 * Features:
 * - Quote lookup and validation
 * - Refund amount calculation and limits
 * - Multiple refund types and reasons
 * - File attachments for evidence
 * - Real-time validation
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Receipt,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Upload,
  X,
  Calculator,
  CreditCard,
  FileText,
  Info,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/currencyConversion';

interface QuoteDetails {
  id: string;
  display_id: string;
  status: string;
  final_total_origincurrency: number;
  currency: string;
  items: any[];
  created_at: string;
  iwish_tracking_id?: string;
}

interface PaymentSummary {
  total_paid: number;
  available_for_refund: number;
  currency: string;
  payment_count: number;
}

interface ReturnRequestFormProps {
  quoteId?: string;
  onSuccess?: (refundRequestId: string) => void;
  onCancel?: () => void;
}

// Refund configuration constants
const REFUND_TYPES = [
  { value: 'full', label: 'Full Refund', description: 'Request refund for entire order' },
  { value: 'partial', label: 'Partial Refund', description: 'Request refund for specific items' },
  { value: 'overpayment', label: 'Overpayment', description: 'Refund excess payment amount' },
];

const REASON_CODES = [
  { value: 'order_cancelled', label: 'Order Cancelled', description: 'Order was cancelled before fulfillment' },
  { value: 'customer_request', label: 'Customer Request', description: 'General customer-requested refund' },
  { value: 'product_unavailable', label: 'Product Unavailable', description: 'Ordered items are no longer available' },
  { value: 'quality_issue', label: 'Quality Issue', description: 'Product quality did not meet expectations' },
  { value: 'shipping_issue', label: 'Shipping Issue', description: 'Problems with delivery or shipping' },
  { value: 'price_adjustment', label: 'Price Adjustment', description: 'Price difference or promotional adjustment' },
  { value: 'duplicate_payment', label: 'Duplicate Payment', description: 'Accidental duplicate payment' },
  { value: 'other', label: 'Other', description: 'Other reason not listed above' },
];

const REFUND_METHODS = [
  { value: 'original_payment_method', label: 'Original Payment Method', description: 'Refund to original payment source' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Direct bank transfer' },
  { value: 'store_credit', label: 'Store Credit', description: 'Credit for future purchases' },
];

export const ReturnRequestForm: React.FC<ReturnRequestFormProps> = ({
  quoteId: propQuoteId,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [quoteId, setQuoteId] = useState(propQuoteId || '');
  const [formData, setFormData] = useState({
    refund_type: 'partial',
    amount: '',
    currency: 'USD',
    reason_code: 'customer_request',
    reason_description: '',
    customer_notes: '',
    refund_method: 'original_payment_method',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showQuoteLookup, setShowQuoteLookup] = useState(!propQuoteId);

  // Fetch quote details
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuery({
    queryKey: ['quote-details', quoteId],
    queryFn: async (): Promise<QuoteDetails> => {
      if (!quoteId) throw new Error('No quote ID provided');
      
      // Try to find quote by UUID first, then by display_id or tracking_id
      let data, error;
      
      // First try: assume it's a UUID
      if (quoteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const result = await supabase
          .from('quotes_v2')
          .select('id, display_id, status, final_total_origincurrency, currency, items, created_at, iwish_tracking_id')
          .eq('id', quoteId)
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Second try: search by display_id or tracking_id
        const result = await supabase
          .from('quotes_v2')
          .select('id, display_id, status, final_total_origincurrency, currency, items, created_at, iwish_tracking_id')
          .or(`display_id.eq.${quoteId},iwish_tracking_id.eq.${quoteId}`)
          .single();
        data = result.data;
        error = result.error;
      }
        
      if (error) throw error;
      if (!data) throw new Error('Quote not found');
      
      return data;
    },
    enabled: !!quoteId,
  });

  // Fetch payment summary
  const { data: paymentSummary, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-summary', quoteId],
    queryFn: async (): Promise<PaymentSummary> => {
      if (!quoteId) throw new Error('No quote ID provided');
      
      const { data, error } = await supabase.rpc('get_quote_payment_summary', {
        p_quote_id: quoteId,
      });
      
      if (error) throw error;
      
      return {
        total_paid: data?.total_paid || 0,
        available_for_refund: data?.available_for_refund || 0,
        currency: data?.currency || 'USD',
        payment_count: data?.payment_count || 0,
      };
    },
    enabled: !!quoteId && !!quote,
  });

  // Create refund request mutation
  const createRefundMutation = useMutation({
    mutationFn: async (requestData: typeof formData) => {
      if (!quoteId) throw new Error('Quote ID is required');
      if (!user) throw new Error('User authentication required');

      const { data, error } = await supabase.rpc('create_refund_request', {
        p_quote_id: quoteId,
        p_refund_type: requestData.refund_type,
        p_amount: parseFloat(requestData.amount),
        p_currency: requestData.currency,
        p_reason_code: requestData.reason_code,
        p_reason_description: requestData.reason_description,
        p_customer_notes: requestData.customer_notes,
        p_internal_notes: null,
        p_refund_method: requestData.refund_method,
        p_payment_ids: null, // Auto-allocate to most recent payments
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create refund request');

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Refund Request Submitted',
        description: 'Your refund request has been submitted for review. You will receive updates via email.',
      });
      
      onSuccess?.(data.refund_request_id);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Submit Refund Request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Auto-populate currency from quote
  useEffect(() => {
    if (quote && quote.currency !== formData.currency) {
      setFormData(prev => ({ ...prev, currency: quote.currency }));
    }
  }, [quote]);

  // Auto-populate full refund amount
  useEffect(() => {
    if (formData.refund_type === 'full' && paymentSummary) {
      setFormData(prev => ({ 
        ...prev, 
        amount: paymentSummary.available_for_refund.toString() 
      }));
    }
  }, [formData.refund_type, paymentSummary]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!quoteId) {
      toast({
        title: 'Quote Required',
        description: 'Please enter a valid quote ID or tracking number.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid refund amount.',
        variant: 'destructive',
      });
      return;
    }

    if (paymentSummary && parseFloat(formData.amount) > paymentSummary.available_for_refund) {
      toast({
        title: 'Amount Too High',
        description: `Refund amount cannot exceed ${formatCurrency(paymentSummary.available_for_refund, paymentSummary.currency)}.`,
        variant: 'destructive',
      });
      return;
    }

    if (!formData.reason_description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please provide a detailed reason for the refund request.',
        variant: 'destructive',
      });
      return;
    }

    createRefundMutation.mutate(formData);
  };

  const lookupQuote = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    try {
      let data, error;
      
      // First try: UUID search
      if (searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const result = await supabase
          .from('quotes_v2')
          .select('id')
          .eq('id', searchTerm)
          .eq('user_id', user?.id)
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Second try: display_id or tracking_id search
        const result = await supabase
          .from('quotes_v2')
          .select('id')
          .or(`display_id.eq.${searchTerm},iwish_tracking_id.eq.${searchTerm}`)
          .eq('user_id', user?.id)
          .single();
        data = result.data;
        error = result.error;
      }

      if (data && !error) {
        setQuoteId(data.id);
        setShowQuoteLookup(false);
        toast({
          title: 'Quote Found',
          description: 'Quote details loaded successfully.',
        });
      } else {
        toast({
          title: 'Quote Not Found',
          description: 'No quote found with that ID or tracking number.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Unable to search for quote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const canCreateRefund = quote && 
    ['paid', 'ordered', 'shipped', 'completed'].includes(quote.status) &&
    paymentSummary && 
    paymentSummary.available_for_refund > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Request Refund</h2>
        <p className="text-muted-foreground">
          Submit a refund request for your completed order
        </p>
      </div>

      {/* Quote Lookup */}
      {showQuoteLookup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Find Your Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quote-search">Quote ID or Tracking Number</Label>
              <div className="flex gap-2">
                <Input
                  id="quote-search"
                  placeholder="Enter quote ID (e.g., Q-12345) or tracking number (e.g., IWB2024001)"
                  value={quoteId}
                  onChange={(e) => setQuoteId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookupQuote(quoteId)}
                />
                <Button 
                  type="button" 
                  onClick={() => lookupQuote(quoteId)}
                  disabled={!quoteId.trim()}
                >
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quote Details */}
      {quoteLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading quote details...
            </div>
          </CardContent>
        </Card>
      )}

      {quoteError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {quoteError.message || 'Failed to load quote details'}
          </AlertDescription>
        </Alert>
      )}

      {quote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Quote ID</Label>
                <p className="font-mono">{quote.display_id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Badge variant={quote.status === 'completed' ? 'default' : 'secondary'}>
                  {quote.status}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                <p className="font-semibold">
                  {formatCurrency(quote.final_total_origincurrency, quote.currency)}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                <p>{new Date(quote.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {paymentSummary && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Paid</Label>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(paymentSummary.total_paid, paymentSummary.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Available for Refund</Label>
                  <p className="font-semibold">
                    {formatCurrency(paymentSummary.available_for_refund, paymentSummary.currency)}
                  </p>
                </div>
              </div>
            )}

            {!canCreateRefund && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {paymentSummary?.available_for_refund === 0 
                    ? 'No refundable amount available for this order.'
                    : 'This order is not eligible for refund. Only paid orders can be refunded.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Refund Form */}
      {canCreateRefund && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Refund Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Refund Type */}
              <div>
                <Label htmlFor="refund_type">Refund Type</Label>
                <Select 
                  value={formData.refund_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, refund_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Refund Amount */}
              <div>
                <Label htmlFor="amount">Refund Amount</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentSummary?.available_for_refund}
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => paymentSummary && setFormData(prev => ({ 
                      ...prev, 
                      amount: paymentSummary.available_for_refund.toString() 
                    }))}
                    className="whitespace-nowrap"
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    Max
                  </Button>
                </div>
                {paymentSummary && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum: {formatCurrency(paymentSummary.available_for_refund, paymentSummary.currency)}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="reason_code">Reason for Refund</Label>
                <Select 
                  value={formData.reason_code} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, reason_code: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_CODES.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>
                        <div>
                          <div className="font-medium">{reason.label}</div>
                          <div className="text-sm text-muted-foreground">{reason.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Detailed Description */}
              <div>
                <Label htmlFor="reason_description">Detailed Description *</Label>
                <Textarea
                  id="reason_description"
                  placeholder="Please provide a detailed explanation for your refund request..."
                  value={formData.reason_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason_description: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="customer_notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="customer_notes"
                  placeholder="Any additional information that might help process your request..."
                  value={formData.customer_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Refund Method */}
              <div>
                <Label htmlFor="refund_method">Preferred Refund Method</Label>
                <Select 
                  value={formData.refund_method} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, refund_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        <div>
                          <div className="font-medium">{method.label}</div>
                          <div className="text-sm text-muted-foreground">{method.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Submit Actions */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Refund requests are typically processed within 2-3 business days</span>
                </div>
                <div className="flex gap-2">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={createRefundMutation.isPending}
                  >
                    {createRefundMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Submit Refund Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
};

export default ReturnRequestForm;