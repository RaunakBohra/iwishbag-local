import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { DiscountService, type DiscountCampaign, type DiscountCode } from '@/services/DiscountService';
import { Percent, Tag, Calendar, TrendingUp, Gift, Clock, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DiscountStats {
  total_discounts_used: number;
  total_savings: number;
  active_campaigns: number;
  conversion_rate: number;
}

export function DiscountManagementPanel() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [stats, setStats] = useState<DiscountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DiscountCampaign | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load campaigns
      const activeCampaigns = await DiscountService.getActiveCampaigns();
      setCampaigns(activeCampaigns);

      // Load discount codes
      const { data: codes, error: codesError } = await supabase
        .from('discount_codes')
        .select(`
          *,
          campaign:discount_campaigns(*),
          discount_type:discount_types(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!codesError && codes) {
        setDiscountCodes(codes);
      }

      // Calculate stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_discount_stats');
      
      if (!statsError && statsData) {
        setStats(statsData[0]);
      }

    } catch (error) {
      console.error('Error loading discount data:', error);
      toast.error('Failed to load discount data');
    } finally {
      setLoading(false);
    }
  };

  const renderCampaigns = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Total Discounts Used</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_discounts_used || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.total_savings || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Customer savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.conversion_rate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              With discounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discount Campaigns</CardTitle>
              <CardDescription>Manage automated and manual discount campaigns</CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Gift className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <Badge variant={campaign.auto_apply ? 'default' : 'secondary'}>
                      {campaign.auto_apply ? 'Auto-Apply' : 'Manual'}
                    </Badge>
                    <Badge variant="outline">
                      {campaign.campaign_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(campaign.start_date), 'MMM dd')} - {
                        campaign.end_date ? format(new Date(campaign.end_date), 'MMM dd') : 'Ongoing'
                      }
                    </span>
                    {campaign.usage_limit && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign.usage_count}/{campaign.usage_limit} used
                      </span>
                    )}
                    {campaign.discount_type && (
                      <Badge variant="outline">
                        {campaign.discount_type.type === 'percentage' 
                          ? `${campaign.discount_type.value}% off`
                          : `$${campaign.discount_type.value} off`
                        }
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={campaign.is_active}
                    onCheckedChange={async (checked) => {
                      // Update campaign status
                      const { error } = await supabase
                        .from('discount_campaigns')
                        .update({ is_active: checked })
                        .eq('id', campaign.id);
                      
                      if (!error) {
                        toast.success(`Campaign ${checked ? 'activated' : 'deactivated'}`);
                        loadData();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCodes = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Discount Codes</CardTitle>
            <CardDescription>Manage individual discount codes and coupons</CardDescription>
          </div>
          <CreateDiscountCodeDialog onSuccess={loadData} campaigns={campaigns} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Value</th>
                <th className="text-left p-4">Usage</th>
                <th className="text-left p-4">Valid Until</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {discountCodes.map((code) => (
                <tr key={code.id} className="border-b">
                  <td className="p-4">
                    <code className="font-mono font-semibold">{code.code}</code>
                  </td>
                  <td className="p-4">
                    {code.campaign?.name || 'Direct Code'}
                  </td>
                  <td className="p-4">
                    {code.discount_type?.type === 'percentage' 
                      ? `${code.discount_type.value}%`
                      : `$${code.discount_type.value}`
                    }
                  </td>
                  <td className="p-4">
                    {code.usage_count}/{code.usage_limit || '∞'}
                  </td>
                  <td className="p-4">
                    {code.valid_until 
                      ? format(new Date(code.valid_until), 'MMM dd, yyyy')
                      : 'No expiry'
                    }
                  </td>
                  <td className="p-4">
                    <Switch 
                      checked={code.is_active}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from('discount_codes')
                          .update({ is_active: checked })
                          .eq('id', code.id);
                        
                        if (!error) {
                          toast.success(`Code ${checked ? 'activated' : 'deactivated'}`);
                          loadData();
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Payment Method Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Discounts</CardTitle>
          <CardDescription>Configure automatic discounts for payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Bank Transfer</h4>
                <p className="text-sm text-muted-foreground">Automatic discount for bank transfers</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue="2" className="w-20" />
                  <span>%</span>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Wire Transfer</h4>
                <p className="text-sm text-muted-foreground">Automatic discount for wire transfers</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue="2" className="w-20" />
                  <span>%</span>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stacking Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Stacking Rules</CardTitle>
          <CardDescription>Configure how multiple discounts can be combined</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Maximum Stack Count</Label>
              <Input type="number" defaultValue="3" className="w-32" />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum number of discounts that can be applied together
              </p>
            </div>
            <div>
              <Label>Maximum Total Discount (%)</Label>
              <Input type="number" defaultValue="30" className="w-32" />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum combined discount percentage
              </p>
            </div>
            <div>
              <Label>Allowed Combinations</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  <span>Membership + Payment Method</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  <span>Membership + Campaign</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  <span>Payment Method + Campaign</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span>Multiple Campaigns</span>
                </label>
              </div>
            </div>
            <Button className="w-full">Save Stacking Rules</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Discount Management</h2>
        <p className="text-muted-foreground">
          Create and manage discounts, coupons, and promotional campaigns
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="codes">Discount Codes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {renderCampaigns()}
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          {renderCodes()}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {renderSettings()}
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          loadData();
          setCreateDialogOpen(false);
        }}
      />

      {/* Campaign Details Dialog */}
      {selectedCampaign && (
        <CampaignDetailsDialog
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onOpenChange={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
}

function CreateCampaignDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'manual',
    discount_type: 'percentage',
    discount_value: 10,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    auto_apply: false,
    target_membership: 'all',
    usage_limit: ''
  });

  const handleSubmit = async () => {
    try {
      // First create discount type
      const { data: discountType, error: typeError } = await supabase
        .from('discount_types')
        .insert({
          name: formData.name,
          code: formData.name.toUpperCase().replace(/\s+/g, '_'),
          type: formData.discount_type,
          value: formData.discount_value,
          conditions: {}
        })
        .select()
        .single();

      if (typeError) throw typeError;

      // Then create campaign
      const { error: campaignError } = await supabase
        .from('discount_campaigns')
        .insert({
          name: formData.name,
          description: formData.description,
          discount_type_id: discountType.id,
          campaign_type: formData.campaign_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          auto_apply: formData.auto_apply,
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          target_audience: formData.target_membership && formData.target_membership !== 'all' ? 
            { membership: [formData.target_membership] } : {},
          is_active: true,
          priority: 0
        });

      if (campaignError) throw campaignError;

      toast.success('Campaign created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Discount Campaign</DialogTitle>
          <DialogDescription>
            Set up a new discount campaign with automatic or manual application
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Campaign Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Summer Sale 2024"
            />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Special discount for summer season"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Campaign Type</Label>
              <Select 
                value={formData.campaign_type} 
                onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="time_based">Time Based</SelectItem>
                  <SelectItem value="user_triggered">User Triggered</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Audience</Label>
              <Select 
                value={formData.target_membership} 
                onValueChange={(value) => setFormData({ ...formData, target_membership: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  <SelectItem value="plus">Plus members only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Discount Type</Label>
              <Select 
                value={formData.discount_type} 
                onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Value</Label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label>Usage Limit</Label>
              <Input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-apply" className="flex items-center gap-2">
              Auto-apply this discount
              <span className="text-sm text-muted-foreground">
                (Automatically applies when conditions are met)
              </span>
            </Label>
            <Switch
              id="auto-apply"
              checked={formData.auto_apply}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_apply: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateDiscountCodeDialog({ onSuccess, campaigns }: {
  onSuccess: () => void;
  campaigns: DiscountCampaign[];
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSubmit = async () => {
    if (!code || !campaignId) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      const { error } = await supabase
        .from('discount_codes')
        .insert({
          code: code.toUpperCase(),
          campaign_id: campaignId,
          discount_type_id: campaign.discount_type_id,
          usage_limit: usageLimit ? parseInt(usageLimit) : null,
          valid_until: validUntil || null,
          is_active: true
        });

      if (error) throw error;

      toast.success('Discount code created');
      onSuccess();
      setOpen(false);
      setCode('');
      setCampaignId('');
      setUsageLimit('');
      setValidUntil('');
    } catch (error) {
      console.error('Error creating discount code:', error);
      toast.error('Failed to create discount code');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Tag className="mr-2 h-4 w-4" />
          Create Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Discount Code</DialogTitle>
          <DialogDescription>
            Generate a new discount code for customers
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Discount Code</Label>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SUMMER2024"
                className="uppercase"
              />
              <Button variant="outline" onClick={generateCode}>
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label>Campaign</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Usage Limit (Optional)</Label>
            <Input
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Unlimited"
            />
          </div>

          <div>
            <Label>Valid Until (Optional)</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignDetailsDialog({ campaign, open, onOpenChange }: {
  campaign: DiscountCampaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign.name}</DialogTitle>
          <DialogDescription>{campaign.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Campaign Type</p>
              <Badge>{campaign.campaign_type}</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Application</p>
              <Badge variant={campaign.auto_apply ? 'default' : 'secondary'}>
                {campaign.auto_apply ? 'Auto-Apply' : 'Manual'}
              </Badge>
            </div>
          </div>

          {campaign.discount_type && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Discount</p>
              <p className="text-2xl font-bold">
                {campaign.discount_type.type === 'percentage' 
                  ? `${campaign.discount_type.value}% off`
                  : `$${campaign.discount_type.value} off`
                }
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Duration</p>
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(campaign.start_date), 'MMM dd, yyyy')} - {
                campaign.end_date 
                  ? format(new Date(campaign.end_date), 'MMM dd, yyyy')
                  : 'Ongoing'
              }
            </p>
          </div>

          {campaign.usage_limit && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Usage</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{campaign.usage_count} / {campaign.usage_limit} used</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${(campaign.usage_count / campaign.usage_limit) * 100}%` }}
                />
              </div>
            </div>
          )}

          {campaign.target_audience && Object.keys(campaign.target_audience).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Target Audience</p>
              <div className="flex flex-wrap gap-2">
                {campaign.target_audience.membership?.map((m) => (
                  <Badge key={m} variant="outline">
                    {m} members
                  </Badge>
                ))}
                {campaign.target_audience.countries?.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {campaign.trigger_rules && Object.keys(campaign.trigger_rules).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Trigger Rules</p>
              <div className="p-3 bg-muted rounded-lg">
                <pre className="text-sm">
                  {JSON.stringify(campaign.trigger_rules, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}