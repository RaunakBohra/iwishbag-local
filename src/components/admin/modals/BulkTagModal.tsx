// ============================================================================
// BULK TAG MODAL - Professional Customer Tagging System
// Features: Add/remove tags from multiple customers simultaneously
// ============================================================================

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, X, Users, Hash } from 'lucide-react';
import { Customer } from '@/types/customer';

interface BulkTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomers: Customer[];
}

const PREDEFINED_TAGS = [
  'VIP',
  'High Value',
  'Frequent Buyer',
  'New Customer',
  'International',
  'Bulk Orders',
  'COD Preferred',
  'Express Shipping',
  'Wholesale',
  'Corporate',
  'Influencer',
  'Return Customer',
];

export const BulkTagModal: React.FC<BulkTagModalProps> = ({
  open,
  onOpenChange,
  selectedCustomers,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply tags mutation
  const applyTagsMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);

      const updates = selectedCustomers.map(async (customer) => {
        const currentTags = customer.tags || '';
        let updatedTags = currentTags;

        if (action === 'add') {
          // Add new tags (avoid duplicates)
          const existingTags = currentTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
          const newTags = selectedTags.filter((tag) => !existingTags.includes(tag));
          if (newTags.length > 0) {
            updatedTags = [...existingTags, ...newTags].join(', ');
          }
        } else {
          // Remove tags
          const existingTags = currentTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
          const remainingTags = existingTags.filter((tag) => !selectedTags.includes(tag));
          updatedTags = remainingTags.join(', ');
        }

        const { error } = await supabase
          .from('profiles')
          .update({ tags: updatedTags || null })
          .eq('id', customer.id);

        if (error) throw error;
        return customer.id;
      });

      return Promise.all(updates);
    },
    onSuccess: () => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: `Tags ${action === 'add' ? 'Added' : 'Removed'} Successfully`,
        description: `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} ${action === 'add' ? 'added to' : 'removed from'} ${selectedCustomers.length} customer${selectedCustomers.length !== 1 ? 's' : ''}`,
      });
      setSelectedTags([]);
      setCustomTag('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: 'Failed to Apply Tags',
        description: error.message || 'An error occurred while updating customer tags.',
        variant: 'destructive',
      });
    },
  });

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    if (selectedTags.length === 0) {
      toast({
        title: 'No Tags Selected',
        description: 'Please select at least one tag to apply.',
        variant: 'destructive',
      });
      return;
    }
    applyTagsMutation.mutate();
  };

  const handleClose = () => {
    setSelectedTags([]);
    setCustomTag('');
    setAction('add');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Tag className="h-4 w-4 text-purple-600" />
            </div>
            <span>Bulk Tag Management</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Customers Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}{' '}
                Selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedCustomers.slice(0, 5).map((customer) => (
                <Badge key={customer.id} variant="outline" className="text-xs bg-white">
                  {customer.full_name || customer.email}
                </Badge>
              ))}
              {selectedCustomers.length > 5 && (
                <Badge variant="outline" className="text-xs bg-white">
                  +{selectedCustomers.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          {/* Action Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Action</Label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox checked={action === 'add'} onCheckedChange={() => setAction('add')} />
                <span className="text-sm">Add Tags</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={action === 'remove'}
                  onCheckedChange={() => setAction('remove')}
                />
                <span className="text-sm">Remove Tags</span>
              </label>
            </div>
          </div>

          {/* Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Tags ({selectedTags.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 pr-1"
                  >
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTag(tag)}
                      className="h-4 w-4 p-0 ml-1 hover:bg-purple-200"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Custom Tag Input */}
          <div className="space-y-2">
            <Label htmlFor="customTag" className="text-sm font-medium">
              Add Custom Tag
            </Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="customTag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Enter custom tag"
                  className="pl-10"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Predefined Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Predefined Tags</Label>
            <div className="grid grid-cols-2 gap-2">
              {PREDEFINED_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <span className="text-sm">{tag}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedTags.length === 0}
            className={
              action === 'add' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700'
            }
          >
            {isSubmitting
              ? `${action === 'add' ? 'Adding' : 'Removing'} Tags...`
              : `${action === 'add' ? 'Add' : 'Remove'} ${selectedTags.length} Tag${selectedTags.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
