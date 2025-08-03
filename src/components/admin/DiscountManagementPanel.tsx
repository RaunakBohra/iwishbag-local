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
import { Percent, Tag, Calendar, TrendingUp, Gift, Clock, DollarSign, Users, Edit2, Trash2, Globe, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DiscountStats {
  total_discounts_used: number;
  total_savings: number;
  active_campaigns: number;
  conversion_rate: number;
}

interface CountryDiscountRule {
  id: string;
  discount_type_id: string;
  country_code: string;
  component_discounts: { [component: string]: number };
  min_order_amount?: number;
  max_uses_per_customer?: number;
  requires_code?: boolean;
  auto_apply?: boolean;
  description?: string;
  priority?: number;
  discount_conditions?: any;
  created_at: string;
  discount_type?: {
    id: string;
    name: string;
    code: string;
    type: string;
    value: number;
  };
}

interface DiscountTier {
  id: string;
  discount_type_id: string;
  min_order_value: number;
  max_order_value?: number;
  discount_value: number;
  applicable_components: string[];
  description?: string;
  priority?: number;
  usage_count?: number;
  total_savings?: number;
  avg_order_value?: number;
  last_used_at?: string;
  created_at: string;
}

interface CustomerDiscountUsage {
  id: string;
  customer_id: string;
  discount_code_id?: string;
  campaign_id?: string;
  quote_id?: string;
  order_id?: string;
  discount_amount: number;
  original_amount?: number;
  currency?: string;
  component_breakdown?: { [component: string]: number };
  components_discounted?: string[];
  used_at: string;
}

export function DiscountManagementPanel() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [countryRules, setCountryRules] = useState<CountryDiscountRule[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [usageAnalytics, setUsageAnalytics] = useState<CustomerDiscountUsage[]>([]);
  const [stats, setStats] = useState<DiscountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DiscountCampaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<DiscountCampaign | null>(null);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [editingCountryRule, setEditingCountryRule] = useState<CountryDiscountRule | null>(null);
  const [editingDiscountTier, setEditingDiscountTier] = useState<DiscountTier | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [paymentDiscounts, setPaymentDiscounts] = useState({
    bank_transfer: { percentage: 2, is_active: true },
    wire_transfer: { percentage: 2, is_active: true }
  });
  const [stackingRules, setStackingRules] = useState({
    max_stack_count: 3,
    max_total_discount_percentage: 30,
    allowed_combinations: ['membership', 'payment_method', 'campaign']
  });

  useEffect(() => {
    loadData();
  }, []);

  // Bulk operations functions
  const bulkActivateCampaigns = async () => {
    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .update({ is_active: true })
        .in('id', selectedCampaigns);
      
      if (error) throw error;
      toast.success(`${selectedCampaigns.length} campaigns activated`);
      setSelectedCampaigns([]);
      loadData();
    } catch (error) {
      toast.error('Failed to activate campaigns');
    }
  };

  const bulkDeactivateCampaigns = async () => {
    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .update({ is_active: false })
        .in('id', selectedCampaigns);
      
      if (error) throw error;
      toast.success(`${selectedCampaigns.length} campaigns deactivated`);
      setSelectedCampaigns([]);
      loadData();
    } catch (error) {
      toast.error('Failed to deactivate campaigns');
    }
  };

  const bulkDeleteCampaigns = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCampaigns.length} campaigns? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .delete()
        .in('id', selectedCampaigns);
      
      if (error) throw error;
      toast.success(`${selectedCampaigns.length} campaigns deleted`);
      setSelectedCampaigns([]);
      loadData();
    } catch (error) {
      toast.error('Failed to delete campaigns');
    }
  };

  const bulkActivateCodes = async () => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: true })
        .in('id', selectedCodes);
      
      if (error) throw error;
      toast.success(`${selectedCodes.length} codes activated`);
      setSelectedCodes([]);
      loadData();
    } catch (error) {
      toast.error('Failed to activate codes');
    }
  };

  const bulkDeactivateCodes = async () => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: false })
        .in('id', selectedCodes);
      
      if (error) throw error;
      toast.success(`${selectedCodes.length} codes deactivated`);
      setSelectedCodes([]);
      loadData();
    } catch (error) {
      toast.error('Failed to deactivate codes');
    }
  };

  const bulkDeleteCodes = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCodes.length} codes? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .in('id', selectedCodes);
      
      if (error) throw error;
      toast.success(`${selectedCodes.length} codes deleted`);
      setSelectedCodes([]);
      loadData();
    } catch (error) {
      toast.error('Failed to delete codes');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Clear cache to ensure fresh data
      DiscountService.getInstance().clearCache();

      // Load all campaigns (both active and inactive)
      const allCampaigns = await DiscountService.getInstance().getAllCampaigns();
      setCampaigns(allCampaigns);

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

      // Load country discount rules
      const { data: countryRulesData, error: countryRulesError } = await supabase
        .from('country_discount_rules')
        .select(`
          *,
          discount_type:discount_types(*)
        `)
        .order('created_at', { ascending: false });

      if (!countryRulesError && countryRulesData) {
        setCountryRules(countryRulesData);
      }

      // Load discount tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('discount_tiers')
        .select('*')
        .order('min_order_value', { ascending: true });

      if (!tiersError && tiersData) {
        setDiscountTiers(tiersData);
      }

      // Load customer discount usage analytics (last 100 records)
      const { data: usageData, error: usageError } = await supabase
        .from('customer_discount_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(100);

      if (!usageError && usageData) {
        setUsageAnalytics(usageData);
      }

      // Load payment method discounts
      const { data: paymentMethodData, error: paymentError } = await supabase
        .from('payment_method_discounts')
        .select('*')
        .eq('is_active', true);

      if (!paymentError && paymentMethodData) {
        const paymentDiscountsMap = paymentMethodData.reduce((acc, item) => {
          acc[item.payment_method] = {
            percentage: item.discount_percentage,
            is_active: item.is_active
          };
          return acc;
        }, {} as any);
        setPaymentDiscounts(paymentDiscountsMap);
      }

      // Load discount stacking rules
      const { data: stackingRulesData, error: stackingError } = await supabase
        .from('discount_stacking_rules')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!stackingError && stackingRulesData) {
        // Handle allowed_combinations which might be an object or array
        let allowedCombinations = ['membership', 'payment_method', 'campaign']; // default
        if (stackingRulesData.allowed_combinations) {
          if (Array.isArray(stackingRulesData.allowed_combinations)) {
            allowedCombinations = stackingRulesData.allowed_combinations;
          } else if (typeof stackingRulesData.allowed_combinations === 'object') {
            // Convert object to array based on true values
            allowedCombinations = Object.entries(stackingRulesData.allowed_combinations)
              .filter(([key, value]) => value === true)
              .map(([key]) => key);
          }
        }
        
        setStackingRules({
          max_stack_count: stackingRulesData.max_stack_count || 3,
          max_total_discount_percentage: stackingRulesData.max_total_discount_percentage || 30,
          allowed_combinations: allowedCombinations
        });
      }

      // Get discount statistics using RPC function
      try {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_discount_stats');

        if (!statsError && statsData && statsData.length > 0) {
          const stat = statsData[0];
          setStats({
            total_discounts_used: Number(stat.total_discounts_used) || 0,
            total_savings: Number(stat.total_savings) || 0,
            active_campaigns: Number(stat.active_campaigns) || 0,
            conversion_rate: Number(stat.conversion_rate) || 0
          });
        } else {
          console.warn('Could not fetch discount stats:', statsError);
          // Set default stats
          setStats({
            total_discounts_used: 0,
            total_savings: 0,
            active_campaigns: campaigns.length,
            conversion_rate: 0
          });
        }
      } catch (error) {
        console.error('Error fetching discount stats:', error);
        // Set default stats
        setStats({
          total_discounts_used: 0,
          total_savings: 0,
          active_campaigns: campaigns.length,
          conversion_rate: 0
        });
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive" className="text-sm">
                  Show inactive
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCampaigns.length === campaigns.filter(c => showInactive || c.is_active).length && campaigns.length > 0}
                  onChange={(e) => {
                    const visibleCampaigns = campaigns.filter(c => showInactive || c.is_active);
                    if (e.target.checked) {
                      setSelectedCampaigns(visibleCampaigns.map(c => c.id));
                    } else {
                      setSelectedCampaigns([]);
                    }
                  }}
                />
                <Label className="text-sm">Select All</Label>
              </div>
              {selectedCampaigns.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedCampaigns.length} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={bulkActivateCampaigns}>
                    Activate
                  </Button>
                  <Button variant="outline" size="sm" onClick={bulkDeactivateCampaigns}>
                    Deactivate
                  </Button>
                  <Button variant="outline" size="sm" onClick={bulkDeleteCampaigns} className="text-red-600 hover:text-red-700">
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCampaigns([])}>
                    Clear
                  </Button>
                </div>
              )}
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Gift className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns
              .filter(campaign => showInactive || campaign.is_active)
              .map((campaign) => (
              <div key={campaign.id} className={!campaign.is_active ? 'flex items-center justify-between p-4 border rounded-lg opacity-60' : 'flex items-center justify-between p-4 border rounded-lg'}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                      } else {
                        setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    {!campaign.is_active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
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
                      {format(new Date(campaign.start_date), 'MMM dd')} - {campaign.end_date ? format(new Date(campaign.end_date), 'MMM dd') : 'Ongoing'}
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
                          ? `${campaign.discount_type.value || 0}% off`
                          : `$${campaign.discount_type.value || 0} off`
                        }
                      </Badge>
                    )}
                    {campaign.discount_type?.applicable_components && campaign.discount_type.applicable_components.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Applies to: {campaign.discount_type.applicable_components.join(', ')}
                      </span>
                    )}
                  </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Set campaign for editing
                      setEditingCampaign(campaign);
                      setCreateDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this campaign?')) {
                        const { error } = await supabase
                          .from('discount_campaigns')
                          .delete()
                          .eq('id', campaign.id);
                        
                        if (!error) {
                          toast.success('Campaign deleted');
                          loadData();
                        } else {
                          toast.error('Failed to delete campaign');
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
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
          <div className="flex items-center gap-4">
            {selectedCodes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedCodes.length} selected
                </span>
                <Button variant="outline" size="sm" onClick={bulkActivateCodes}>
                  Activate
                </Button>
                <Button variant="outline" size="sm" onClick={bulkDeactivateCodes}>
                  Deactivate
                </Button>
                <Button variant="outline" size="sm" onClick={bulkDeleteCodes} className="text-red-600 hover:text-red-700">
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCodes([])}>
                  Clear
                </Button>
              </div>
            )}
            <CreateDiscountCodeDialog onSuccess={loadData} campaigns={campaigns} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectedCodes.length === discountCodes.length && discountCodes.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCodes(discountCodes.map(code => code.id));
                      } else {
                        setSelectedCodes([]);
                      }
                    }}
                  />
                </th>
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Value</th>
                <th className="text-left p-4">Usage</th>
                <th className="text-left p-4">Valid Until</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discountCodes.map((code) => (
                <tr key={code.id} className="border-b">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(code.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCodes([...selectedCodes, code.id]);
                        } else {
                          setSelectedCodes(selectedCodes.filter(id => id !== code.id));
                        }
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <code className="font-mono font-semibold">{code.code}</code>
                  </td>
                  <td className="p-4">
                    {code.campaign?.name || 'Direct Code'}
                  </td>
                  <td className="p-4">
                    {code.discount_type?.type === 'percentage' 
                      ? `${code.discount_type?.value || 0}%`
                      : `$${code.discount_type?.value || 0}`
                    }
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div>{code.usage_count}/{code.usage_limit || '∞'}</div>
                      <div className="text-xs text-muted-foreground">
                        Max {code.usage_per_customer || 1}/customer
                      </div>
                    </div>
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
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCode(code);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this discount code?')) {
                            const { error } = await supabase
                              .from('discount_codes')
                              .delete()
                              .eq('id', code.id);
                            
                            if (!error) {
                              toast.success('Discount code deleted');
                              loadData();
                            } else {
                              toast.error('Failed to delete discount code');
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const savePaymentDiscounts = async () => {
    try {
      // Delete existing records first
      await supabase
        .from('payment_method_discounts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      // Insert new records
      const records = Object.entries(paymentDiscounts).map(([method, config]) => ({
        payment_method: method,
        discount_percentage: config.percentage,
        is_active: config.is_active
      }));

      const { error } = await supabase
        .from('payment_method_discounts')
        .insert(records);

      if (error) throw error;

      toast.success('Payment method discounts saved');
    } catch (error) {
      console.error('Error saving payment discounts:', error);
      toast.error('Failed to save payment method discounts');
    }
  };

  const saveStackingRules = async () => {
    try {
      // Deactivate existing rules
      await supabase
        .from('discount_stacking_rules')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new rule
      const { error } = await supabase
        .from('discount_stacking_rules')
        .insert({
          max_stack_count: stackingRules.max_stack_count,
          max_total_discount_percentage: stackingRules.max_total_discount_percentage,
          allowed_combinations: stackingRules.allowed_combinations,
          priority: 100,
          is_active: true
        });

      if (error) throw error;

      toast.success('Stacking rules saved');
    } catch (error) {
      console.error('Error saving stacking rules:', error);
      toast.error('Failed to save stacking rules');
    }
  };

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
            {Object.entries(paymentDiscounts).map(([method, config]) => (
              <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium capitalize">{method.replace('_', ' ')}</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatic discount for {method.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={config.percentage} 
                      onChange={(e) => setPaymentDiscounts(prev => ({
                        ...prev,
                        [method]: { ...prev[method], percentage: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-20" 
                    />
                    <span>%</span>
                  </div>
                  <Switch 
                    checked={config.is_active}
                    onCheckedChange={(checked) => setPaymentDiscounts(prev => ({
                      ...prev,
                      [method]: { ...prev[method], is_active: checked }
                    }))}
                  />
                </div>
              </div>
            ))}
            <Button onClick={savePaymentDiscounts} className="w-full">
              Save Payment Method Discounts
            </Button>
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
              <Input 
                type="number" 
                value={stackingRules.max_stack_count}
                onChange={(e) => setStackingRules(prev => ({
                  ...prev,
                  max_stack_count: parseInt(e.target.value) || 3
                }))}
                className="w-32" 
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum number of discounts that can be applied together
              </p>
            </div>
            <div>
              <Label>Maximum Total Discount (%)</Label>
              <Input 
                type="number" 
                value={stackingRules.max_total_discount_percentage}
                onChange={(e) => setStackingRules(prev => ({
                  ...prev,
                  max_total_discount_percentage: parseInt(e.target.value) || 30
                }))}
                className="w-32" 
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum combined discount percentage
              </p>
            </div>
            <div>
              <Label>Allowed Combinations</Label>
              <div className="space-y-2 mt-2">
                {[
                  { value: 'membership', label: 'Membership + Payment Method' },
                  { value: 'payment_method', label: 'Membership + Campaign' },
                  { value: 'campaign', label: 'Payment Method + Campaign' },
                  { value: 'multiple_campaigns', label: 'Multiple Campaigns' }
                ].map((combination) => (
                  <label key={combination.value} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={Array.isArray(stackingRules.allowed_combinations) && stackingRules.allowed_combinations.includes(combination.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setStackingRules(prev => ({
                            ...prev,
                            allowed_combinations: Array.isArray(prev.allowed_combinations) 
                              ? [...prev.allowed_combinations, combination.value]
                              : [combination.value]
                          }));
                        } else {
                          setStackingRules(prev => ({
                            ...prev,
                            allowed_combinations: Array.isArray(prev.allowed_combinations)
                              ? prev.allowed_combinations.filter(c => c !== combination.value)
                              : []
                          }));
                        }
                      }}
                    />
                    <span>{combination.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={saveStackingRules} className="w-full">
              Save Stacking Rules
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCountryRules = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Country-Specific Discount Rules</CardTitle>
            <CardDescription>Manage component-specific discounts for different countries</CardDescription>
          </div>
          <CreateCountryRuleDialog onSuccess={loadData} campaigns={campaigns} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Country</th>
                <th className="text-left p-4">Discount Type</th>
                <th className="text-left p-4">Component Discounts</th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">Application</th>
                <th className="text-left p-4">Priority</th>
                <th className="text-left p-4">Min Order</th>
                <th className="text-left p-4">Max Uses</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {countryRules.map((rule) => (
                <tr key={rule.id} className="border-b">
                  <td className="p-4">
                    <Badge variant="outline">{rule.country_code}</Badge>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{rule.discount_type?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{rule.discount_type?.code}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {Object.entries(rule.component_discounts).map(([component, value]) => (
                        <div key={component} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {component}
                          </Badge>
                          <span className="text-sm font-medium">
                            {typeof value === 'object' && value !== null ? 
                              (value.percentage || Object.values(value)[0] || 0) : 
                              (value || 0)
                            }%
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-muted-foreground max-w-48 truncate">
                      {rule.description || 'No description'}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <Badge variant={rule.auto_apply ? 'default' : 'outline'} className="text-xs">
                        {rule.auto_apply ? 'Auto-Apply' : 'Code Required'}
                      </Badge>
                      {rule.requires_code && (
                        <Badge variant="secondary" className="text-xs">
                          Code: {rule.requires_code ? 'Yes' : 'No'}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs">
                      {rule.priority || 0}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {rule.min_order_amount ? `$${rule.min_order_amount}` : 'No minimum'}
                  </td>
                  <td className="p-4">
                    {rule.max_uses_per_customer || 'Unlimited'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCountryRule(rule);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this country rule?')) {
                            const { error } = await supabase
                              .from('country_discount_rules')
                              .delete()
                              .eq('id', rule.id);
                            
                            if (!error) {
                              toast.success('Country rule deleted');
                              loadData();
                            } else {
                              toast.error('Failed to delete country rule');
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderDiscountTiers = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Volume Discount Tiers</CardTitle>
            <CardDescription>Manage tiered discounts based on order value</CardDescription>
          </div>
          <CreateDiscountTierDialog onSuccess={loadData} campaigns={campaigns} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Order Range</th>
                <th className="text-left p-4">Discount Value</th>
                <th className="text-left p-4">Applicable Components</th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">Analytics</th>
                <th className="text-left p-4">Priority</th>
                <th className="text-left p-4">Created</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discountTiers.map((tier) => (
                <tr key={tier.id} className="border-b">
                  <td className="p-4">
                    <div className="font-medium">
                      ${tier.min_order_value}+
                      {tier.max_order_value && ` - $${tier.max_order_value}`}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">{tier.discount_value}%</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {tier.applicable_components.map((component) => (
                        <Badge key={component} variant="secondary" className="text-xs">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-600">
                      {tier.description || 'No description'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1 text-sm">
                      <div className="text-green-600 font-medium">
                        {tier.usage_count || 0} uses
                      </div>
                      {tier.total_savings && tier.total_savings > 0 && (
                        <div className="text-blue-600">
                          ${(tier.total_savings || 0).toFixed(2)} saved
                        </div>
                      )}
                      {tier.avg_order_value && tier.avg_order_value > 0 && (
                        <div className="text-purple-600">
                          Avg: ${tier.avg_order_value.toFixed(2)}
                        </div>
                      )}
                      {tier.last_used_at && (
                        <div className="text-gray-500 text-xs">
                          Last: {format(new Date(tier.last_used_at), 'MMM dd')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="text-xs">
                      {tier.priority || 100}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {format(new Date(tier.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDiscountTier(tier);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this discount tier?')) {
                            const { error } = await supabase
                              .from('discount_tiers')
                              .delete()
                              .eq('id', tier.id);
                            
                            if (!error) {
                              toast.success('Discount tier deleted');
                              loadData();
                            } else {
                              toast.error('Failed to delete discount tier');
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderUsageAnalytics = () => (
    <div className="space-y-6">
      {/* Usage Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageAnalytics.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 100 records
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
              ${usageAnalytics.reduce((sum, usage) => sum + usage.discount_amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Customer savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Discount</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${usageAnalytics.length > 0 ? (usageAnalytics.reduce((sum, usage) => sum + usage.discount_amount, 0) / usageAnalytics.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageAnalytics.filter(u => new Date(u.used_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Discount Usage History</CardTitle>
          <CardDescription>Recent discount usage with component-level breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Discount Amount</th>
                  <th className="text-left p-4">Components</th>
                  <th className="text-left p-4">Quote/Order</th>
                  <th className="text-left p-4">Used At</th>
                </tr>
              </thead>
              <tbody>
                {usageAnalytics.slice(0, 20).map((usage) => (
                  <tr key={usage.id} className="border-b">
                    <td className="p-4">
                      <code className="text-xs">{usage.customer_id.slice(0, 8)}...</code>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-green-600">
                        ${usage.discount_amount.toFixed(2)}
                      </span>
                      {usage.original_amount && (
                        <div className="text-xs text-muted-foreground">
                          from ${usage.original_amount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {usage.components_discounted && usage.components_discounted.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {usage.components_discounted.map((component) => (
                            <Badge key={component} variant="secondary" className="text-xs">
                              {component}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {usage.quote_id && (
                        <code className="text-xs">{usage.quote_id.slice(0, 8)}...</code>
                      )}
                      {usage.order_id && (
                        <code className="text-xs">{usage.order_id.slice(0, 8)}...</code>
                      )}
                      {!usage.quote_id && !usage.order_id && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {format(new Date(usage.used_at), 'MMM dd, HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <TabsTrigger value="country-rules">Country Rules</TabsTrigger>
          <TabsTrigger value="discount-tiers">Volume Tiers</TabsTrigger>
          <TabsTrigger value="usage-analytics">Usage Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {renderCampaigns()}
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          {renderCodes()}
        </TabsContent>

        <TabsContent value="country-rules" className="space-y-4">
          {renderCountryRules()}
        </TabsContent>

        <TabsContent value="discount-tiers" className="space-y-4">
          {renderDiscountTiers()}
        </TabsContent>

        <TabsContent value="usage-analytics" className="space-y-4">
          {renderUsageAnalytics()}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {renderSettings()}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Campaign Dialog */}
      <CreateCampaignDialog 
        open={createDialogOpen} 
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingCampaign(null);
        }}
        onSuccess={() => {
          loadData();
          setCreateDialogOpen(false);
          setEditingCampaign(null);
        }}
        editingCampaign={editingCampaign}
      />

      {/* Campaign Details Dialog */}
      {selectedCampaign && (
        <CampaignDetailsDialog
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onOpenChange={() => setSelectedCampaign(null)}
        />
      )}

      {/* Edit Discount Code Dialog */}
      {editingCode && (
        <EditDiscountCodeDialog
          code={editingCode}
          open={!!editingCode}
          onOpenChange={() => setEditingCode(null)}
          onSuccess={() => {
            loadData();
            setEditingCode(null);
          }}
        />
      )}

      {/* Edit Country Rule Dialog */}
      {editingCountryRule && (
        <EditCountryRuleDialog
          rule={editingCountryRule}
          campaigns={campaigns}
          open={!!editingCountryRule}
          onOpenChange={() => setEditingCountryRule(null)}
          onSuccess={() => {
            loadData();
            setEditingCountryRule(null);
          }}
        />
      )}

      {/* Edit Discount Tier Dialog */}
      {editingDiscountTier && (
        <EditDiscountTierDialog
          tier={editingDiscountTier}
          campaigns={campaigns}
          open={!!editingDiscountTier}
          onOpenChange={() => setEditingDiscountTier(null)}
          onSuccess={() => {
            loadData();
            setEditingDiscountTier(null);
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignDialog({ open, onOpenChange, onSuccess, editingCampaign }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingCampaign?: DiscountCampaign | null;
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
    target_countries: [] as string[],
    usage_limit: '',
    applicable_components: ['total'] as string[],
    min_order: '',
    max_discount: '',
    priority: '100',
    trigger_rules: {
      happy_hour: {
        enabled: false,
        days: [] as number[],
        hours: [] as number[]
      },
      birthday: false
    }
  });

  useEffect(() => {
    if (editingCampaign) {
      setFormData({
        name: editingCampaign.name,
        description: editingCampaign.description || '',
        campaign_type: editingCampaign.campaign_type,
        discount_type: editingCampaign.discount_type?.type || 'percentage',
        discount_value: editingCampaign.discount_type?.value || 10,
        start_date: format(new Date(editingCampaign.start_date), 'yyyy-MM-dd'),
        end_date: editingCampaign.end_date ? format(new Date(editingCampaign.end_date), 'yyyy-MM-dd') : '',
        auto_apply: editingCampaign.auto_apply,
        target_membership: editingCampaign.target_audience?.membership?.[0] || 'all',
        target_countries: editingCampaign.target_audience?.countries || [],
        usage_limit: editingCampaign.usage_limit?.toString() || '',
        applicable_components: editingCampaign.discount_type?.applicable_components || ['total'],
        min_order: editingCampaign.discount_type?.conditions?.min_order?.toString() || '',
        max_discount: editingCampaign.discount_type?.conditions?.max_discount?.toString() || '',
        priority: editingCampaign.priority?.toString() || '100',
        trigger_rules: {
          happy_hour: {
            enabled: !!editingCampaign.trigger_rules?.happy_hour,
            days: editingCampaign.trigger_rules?.happy_hour?.days || [],
            hours: editingCampaign.trigger_rules?.happy_hour?.hours || []
          },
          birthday: !!editingCampaign.trigger_rules?.birthday
        }
      });
    } else {
      // Reset form when not editing
      setFormData({
        name: '',
        description: '',
        campaign_type: 'manual',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        auto_apply: false,
        target_membership: 'all',
        target_countries: [] as string[],
        usage_limit: '',
        applicable_components: ['total'],
        min_order: '',
        max_discount: '',
        priority: '100',
        trigger_rules: {
          happy_hour: {
            enabled: false,
            days: [] as number[],
            hours: [] as number[]
          },
          birthday: false
        }
      });
    }
  }, [editingCampaign]);

  const handleSubmit = async () => {
    try {
      if (editingCampaign) {
        // Update existing campaign
        // First update discount type if it exists
        if (editingCampaign.discount_type_id) {
          const { error: typeError } = await supabase
            .from('discount_types')
            .update({
              name: formData.name,
              type: formData.discount_type,
              value: formData.discount_value,
              applicable_components: formData.applicable_components,
              conditions: {
                min_order: formData.min_order ? parseFloat(formData.min_order) : null,
                max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
                applicable_to: formData.applicable_components[0] || 'total',
                stacking_allowed: true
              }
            })
            .eq('id', editingCampaign.discount_type_id);

          if (typeError) throw typeError;
        }

        // Then update campaign
        const { error: campaignError } = await supabase
          .from('discount_campaigns')
          .update({
            name: formData.name,
            description: formData.description,
            campaign_type: formData.campaign_type,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            auto_apply: formData.auto_apply,
            usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
            target_audience: {
              ...(formData.target_membership && formData.target_membership !== 'all' && {
                membership: [formData.target_membership]
              }),
              ...(formData.target_countries.length > 0 && {
                countries: formData.target_countries
              })
            },
          })
          .eq('id', editingCampaign.id);

        if (campaignError) throw campaignError;

        toast.success('Campaign updated successfully');
      } else {
        // Create new campaign
        // First create discount type
        const { data: discountType, error: typeError } = await supabase
          .from('discount_types')
          .insert({
            name: formData.name,
            code: formData.name.toUpperCase().replace(/\s+/g, '_'),
            type: formData.discount_type,
            value: formData.discount_value,
            conditions: {
              min_order: formData.min_order ? parseFloat(formData.min_order) : null,
              max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
              applicable_to: formData.applicable_components[0] || 'total',
              stacking_allowed: true
            },
            applicable_components: formData.applicable_components,
            priority: parseInt(formData.priority) || 100
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
            target_audience: {
              ...(formData.target_membership && formData.target_membership !== 'all' && {
                membership: [formData.target_membership]
              }),
              ...(formData.target_countries.length > 0 && {
                countries: formData.target_countries
              })
            },
            is_active: true,
            priority: parseInt(formData.priority) || 100,
            trigger_rules: (formData.trigger_rules.happy_hour.enabled || formData.trigger_rules.birthday) ? {
              ...(formData.trigger_rules.happy_hour.enabled && {
                happy_hour: {
                  days: formData.trigger_rules.happy_hour.days,
                  hours: formData.trigger_rules.happy_hour.hours
                }
              }),
              ...(formData.trigger_rules.birthday && { birthday: true })
            } : null
          });

        if (campaignError) throw campaignError;

        toast.success('Campaign created successfully');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(`Failed to ${editingCampaign ? 'update' : 'create'} campaign`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingCampaign ? 'Edit' : 'Create'} Discount Campaign</DialogTitle>
          <DialogDescription>
            {editingCampaign ? 'Update the' : 'Set up a new'} discount campaign with automatic or manual application
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

          <div>
            <Label>Target Countries (Optional)</Label>
            <div className="mt-2">
              <CountryMultiSelect
                selectedCountries={formData.target_countries}
                onChange={(countries) => setFormData({ ...formData, target_countries: countries })}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to target all countries, or select specific countries
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4">
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

            <div>
              <Label>Priority</Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                placeholder="100"
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

          <div>
            <Label>Applies To Components</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { value: 'total', label: 'Item Total' },
                { value: 'shipping', label: 'Shipping' },
                { value: 'customs', label: 'Customs Duty' },
                { value: 'handling', label: 'Handling Fee' },
                { value: 'taxes', label: 'Taxes (GST/VAT)' },
                { value: 'delivery', label: 'Domestic Delivery' }
              ].map((component) => (
                <label key={component.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_components.includes(component.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          applicable_components: [...formData.applicable_components, component.value]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          applicable_components: formData.applicable_components.filter(c => c !== component.value)
                        });
                      }
                    }}
                  />
                  <span className="text-sm">{component.label}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Select which cost components this discount can apply to
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Order Value</Label>
              <Input
                type="number"
                value={formData.min_order}
                onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
                placeholder="No minimum"
              />
            </div>

            <div>
              <Label>Maximum Discount Amount</Label>
              <Input
                type="number"
                value={formData.max_discount}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                placeholder="No maximum"
              />
            </div>
          </div>

          <TriggerRulesEditor
            triggerRules={formData.trigger_rules}
            onChange={(triggerRules) => setFormData({ ...formData, trigger_rules: triggerRules })}
          />

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
            {editingCampaign ? 'Update' : 'Create'} Campaign
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
  const [usagePerCustomer, setUsagePerCustomer] = useState('1');
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
          usage_per_customer: parseInt(usagePerCustomer) || 1,
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
      setUsagePerCustomer('1');
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Usage Per Customer</Label>
              <Input
                type="number"
                min="1"
                value={usagePerCustomer}
                onChange={(e) => setUsagePerCustomer(e.target.value)}
                placeholder="1"
              />
            </div>
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
                {campaign.discount_type?.type === 'percentage' 
                  ? `${campaign.discount_type?.value || 0}% off`
                  : `$${campaign.discount_type?.value || 0} off`
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
              <TriggerRulesDisplay triggerRules={campaign.trigger_rules} />
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

function EditDiscountCodeDialog({ code, open, onOpenChange, onSuccess }: {
  code: DiscountCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    code: code.code,
    usage_limit: code.usage_limit?.toString() || "",
    usage_per_customer: code.usage_per_customer?.toString() || "1",
    valid_until: code.valid_until ? format(new Date(code.valid_until), "yyyy-MM-dd") : "",
    is_active: code.is_active
  });

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from("discount_codes")
        .update({
          code: formData.code.toUpperCase(),
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          usage_per_customer: parseInt(formData.usage_per_customer) || 1,
          valid_until: formData.valid_until || null,
          is_active: formData.is_active
        })
        .eq("id", code.id);

      if (error) throw error;

      toast.success("Discount code updated");
      onSuccess();
    } catch (error) {
      console.error("Error updating discount code:", error);
      toast.error("Failed to update discount code");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Discount Code</DialogTitle>
          <DialogDescription>
            Update the discount code settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Discount Code</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="uppercase"
            />
          </div>

          <div>
            <Label>Usage Limit (Optional)</Label>
            <Input
              type="number"
              value={formData.usage_limit}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
              placeholder="Unlimited"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Current usage: {code.usage_count}
            </p>
          </div>

          <div>
            <Label>Usage Per Customer</Label>
            <Input
              type="number"
              value={formData.usage_per_customer}
              onChange={(e) => setFormData({ ...formData, usage_per_customer: e.target.value })}
            />
          </div>

          <div>
            <Label>Valid Until (Optional)</Label>
            <Input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active Status</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Update Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCountryRuleDialog({ onSuccess, campaigns }: {
  onSuccess: () => void;
  campaigns: DiscountCampaign[];
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    discount_type_id: '',
    country_code: '',
    component_discounts: {} as { [key: string]: number },
    min_order_amount: '',
    max_uses_per_customer: '',
    requires_code: false,
    auto_apply: true,
    description: '',
    priority: '100'
  });

  const componentOptions = [
    { value: 'shipping', label: 'Shipping' },
    { value: 'customs', label: 'Customs Duty' },
    { value: 'handling', label: 'Handling Fee' },
    { value: 'taxes', label: 'Taxes (GST/VAT)' },
    { value: 'delivery', label: 'Domestic Delivery' }
  ];

  const handleComponentDiscountChange = (component: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      component_discounts: {
        ...prev.component_discounts,
        [component]: numValue
      }
    }));
  };

  const handleSubmit = async () => {
    if (!formData.discount_type_id || !formData.country_code || Object.keys(formData.component_discounts).length === 0) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('country_discount_rules')
        .insert({
          discount_type_id: formData.discount_type_id,
          country_code: formData.country_code.toUpperCase(),
          component_discounts: formData.component_discounts,
          min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
          max_uses_per_customer: formData.max_uses_per_customer ? parseInt(formData.max_uses_per_customer) : null,
          requires_code: formData.requires_code,
          auto_apply: formData.auto_apply,
          description: formData.description.trim() || null,
          priority: parseInt(formData.priority) || 100
        });

      if (error) throw error;

      toast.success('Country rule created');
      onSuccess();
      setOpen(false);
      setFormData({
        discount_type_id: '',
        country_code: '',
        component_discounts: {},
        min_order_amount: '',
        max_uses_per_customer: '',
        requires_code: false,
        auto_apply: true,
        description: '',
        priority: '100'
      });
    } catch (error) {
      console.error('Error creating country rule:', error);
      toast.error('Failed to create country rule');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Globe className="mr-2 h-4 w-4" />
          Create Country Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Country-Specific Discount Rule</DialogTitle>
          <DialogDescription>
            Set up component-specific discounts for a particular country
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Discount Type</Label>
              <Select value={formData.discount_type_id} onValueChange={(value) => setFormData({ ...formData, discount_type_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.discount_type_id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Country Code</Label>
              <Input
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                placeholder="NP, IN, US, etc."
                className="uppercase"
              />
            </div>
          </div>

          <div>
            <Label>Component-Specific Discounts (%)</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {componentOptions.map((component) => (
                <div key={component.value} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{component.label}:</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-20"
                    value={formData.component_discounts[component.value] || ''}
                    onChange={(e) => handleComponentDiscountChange(component.value, e.target.value)}
                  />
                  <span className="text-sm">%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Admin notes about this country rule..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Minimum Order Amount</Label>
              <Input
                type="number"
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                placeholder="No minimum"
              />
            </div>

            <div>
              <Label>Max Uses Per Customer</Label>
              <Input
                type="number"
                value={formData.max_uses_per_customer}
                onChange={(e) => setFormData({ ...formData, max_uses_per_customer: e.target.value })}
                placeholder="Unlimited"
              />
            </div>

            <div>
              <Label>Priority (Higher = First)</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Application Method</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="create-auto-apply" className="font-medium">
                    Auto-Apply Discount
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically applies when conditions are met (no code required)
                  </p>
                </div>
                <Switch
                  id="create-auto-apply"
                  checked={formData.auto_apply}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_apply: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="create-requires-code" className="font-medium">
                    Requires Discount Code
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customer must enter a valid discount code to activate
                  </p>
                </div>
                <Switch
                  id="create-requires-code"
                  checked={formData.requires_code}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_code: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateDiscountTierDialog({ onSuccess, campaigns }: {
  onSuccess: () => void;
  campaigns: DiscountCampaign[];
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    discount_type_id: '',
    min_order_value: '',
    max_order_value: '',
    discount_value: '',
    applicable_components: ['total'] as string[],
    priority: '100',
    description: ''
  });

  const componentOptions = [
    { value: 'total', label: 'Item Total' },
    { value: 'shipping', label: 'Shipping' },
    { value: 'customs', label: 'Customs Duty' },
    { value: 'handling', label: 'Handling Fee' },
    { value: 'taxes', label: 'Taxes (GST/VAT)' },
    { value: 'delivery', label: 'Domestic Delivery' }
  ];

  const handleSubmit = async () => {
    if (!formData.discount_type_id || !formData.min_order_value || !formData.discount_value) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('discount_tiers')
        .insert({
          discount_type_id: formData.discount_type_id,
          min_order_value: parseFloat(formData.min_order_value),
          max_order_value: formData.max_order_value ? parseFloat(formData.max_order_value) : null,
          discount_value: parseFloat(formData.discount_value),
          applicable_components: formData.applicable_components,
          priority: parseInt(formData.priority) || 100,
          description: formData.description || null
        });

      if (error) throw error;

      toast.success('Discount tier created');
      onSuccess();
      setOpen(false);
      setFormData({
        discount_type_id: '',
        min_order_value: '',
        max_order_value: '',
        discount_value: '',
        applicable_components: ['total'],
        priority: '100',
        description: ''
      });
    } catch (error) {
      console.error('Error creating discount tier:', error);
      toast.error('Failed to create discount tier');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Target className="mr-2 h-4 w-4" />
          Create Tier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Volume Discount Tier</DialogTitle>
          <DialogDescription>
            Set up tiered discounts based on order value
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Discount Type</Label>
            <Select value={formData.discount_type_id} onValueChange={(value) => setFormData({ ...formData, discount_type_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.discount_type_id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Min Order Value</Label>
              <Input
                type="number"
                value={formData.min_order_value}
                onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                placeholder="100"
              />
            </div>

            <div>
              <Label>Max Order Value (Optional)</Label>
              <Input
                type="number"
                value={formData.max_order_value}
                onChange={(e) => setFormData({ ...formData, max_order_value: e.target.value })}
                placeholder="No maximum"
              />
            </div>

            <div>
              <Label>Discount Value (%)</Label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder="10"
              />
            </div>

            <div>
              <Label>Priority</Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <Label>Applicable Components</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {componentOptions.map((component) => (
                <label key={component.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_components.includes(component.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          applicable_components: [...formData.applicable_components, component.value]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          applicable_components: formData.applicable_components.filter(c => c !== component.value)
                        });
                      }
                    }}
                  />
                  <span className="text-sm">{component.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Admin notes about this tier"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Tier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCountryRuleDialog({ rule, campaigns, open, onOpenChange, onSuccess }: {
  rule: CountryDiscountRule;
  campaigns: DiscountCampaign[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    discount_type_id: rule.discount_type_id,
    country_code: rule.country_code,
    component_discounts: rule.component_discounts || {},
    min_order_amount: rule.min_order_amount?.toString() || '',
    max_uses_per_customer: rule.max_uses_per_customer?.toString() || '',
    requires_code: rule.requires_code || false,
    auto_apply: rule.auto_apply !== undefined ? rule.auto_apply : true,
    description: rule.description || '',
    priority: rule.priority?.toString() || '100'
  });

  const componentOptions = [
    { value: 'shipping', label: 'Shipping' },
    { value: 'customs', label: 'Customs Duty' },
    { value: 'handling', label: 'Handling Fee' },
    { value: 'taxes', label: 'Taxes (GST/VAT)' },
    { value: 'delivery', label: 'Domestic Delivery' }
  ];

  const handleComponentDiscountChange = (component: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      component_discounts: {
        ...prev.component_discounts,
        [component]: numValue
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from('country_discount_rules')
        .update({
          discount_type_id: formData.discount_type_id,
          country_code: formData.country_code.toUpperCase(),
          component_discounts: formData.component_discounts,
          min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
          max_uses_per_customer: formData.max_uses_per_customer ? parseInt(formData.max_uses_per_customer) : null,
          requires_code: formData.requires_code,
          auto_apply: formData.auto_apply,
          description: formData.description.trim() || null,
          priority: parseInt(formData.priority) || 100
        })
        .eq('id', rule.id);

      if (error) throw error;

      toast.success('Country rule updated');
      onSuccess();
    } catch (error) {
      console.error('Error updating country rule:', error);
      toast.error('Failed to update country rule');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Country-Specific Discount Rule</DialogTitle>
          <DialogDescription>
            Update component-specific discounts for {rule.country_code}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Discount Type</Label>
              <Select value={formData.discount_type_id} onValueChange={(value) => setFormData({ ...formData, discount_type_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.discount_type_id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Country Code</Label>
              <Input
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                placeholder="NP, IN, US, etc."
                className="uppercase"
              />
            </div>
          </div>

          <div>
            <Label>Component-Specific Discounts (%)</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {componentOptions.map((component) => (
                <div key={component.value} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{component.label}:</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-20"
                    value={formData.component_discounts[component.value] || ''}
                    onChange={(e) => handleComponentDiscountChange(component.value, e.target.value)}
                  />
                  <span className="text-sm">%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Order Amount</Label>
              <Input
                type="number"
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                placeholder="No minimum"
              />
            </div>

            <div>
              <Label>Max Uses Per Customer</Label>
              <Input
                type="number"
                value={formData.max_uses_per_customer}
                onChange={(e) => setFormData({ ...formData, max_uses_per_customer: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Update Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDiscountTierDialog({ tier, campaigns, open, onOpenChange, onSuccess }: {
  tier: DiscountTier;
  campaigns: DiscountCampaign[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    discount_type_id: tier.discount_type_id,
    min_order_value: tier.min_order_value.toString(),
    max_order_value: tier.max_order_value?.toString() || '',
    discount_value: tier.discount_value.toString(),
    applicable_components: tier.applicable_components || ['total'],
    priority: tier.priority?.toString() || '100',
    description: tier.description || ''
  });

  const componentOptions = [
    { value: 'total', label: 'Item Total' },
    { value: 'shipping', label: 'Shipping' },
    { value: 'customs', label: 'Customs Duty' },
    { value: 'handling', label: 'Handling Fee' },
    { value: 'taxes', label: 'Taxes (GST/VAT)' },
    { value: 'delivery', label: 'Domestic Delivery' }
  ];

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from('discount_tiers')
        .update({
          discount_type_id: formData.discount_type_id,
          min_order_value: parseFloat(formData.min_order_value),
          max_order_value: formData.max_order_value ? parseFloat(formData.max_order_value) : null,
          discount_value: parseFloat(formData.discount_value),
          applicable_components: formData.applicable_components,
          priority: parseInt(formData.priority) || 100,
          description: formData.description || null
        })
        .eq('id', tier.id);

      if (error) throw error;

      toast.success('Discount tier updated');
      onSuccess();
    } catch (error) {
      console.error('Error updating discount tier:', error);
      toast.error('Failed to update discount tier');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Volume Discount Tier</DialogTitle>
          <DialogDescription>
            Update tiered discount settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Discount Type</Label>
            <Select value={formData.discount_type_id} onValueChange={(value) => setFormData({ ...formData, discount_type_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.discount_type_id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Min Order Value</Label>
              <Input
                type="number"
                value={formData.min_order_value}
                onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                placeholder="100"
              />
            </div>

            <div>
              <Label>Max Order Value (Optional)</Label>
              <Input
                type="number"
                value={formData.max_order_value}
                onChange={(e) => setFormData({ ...formData, max_order_value: e.target.value })}
                placeholder="No maximum"
              />
            </div>

            <div>
              <Label>Discount Value (%)</Label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder="10"
              />
            </div>

            <div>
              <Label>Priority</Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <Label>Applicable Components</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {componentOptions.map((component) => (
                <label key={component.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_components.includes(component.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          applicable_components: [...formData.applicable_components, component.value]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          applicable_components: formData.applicable_components.filter(c => c !== component.value)
                        });
                      }
                    }}
                  />
                  <span className="text-sm">{component.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Admin notes about this tier"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Update Tier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// TriggerRulesDisplay Component
function TriggerRulesDisplay({ triggerRules }: { triggerRules: any }) {
  const getDayName = (dayIndex: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || dayIndex.toString();
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  return (
    <div className="space-y-3 p-3 bg-muted rounded-lg">
      {triggerRules.happy_hour && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-sm">Happy Hour</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Days:</p>
              <div className="flex flex-wrap gap-1">
                {triggerRules.happy_hour.days?.map((day: number) => (
                  <Badge key={day} variant="secondary" className="text-xs">
                    {getDayName(day)}
                  </Badge>
                )) || <span className="text-xs text-muted-foreground">All days</span>}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hours:</p>
              <div className="flex flex-wrap gap-1">
                {triggerRules.happy_hour.hours?.map((hour: number) => (
                  <Badge key={hour} variant="outline" className="text-xs">
                    {formatHour(hour)}
                  </Badge>
                )) || <span className="text-xs text-muted-foreground">All hours</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {triggerRules.birthday && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-pink-600" />
            <span className="font-medium text-sm">Birthday Special</span>
            <Badge variant="default" className="text-xs">Active</Badge>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Triggers on customer's birthday month
          </p>
        </div>
      )}
    </div>
  );
}

// TriggerRulesEditor Component
function TriggerRulesEditor({ 
  triggerRules, 
  onChange 
}: { 
  triggerRules: any;
  onChange: (rules: any) => void;
}) {
  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`
  }));

  const toggleDay = (day: number) => {
    const newDays = triggerRules.happy_hour.days.includes(day)
      ? triggerRules.happy_hour.days.filter((d: number) => d !== day)
      : [...triggerRules.happy_hour.days, day];
    
    onChange({
      ...triggerRules,
      happy_hour: {
        ...triggerRules.happy_hour,
        days: newDays
      }
    });
  };

  const toggleHour = (hour: number) => {
    const newHours = triggerRules.happy_hour.hours.includes(hour)
      ? triggerRules.happy_hour.hours.filter((h: number) => h !== hour)
      : [...triggerRules.happy_hour.hours, hour];
    
    onChange({
      ...triggerRules,
      happy_hour: {
        ...triggerRules.happy_hour,
        hours: newHours
      }
    });
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Trigger Rules</Label>
      
      {/* Happy Hour Section */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <Label htmlFor="happy-hour-toggle" className="font-medium">Happy Hour Discount</Label>
          </div>
          <Switch
            id="happy-hour-toggle"
            checked={triggerRules.happy_hour.enabled}
            onCheckedChange={(enabled) => onChange({
              ...triggerRules,
              happy_hour: {
                ...triggerRules.happy_hour,
                enabled
              }
            })}
          />
        </div>

        {triggerRules.happy_hour.enabled && (
          <div className="space-y-3 ml-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Active Days:</Label>
              <div className="grid grid-cols-4 gap-2">
                {dayOptions.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={triggerRules.happy_hour.days.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className="text-xs"
                  >
                    {day.label.substring(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Active Hours:</Label>
              <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
                {hourOptions.map((hour) => (
                  <Button
                    key={hour.value}
                    type="button"
                    variant={triggerRules.happy_hour.hours.includes(hour.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleHour(hour.value)}
                    className="text-xs px-2"
                  >
                    {hour.value}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Click hours to toggle (24-hour format)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Birthday Section */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-pink-600" />
            <Label htmlFor="birthday-toggle" className="font-medium">Birthday Special</Label>
          </div>
          <Switch
            id="birthday-toggle"
            checked={triggerRules.birthday}
            onCheckedChange={(birthday) => onChange({
              ...triggerRules,
              birthday
            })}
          />
        </div>
        
        {triggerRules.birthday && (
          <p className="text-sm text-muted-foreground ml-6">
            This discount will be automatically available to customers during their birthday month
          </p>
        )}
      </div>
    </div>
  );
}

// CountryMultiSelect Component
function CountryMultiSelect({ 
  selectedCountries, 
  onChange 
}: { 
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
}) {
  const commonCountries = [
    { code: 'US', name: 'United States' },
    { code: 'IN', name: 'India' },
    { code: 'NP', name: 'Nepal' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'SG', name: 'Singapore' },
    { code: 'AE', name: 'UAE' },
    { code: 'MY', name: 'Malaysia' }
  ];

  const toggleCountry = (countryCode: string) => {
    if (selectedCountries.includes(countryCode)) {
      onChange(selectedCountries.filter(c => c !== countryCode));
    } else {
      onChange([...selectedCountries, countryCode]);
    }
  };

  const selectAll = () => {
    onChange(commonCountries.map(c => c.code));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAll}
          className="text-xs"
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearAll}
          className="text-xs"
        >
          Clear All
        </Button>
        {selectedCountries.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {selectedCountries.length} countries selected
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
        {commonCountries.map((country) => (
          <Button
            key={country.code}
            type="button"
            variant={selectedCountries.includes(country.code) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleCountry(country.code)}
            className="justify-start text-xs"
          >
            <span className="mr-2">{country.code}</span>
            {country.name}
          </Button>
        ))}
      </div>
    </div>
  );
}