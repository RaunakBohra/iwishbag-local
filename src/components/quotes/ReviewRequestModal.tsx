import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReviewRequestModalProps {
  open: boolean;
  onClose: () => void;
  quote: any;
  onSuccess: () => void;
}

interface ReviewRequestData {
  category: 'pricing' | 'items' | 'shipping' | 'timeline' | 'other';
  urgency: 'low' | 'medium' | 'high';
  description: string;
  specificItems?: string[];
  expectedChanges?: string;
  budgetConstraint?: number;
}

const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  open,
  onClose,
  quote,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ReviewRequestData>({
    category: 'pricing',
    urgency: 'medium',
    description: '',
    expectedChanges: '',
    specificItems: [],
    budgetConstraint: undefined
  });
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({
      category: 'pricing',
      urgency: 'medium', 
      description: '',
      expectedChanges: '',
      specificItems: [],
      budgetConstraint: undefined
    });
    setSelectedItems(new Set());
  }, []);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }, [isSubmitting, resetForm, onClose]);

  const handleItemToggle = useCallback((itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!formData.description.trim()) {
        toast({
          title: "Description Required",
          description: "Please describe what needs to be changed.",
          variant: "destructive",
        });
        return;
      }

      if (formData.description.trim().length < 10) {
        toast({
          title: "Description Too Short",
          description: "Please provide at least 10 characters describing the changes needed.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for the RPC function
      const specificItemsArray = Array.from(selectedItems);
      
      // Call the RPC function
      const { data, error } = await supabase.rpc('request_quote_review', {
        p_quote_id: quote.id,
        p_category: formData.category,
        p_urgency: formData.urgency,
        p_description: formData.description.trim(),
        p_specific_items: specificItemsArray.length > 0 ? specificItemsArray : null,
        p_expected_changes: formData.expectedChanges?.trim() || null,
        p_budget_constraint: formData.budgetConstraint || null
      });

      if (error) {
        console.error('Review request error:', error);
        throw error;
      }

      if (data && !data.success) {
        throw new Error(data.message || 'Failed to submit review request');
      }

      toast({
        title: "Review Request Submitted",
        description: "We've received your feedback and will review your quote within 24-48 hours.",
      });

      resetForm();
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error submitting review request:', error);
      
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit review request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'pricing', label: 'Pricing Concerns', icon: 'DollarSign', description: 'Total cost, item prices, or fees' },
    { value: 'items', label: 'Item Issues', icon: 'Package', description: 'Wrong items, missing items, or modifications' },
    { value: 'shipping', label: 'Shipping Options', icon: 'Truck', description: 'Delivery speed, cost, or method' },
    { value: 'timeline', label: 'Delivery Timeline', icon: 'Clock', description: 'When you need items delivered' },
    { value: 'other', label: 'Other Concerns', icon: 'MessageCircle', description: 'Any other issues or questions' }
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Low Priority', color: 'bg-gray-100 text-gray-700', description: 'No rush, within a few days is fine' },
    { value: 'medium', label: 'Medium Priority', color: 'bg-blue-100 text-blue-700', description: 'Would like response within 24-48 hours' },
    { value: 'high', label: 'High Priority', color: 'bg-red-100 text-red-700', description: 'Urgent, need response ASAP' }
  ];

  const items = quote?.items || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <OptimizedIcon name="Edit" className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Request Quote Review</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Let us know what needs to be adjusted in your quote
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quote Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Quote #{quote?.quote_number || quote?.id?.slice(0, 8)}</h3>
              <Badge variant="outline">{quote?.status}</Badge>
            </div>
            <p className="text-sm text-gray-600">
              {items.length} item{items.length !== 1 ? 's' : ''} • Created {new Date(quote?.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">What needs reviewing?</Label>
            <div className="grid gap-3">
              {categoryOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    formData.category === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, category: option.value as any }))}
                >
                  <input
                    type="radio"
                    name="category"
                    checked={formData.category === option.value}
                    onChange={() => {}}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <OptimizedIcon name={option.icon} className="w-4 h-4" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency Level */}
          <div className="space-y-3">
            <Label className="text-base font-medium">How urgent is this?</Label>
            <div className="grid gap-2">
              {urgencyOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.urgency === option.value 
                      ? 'border-blue-500' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, urgency: option.value as any }))}
                >
                  <input
                    type="radio"
                    name="urgency"
                    checked={formData.urgency === option.value}
                    onChange={() => {}}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`${option.color} border-0`}>{option.label}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specific Items (if applicable) */}
          {(formData.category === 'items' || formData.category === 'pricing') && items.length > 1 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Which items are you concerned about? (optional)
              </Label>
              <div className="grid gap-2 max-h-32 overflow-y-auto">
                {items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-2 border rounded-lg">
                    <Checkbox
                      checked={selectedItems.has(item.id || index.toString())}
                      onCheckedChange={(checked) => 
                        handleItemToggle(item.id || index.toString(), checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        Qty: {item.quantity} • {Number(item.weight) || 0}kg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-3">
            <Label htmlFor="description" className="text-base font-medium">
              What specifically needs to be changed? *
            </Label>
            <Textarea
              id="description"
              placeholder="Please be as specific as possible about what you'd like us to review or change. For example: 'The shipping cost seems high - can you check for cheaper options?' or 'I need this delivered by Dec 15th instead.'"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {formData.description.length}/500 characters (minimum 10)
            </p>
          </div>

          {/* Expected Changes */}
          <div className="space-y-3">
            <Label htmlFor="expectedChanges" className="text-base font-medium">
              What outcome are you hoping for? (optional)
            </Label>
            <Textarea
              id="expectedChanges"
              placeholder="Example: 'Reduce total cost by $20' or 'Change delivery to express shipping' or 'Replace item X with item Y'"
              value={formData.expectedChanges}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedChanges: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Budget Constraint */}
          {formData.category === 'pricing' && (
            <div className="space-y-3">
              <Label htmlFor="budgetConstraint" className="text-base font-medium">
                Do you have a target budget? (optional)
              </Label>
              <div className="relative">
                <Input
                  id="budgetConstraint"
                  type="number"
                  placeholder="150.00"
                  value={formData.budgetConstraint || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    budgetConstraint: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  className="pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              </div>
              <p className="text-xs text-gray-500">
                This helps us understand your price expectations
              </p>
            </div>
          )}

          {/* Response Time Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <OptimizedIcon name="Clock" className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Response Time</p>
                <p className="text-sm text-blue-800">
                  We typically respond to review requests within 24-48 hours. 
                  High priority requests are handled first. You'll receive an email when we send the updated quote.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.description.trim() || formData.description.trim().length < 10}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <OptimizedIcon name="Send" className="w-4 h-4 mr-2" />
                Submit Review Request
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewRequestModal;