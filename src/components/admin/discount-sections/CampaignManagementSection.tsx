import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Edit2, Trash2, Plus, Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DiscountCampaign } from '@/services/DiscountService';

interface CampaignManagementSectionProps {
  campaigns: DiscountCampaign[];
  showInactive: boolean;
  setShowInactive: (show: boolean) => void;
  selectedCampaigns: string[];
  setSelectedCampaigns: (campaigns: string[]) => void;
  onCreateCampaign: () => void;
  onEditCampaign: (campaign: DiscountCampaign) => void;
  onViewDetails: (campaign: DiscountCampaign) => void;
  onRefresh: () => void;
}

export const CampaignManagementSection: React.FC<CampaignManagementSectionProps> = ({
  campaigns,
  showInactive,
  setShowInactive,
  selectedCampaigns,
  setSelectedCampaigns,
  onCreateCampaign,
  onEditCampaign,
  onViewDetails,
  onRefresh
}) => {
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const filteredCampaigns = showInactive 
    ? campaigns 
    : campaigns.filter(c => c.is_active);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id));
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns([...selectedCampaigns, campaignId]);
    } else {
      setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaignId));
    }
  };

  const bulkActivateCampaigns = async () => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .update({ is_active: true })
        .in('id', selectedCampaigns);
      
      if (error) throw error;
      toast.success(`${selectedCampaigns.length} campaigns activated`);
      setSelectedCampaigns([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to activate campaigns');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDeactivateCampaigns = async () => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .update({ is_active: false })
        .in('id', selectedCampaigns);
      
      if (error) throw error;
      toast.success(`${selectedCampaigns.length} campaigns deactivated`);
      setSelectedCampaigns([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to deactivate campaigns');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDeleteCampaigns = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCampaigns.length} campaigns? This action cannot be undone.`)) {
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .delete()
        .in('id', selectedCampaigns);
      
      if (error) throw error;
      toast.success(`${selectedCampaigns.length} campaigns deleted`);
      setSelectedCampaigns([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete campaigns');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      toast.success('Campaign deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label htmlFor="show-inactive" className="text-sm font-medium">
              Show inactive campaigns
            </label>
          </div>
          {selectedCampaigns.length > 0 && (
            <Badge variant="secondary">
              {selectedCampaigns.length} selected
            </Badge>
          )}
        </div>
        <Button onClick={onCreateCampaign}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedCampaigns.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Bulk Actions:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkActivateCampaigns}
              disabled={bulkActionLoading}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkDeactivateCampaigns}
              disabled={bulkActionLoading}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={bulkDeleteCampaigns}
              disabled={bulkActionLoading}
            >
              Delete
            </Button>
          </div>
        </Card>
      )}

      {/* Campaigns grid */}
      <div className="grid gap-4">
        {filteredCampaigns.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
              <p className="text-sm">
                {showInactive 
                  ? "No campaigns have been created yet." 
                  : "No active campaigns. Toggle 'Show inactive' to see all campaigns."}
              </p>
            </div>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(campaign.id)}
                      onChange={(e) => handleSelectCampaign(campaign.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={campaign.is_active ? "default" : "secondary"}>
                          {campaign.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {campaign.discount_type === 'percentage' ? `${campaign.discount_value}%` : `$${campaign.discount_value}`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(campaign)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditCampaign(campaign)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Description:</span>
                    <p className="mt-1 line-clamp-2">{campaign.description || 'No description'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Period:</span>
                    <div className="mt-1 flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span>
                        {format(new Date(campaign.start_date), 'MMM d')} - {' '}
                        {format(new Date(campaign.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                {campaign.usage_limit && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      Usage: {campaign.usage_count || 0} / {campaign.usage_limit}
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, ((campaign.usage_count || 0) / campaign.usage_limit) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Select all checkbox for multiple campaigns */}
      {filteredCampaigns.length > 0 && (
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            checked={selectedCampaigns.length === filteredCampaigns.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label className="text-sm text-gray-600">
            Select all {filteredCampaigns.length} campaigns
          </label>
        </div>
      )}
    </div>
  );
};