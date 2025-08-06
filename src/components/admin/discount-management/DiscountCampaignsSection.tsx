import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DiscountService, type DiscountCampaign } from '@/services/DiscountService';
import { Percent, TrendingUp, Gift, Users, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountStats {
  total_discounts_used: number;
  total_savings: number;
  active_campaigns: number;
  conversion_rate: number;
}

interface DiscountCampaignsSectionProps {
  campaigns: DiscountCampaign[];
  stats: DiscountStats | null;
  showInactive: boolean;
  selectedCampaigns: string[];
  onCampaignsChange: (campaigns: DiscountCampaign[]) => void;
  onShowInactiveChange: (show: boolean) => void;
  onSelectedCampaignsChange: (selected: string[]) => void;
  onCampaignEdit: (campaign: DiscountCampaign) => void;
  onCampaignView: (campaign: DiscountCampaign) => void;
}

export const DiscountCampaignsSection: React.FC<DiscountCampaignsSectionProps> = ({
  campaigns,
  stats,
  showInactive,
  selectedCampaigns,
  onCampaignsChange,
  onShowInactiveChange,
  onSelectedCampaignsChange,
  onCampaignEdit,
  onCampaignView,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDeleteCampaigns = async () => {
    if (!selectedCampaigns.length) return;
    
    try {
      const promises = selectedCampaigns.map(id => DiscountService.deleteCampaign(id));
      await Promise.all(promises);
      
      const updatedCampaigns = campaigns.filter(c => !selectedCampaigns.includes(c.id));
      onCampaignsChange(updatedCampaigns);
      onSelectedCampaignsChange([]);
      
      toast.success(`Deleted ${selectedCampaigns.length} campaign(s)`);
    } catch (error) {
      console.error('Error deleting campaigns:', error);
      toast.error('Failed to delete campaigns');
    }
  };

  const toggleCampaignActive = async (campaign: DiscountCampaign) => {
    try {
      const updatedCampaign = await DiscountService.toggleCampaignActive(campaign.id);
      const updatedCampaigns = campaigns.map(c => 
        c.id === campaign.id ? { ...c, is_active: updatedCampaign.is_active } : c
      );
      onCampaignsChange(updatedCampaigns);
      
      toast.success(`Campaign ${updatedCampaign.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => 
    showInactive || campaign.is_active
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts Used</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_discounts_used || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.total_savings || 0}</div>
            <p className="text-xs text-muted-foreground">
              Customer savings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_campaigns || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Quote to order conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discount Campaigns</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage promotional campaigns and their settings
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onShowInactiveChange(!showInactive)}
              >
                {showInactive ? 'Hide Inactive' : 'Show Inactive'}
              </Button>
              {selectedCampaigns.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteCampaigns}
                >
                  Delete Selected ({selectedCampaigns.length})
                </Button>
              )}
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Gift className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>
                      Set up a new discount campaign for your customers
                    </DialogDescription>
                  </DialogHeader>
                  {/* Campaign creation form would go here */}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No campaigns found. Create your first campaign to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCampaigns.map((campaign) => (
                  <div 
                    key={campaign.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.includes(campaign.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelectedCampaignsChange([...selectedCampaigns, campaign.id]);
                          } else {
                            onSelectedCampaignsChange(selectedCampaigns.filter(id => id !== campaign.id));
                          }
                        }}
                        className="rounded"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <Badge 
                            variant={campaign.is_active ? 'default' : 'secondary'}
                          >
                            {campaign.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {campaign.campaign_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {campaign.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Discount: {campaign.discount_value}%</span>
                          <span>Uses: {campaign.usage_count || 0}</span>
                          <span>
                            {campaign.start_date && (
                              `Starts: ${new Date(campaign.start_date).toLocaleDateString()}`
                            )}
                          </span>
                          <span>
                            {campaign.end_date && (
                              `Ends: ${new Date(campaign.end_date).toLocaleDateString()}`
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCampaignActive(campaign)}
                      >
                        {campaign.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCampaignView(campaign)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCampaignEdit(campaign)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onSelectedCampaignsChange([campaign.id]);
                          handleDeleteCampaigns();
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};