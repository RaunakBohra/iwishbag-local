import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Edit2, Trash2, Plus, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DiscountTier {
  id: string;
  name: string;
  min_order_value: number;
  max_order_value?: number;
  discount_percentage: number;
  description?: string;
  is_active: boolean;
  tier_order: number;
  usage_count?: number;
  created_at: string;
}

interface TierManagementSectionProps {
  tiers: DiscountTier[];
  onCreateTier: () => void;
  onEditTier: (tier: DiscountTier) => void;
  onRefresh: () => void;
}

export const TierManagementSection: React.FC<TierManagementSectionProps> = ({
  tiers,
  onCreateTier,
  onEditTier,
  onRefresh
}) => {
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const sortedTiers = [...tiers].sort((a, b) => a.tier_order - b.tier_order);

  const handleSelectTier = (tierId: string, checked: boolean) => {
    if (checked) {
      setSelectedTiers([...selectedTiers, tierId]);
    } else {
      setSelectedTiers(selectedTiers.filter(id => id !== tierId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTiers(sortedTiers.map(t => t.id));
    } else {
      setSelectedTiers([]);
    }
  };

  const deleteTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this tier? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('discount_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;
      toast.success('Tier deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete tier');
    }
  };

  const bulkDeleteTiers = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTiers.length} tiers? This action cannot be undone.`)) {
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_tiers')
        .delete()
        .in('id', selectedTiers);
      
      if (error) throw error;
      toast.success(`${selectedTiers.length} tiers deleted`);
      setSelectedTiers([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete tiers');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkActivateTiers = async () => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_tiers')
        .update({ is_active: true })
        .in('id', selectedTiers);
      
      if (error) throw error;
      toast.success(`${selectedTiers.length} tiers activated`);
      setSelectedTiers([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to activate tiers');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const formatOrderRange = (tier: DiscountTier) => {
    const min = `$${tier.min_order_value.toLocaleString()}`;
    const max = tier.max_order_value ? `$${tier.max_order_value.toLocaleString()}` : '∞';
    return `${min} - ${max}`;
  };

  const getTierColor = (tier: DiscountTier) => {
    if (!tier.is_active) return 'secondary';
    if (tier.discount_percentage >= 20) return 'default';
    if (tier.discount_percentage >= 10) return 'outline';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Order Value Tiers</h3>
          <p className="text-sm text-gray-600">
            Configure discounts based on order value ranges
          </p>
        </div>
        <Button onClick={onCreateTier}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tier
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedTiers.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {selectedTiers.length} tier{selectedTiers.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={bulkActivateTiers}
                disabled={bulkActionLoading}
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={bulkDeleteTiers}
                disabled={bulkActionLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tiers grid */}
      <div className="grid gap-4">
        {sortedTiers.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No tiers configured</h3>
              <p className="text-sm">
                Create order value tiers to offer automatic discounts based on customer spending.
              </p>
            </div>
          </Card>
        ) : (
          sortedTiers.map((tier, index) => (
            <Card key={tier.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTiers.includes(tier.id)}
                      onChange={(e) => handleSelectTier(tier.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span>Tier {tier.tier_order}: {tier.name}</span>
                        <Badge variant={getTierColor(tier)}>
                          {tier.discount_percentage}%
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatOrderRange(tier)}
                        </Badge>
                        {!tier.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTier(tier)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTier(tier.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Description */}
                  {tier.description && (
                    <div>
                      <span className="text-gray-500 text-sm">Description:</span>
                      <p className="mt-1 text-sm">{tier.description}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Min Order:</span>
                      <div className="mt-1 flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 text-gray-400" />
                        <span className="font-mono">
                          {tier.min_order_value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Order:</span>
                      <div className="mt-1 flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 text-gray-400" />
                        <span className="font-mono">
                          {tier.max_order_value?.toLocaleString() || '∞'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Usage Count:</span>
                      <p className="mt-1 font-mono">
                        {tier.usage_count?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  {/* Visual tier indicator */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>Tier Priority: {tier.tier_order}</span>
                      <span>•</span>
                      <span>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Select all checkbox */}
      {sortedTiers.length > 0 && (
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            checked={selectedTiers.length === sortedTiers.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label className="text-sm text-gray-600">
            Select all {sortedTiers.length} tiers
          </label>
        </div>
      )}

      {/* Summary */}
      {sortedTiers.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span>Total Tiers: {sortedTiers.length}</span>
              </div>
              <div className="text-gray-500">
                Active: {sortedTiers.filter(t => t.is_active).length}
              </div>
              <div className="text-gray-500">
                Avg Discount: {(sortedTiers.reduce((sum, t) => sum + t.discount_percentage, 0) / sortedTiers.length).toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};