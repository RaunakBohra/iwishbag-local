/**
 * Package Return Form Component
 * 
 * Allows customers to request physical returns of packages/items.
 * This is different from RefundRequestForm - this is for sending packages back.
 * 
 * Features:
 * - Quote/order lookup
 * - Item selection (specific items or all items)
 * - Return reason selection
 * - RMA number generation
 * - Integration with existing package return system
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Truck,
  FileText,
  Info,
  ShoppingBag,
  RotateCcw,
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
  items: QuoteItem[];
  created_at: string;
  iwish_tracking_id?: string;
}

interface QuoteItem {
  name: string;
  quantity: number;
  costprice_origin: number;
  weight?: number;
  dimensions?: any;
  url?: string;
  description?: string;
}

interface SelectedItem {
  index: number;
  data: QuoteItem;
  quantity: number;
}

interface PackageReturnFormProps {
  quoteId?: string;
  onSuccess?: (rmaNumber: string) => void;
  onCancel?: () => void;
}

// Return type options with descriptions
const RETURN_TYPES = [
  { 
    value: 'defective', 
    label: 'Defective Item', 
    description: 'Item arrived broken or not working' 
  },
  { 
    value: 'wrong_item', 
    label: 'Wrong Item Received', 
    description: 'Received different item than ordered' 
  },
  { 
    value: 'not_as_described', 
    label: 'Not as Described', 
    description: 'Item differs significantly from description' 
  },
  { 
    value: 'damaged_in_shipping', 
    label: 'Damaged in Shipping', 
    description: 'Item was damaged during shipment' 
  },
  { 
    value: 'quality_issue', 
    label: 'Quality Issue', 
    description: 'Item quality is below expectations' 
  },
  { 
    value: 'change_of_mind', 
    label: 'Change of Mind', 
    description: 'No longer want the item (may incur return shipping costs)' 
  },
  { 
    value: 'other', 
    label: 'Other Reason', 
    description: 'Reason not listed above' 
  },
];

export const PackageReturnForm: React.FC<PackageReturnFormProps> = ({
  quoteId: propQuoteId,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [quoteId, setQuoteId] = useState(propQuoteId || '');
  const [showQuoteLookup, setShowQuoteLookup] = useState(!propQuoteId);
  const [formData, setFormData] = useState({
    return_type: 'defective',
    return_reason: '',
    customer_notes: '',
    return_all_items: true,
  });
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Fetch quote details
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuery({
    queryKey: ['quote-details-return', quoteId],
    queryFn: async (): Promise<QuoteDetails> => {
      if (!quoteId) throw new Error('No quote ID provided');
      
      // Try to find quote by UUID first, then by display_id or tracking_id
      let data, error;
      
      // First try: assume it's a UUID
      if (quoteId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const result = await supabase
          .from('quotes')
          .select('id, display_id, status, final_total_origincurrency, currency, items, created_at, iwish_tracking_id')
          .eq('id', quoteId)
          .eq('user_id', user?.id)
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Second try: search by display_id or tracking_id
        const result = await supabase
          .from('quotes')
          .select('id, display_id, status, final_total_origincurrency, currency, items, created_at, iwish_tracking_id')
          .or(`display_id.eq.${quoteId},iwish_tracking_id.eq.${quoteId}`)
          .eq('user_id', user?.id)
          .single();
        data = result.data;
        error = result.error;
      }
        
      if (error) throw error;
      if (!data) throw new Error('Quote not found');
      
      return {
        ...data,
        items: Array.isArray(data.items) ? data.items : [],
      };
    },
    enabled: !!quoteId && !!user,
  });

  // Create package return mutation
  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (!quoteId) throw new Error('Quote ID is required');
      if (!user) throw new Error('User authentication required');

      const selectedItemsForSubmission = formData.return_all_items 
        ? [] 
        : selectedItems.map((item, index) => ({
            index: item.index,
            data: item.data,
            quantity: item.quantity,
          }));

      const { data, error } = await supabase.rpc('create_package_return', {
        p_quote_id: quoteId,
        p_return_type: formData.return_type,
        p_return_reason: formData.return_reason,
        p_customer_notes: formData.customer_notes,
        p_selected_items: selectedItemsForSubmission,
        p_return_all_items: formData.return_all_items,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create return request');

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Return Request Created',
        description: `Your return request ${data.rma_number} has been submitted for review.`,
      });
      
      onSuccess?.(data.rma_number);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Return Request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle quote lookup
  const lookupQuote = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    try {
      let data, error;
      
      // First try: UUID search
      if (searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const result = await supabase
          .from('quotes')
          .select('id')
          .eq('id', searchTerm)
          .eq('user_id', user?.id)
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Second try: display_id or tracking_id search
        const result = await supabase
          .from('quotes')
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
          title: 'Order Found',
          description: 'Order details loaded successfully.',
        });
      } else {
        toast({
          title: 'Order Not Found',
          description: 'No order found with that ID or tracking number.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Unable to search for order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle item selection changes
  const handleItemToggle = (index: number, checked: boolean) => {
    const item = quote?.items[index];
    if (!item) return;

    if (checked) {
      setSelectedItems(prev => [
        ...prev,
        { index, data: item, quantity: item.quantity || 1 }
      ]);
    } else {
      setSelectedItems(prev => prev.filter(selected => selected.index !== index));
    }
  };

  // Handle quantity changes for selected items
  const handleQuantityChange = (index: number, quantity: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.index === index ? { ...item, quantity } : item
      )
    );
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!quoteId) {
      toast({
        title: 'Order Required',
        description: 'Please select a valid order.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.return_reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a detailed reason for the return.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.return_all_items && selectedItems.length === 0) {
      toast({
        title: 'Items Required',
        description: 'Please select at least one item to return.',
        variant: 'destructive',
      });
      return;
    }

    createReturnMutation.mutate();
  };

  const canCreateReturn = quote && 
    ['ordered', 'shipped', 'completed'].includes(quote.status);

  const isReturnEligible = canCreateReturn;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Return Packages</h2>
        <p className="text-muted-foreground">
          Request to return physical packages to our warehouse
        </p>
      </div>

      {/* Quote Lookup */}
      {showQuoteLookup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Find Your Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quote-search">Order ID or Tracking Number</Label>
              <div className="flex gap-2">
                <Input
                  id="quote-search"
                  placeholder="Enter order ID (e.g., Q-12345) or tracking number (e.g., IWB2024001)"
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

      {/* Loading State */}
      {quoteLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading order details...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {quoteError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {quoteError.message || 'Failed to load order details'}
          </AlertDescription>
        </Alert>
      )}

      {/* Quote Details */}
      {quote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Order ID</Label>
                <p className="font-mono">{quote.display_id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Badge variant={quote.status === 'completed' ? 'default' : 'secondary'}>
                  {quote.status}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Total Items</Label>
                <p className="font-semibold">{quote.items.length}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                <p>{new Date(quote.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {!isReturnEligible && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This order is not eligible for returns. Only completed or shipped orders can be returned.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Return Form */}
      {isReturnEligible && (
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Return Type and Reason */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Return Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Return Type */}
                <div>
                  <Label htmlFor="return_type">Reason for Return</Label>
                  <Select 
                    value={formData.return_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, return_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETURN_TYPES.map(type => (
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

                {/* Detailed Reason */}
                <div>
                  <Label htmlFor="return_reason">Detailed Description *</Label>
                  <Textarea
                    id="return_reason"
                    placeholder="Please provide specific details about why you're returning these items..."
                    value={formData.return_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, return_reason: e.target.value }))}
                    rows={4}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Include item condition, specific issues, or other relevant details
                  </p>
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="customer_notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="customer_notes"
                    placeholder="Any additional information that might help us process your return..."
                    value={formData.customer_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Item Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Items to Return</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Return All Items Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="return_all_items"
                    checked={formData.return_all_items}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, return_all_items: !!checked }));
                      if (checked) {
                        setSelectedItems([]);
                      }
                    }}
                  />
                  <Label htmlFor="return_all_items" className="font-medium">
                    Return all items in this order
                  </Label>
                </div>

                {/* Individual Item Selection */}
                {!formData.return_all_items && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Select specific items you want to return:
                    </p>
                    {quote?.items.map((item, index) => {
                      const isSelected = selectedItems.some(selected => selected.index === index);
                      const selectedItem = selectedItems.find(selected => selected.index === index);
                      
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleItemToggle(index, !!checked)}
                            />
                            <div className="flex-1 space-y-2">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatCurrency(item.costprice_origin || 0, quote.currency)} each
                                </p>
                              </div>
                              
                              {isSelected && (
                                <div className="flex items-center space-x-2">
                                  <Label className="text-sm">Quantity to return:</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={item.quantity || 1}
                                    value={selectedItem?.quantity || 1}
                                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                    className="w-20"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    (of {item.quantity || 1} ordered)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selection Summary */}
                {formData.return_all_items ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      You're returning all {quote?.items.length || 0} items from this order.
                    </AlertDescription>
                  </Alert>
                ) : selectedItems.length > 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      You're returning {selectedItems.length} item(s) with a total quantity of {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>

            {/* Important Information */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Steps:</strong> After submitting this request, we'll review it and send you return instructions with a prepaid shipping label (if applicable) within 2-3 business days. You'll receive an RMA number to track your return.
              </AlertDescription>
            </Alert>

            {/* Submit Actions */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Return requests are typically processed within 2-3 business days
              </div>
              <div className="flex gap-2">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={createReturnMutation.isPending}
                >
                  {createReturnMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Request...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 mr-2" />
                      Submit Return Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default PackageReturnForm;