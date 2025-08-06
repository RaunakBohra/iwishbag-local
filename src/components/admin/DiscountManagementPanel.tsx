import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { DiscountService, type DiscountCampaign, type DiscountCode } from '@/services/DiscountService';
import { toast } from 'sonner';

// Import all focused components
import { DiscountStatsSection } from './discount-sections/DiscountStatsSection';
import { CampaignManagementSection } from './discount-sections/CampaignManagementSection';
import { DiscountCodeSection } from './discount-sections/DiscountCodeSection';
import { CountryRulesSection } from './discount-sections/CountryRulesSection';
import { TierManagementSection } from './discount-sections/TierManagementSection';
import { UsageAnalyticsSection } from './discount-sections/UsageAnalyticsSection';

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

interface UsageAnalytics {
  period: string;
  total_usage: number;
  unique_users: number;
  total_savings: number;
  avg_discount_value: number;
  top_campaigns: Array<{
    id: string;
    name: string;
    usage_count: number;
    total_savings: number;
  }>;
  usage_by_country: Array<{
    country_code: string;
    country_name: string;
    usage_count: number;
    total_savings: number;
  }>;
  daily_usage: Array<{
    date: string;
    usage_count: number;
    savings: number;
  }>;
}

export function DiscountManagementPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [countryRules, setCountryRules] = useState<CountryDiscountRule[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null);
  const [stats, setStats] = useState<DiscountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Selection states for bulk operations
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('discount_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!campaignsError && campaignsData) {
        setCampaigns(campaignsData);
      }

      // Load discount codes
      const { data: codesData, error: codesError } = await supabase
        .from('discount_codes')
        .select(`
          *,
          discount_campaigns (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (!codesError && codesData) {
        setDiscountCodes(codesData);
      }

      // Load country rules
      const { data: countryRulesData, error: countryRulesError } = await supabase
        .from('country_discount_rules')
        .select(`
          *,
          discount_type:discount_types (
            id,
            name,
            code,
            type,
            value
          )
        `)
        .order('created_at', { ascending: false });

      if (!countryRulesError && countryRulesData) {
        setCountryRules(countryRulesData);
      }

      // Load discount tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('discount_tiers')
        .select('*')
        .order('tier_order', { ascending: true });

      if (!tiersError && tiersData) {
        setDiscountTiers(tiersData);
      }

      // Load statistics
      await loadStats();

    } catch (error) {
      console.error('Error loading discount data:', error);
      toast.error('Failed to load discount data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
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
        // Set default stats
        setStats({
          total_discounts_used: 0,
          total_savings: 0,
          active_campaigns: campaigns.filter(c => c.is_active).length,
          conversion_rate: 0
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        total_discounts_used: 0,
        total_savings: 0,
        active_campaigns: campaigns.filter(c => c.is_active).length,
        conversion_rate: 0
      });
    }
  };

  const loadUsageAnalytics = async (period: string = '30d') => {
    setAnalyticsLoading(true);
    try {
      // In a real implementation, this would call a proper analytics endpoint
      // For now, we'll create mock data structure
      const mockAnalytics: UsageAnalytics = {
        period,
        total_usage: stats?.total_discounts_used || 0,
        unique_users: Math.floor((stats?.total_discounts_used || 0) * 0.7),
        total_savings: stats?.total_savings || 0,
        avg_discount_value: (stats?.total_savings || 0) / Math.max(stats?.total_discounts_used || 1, 1),
        top_campaigns: campaigns
          .filter(c => c.is_active)
          .slice(0, 5)
          .map(c => ({
            id: c.id,
            name: c.name,
            usage_count: Math.floor(Math.random() * 100),
            total_savings: Math.floor(Math.random() * 5000)
          })),
        usage_by_country: [
          { country_code: 'US', country_name: 'United States', usage_count: 45, total_savings: 2300 },
          { country_code: 'IN', country_name: 'India', usage_count: 32, total_savings: 1200 },
          { country_code: 'NP', country_name: 'Nepal', usage_count: 18, total_savings: 800 }
        ],
        daily_usage: []
      };
      
      setUsageAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Event handlers for creating/editing items
  const handleCreateCampaign = () => {
    // TODO: Implement campaign creation dialog
    toast.info('Campaign creation dialog would open here');
  };

  const handleEditCampaign = (campaign: DiscountCampaign) => {
    // TODO: Implement campaign edit dialog
    toast.info(`Edit campaign: ${campaign.name}`);
  };

  const handleViewCampaignDetails = (campaign: DiscountCampaign) => {
    // TODO: Implement campaign details view
    toast.info(`View details for: ${campaign.name}`);
  };

  const handleCreateCode = () => {
    // TODO: Implement code creation dialog
    toast.info('Discount code creation dialog would open here');
  };

  const handleEditCode = (code: DiscountCode) => {
    // TODO: Implement code edit dialog
    toast.info(`Edit code: ${code.code}`);
  };

  const handleCreateCountryRule = () => {
    // TODO: Implement country rule creation dialog
    toast.info('Country rule creation dialog would open here');
  };

  const handleEditCountryRule = (rule: CountryDiscountRule) => {
    // TODO: Implement country rule edit dialog
    toast.info(`Edit country rule for: ${rule.country_code}`);
  };

  const handleCreateTier = () => {
    // TODO: Implement tier creation dialog
    toast.info('Discount tier creation dialog would open here');
  };

  const handleEditTier = (tier: DiscountTier) => {
    // TODO: Implement tier edit dialog
    toast.info(`Edit tier: ${tier.name}`);
  };

  const handleAnalyticsPeriodChange = (period: string) => {
    loadUsageAnalytics(period);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Discount Management</h1>
        <p className="text-gray-600">
          Manage campaigns, codes, rules, and analyze discount performance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="codes">Codes</TabsTrigger>
          <TabsTrigger value="rules">Country Rules</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <DiscountStatsSection 
            stats={stats} 
            loading={loading} 
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignManagementSection
            campaigns={campaigns}
            showInactive={showInactive}
            setShowInactive={setShowInactive}
            selectedCampaigns={selectedCampaigns}
            setSelectedCampaigns={setSelectedCampaigns}
            onCreateCampaign={handleCreateCampaign}
            onEditCampaign={handleEditCampaign}
            onViewDetails={handleViewCampaignDetails}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="codes" className="mt-6">
          <DiscountCodeSection
            discountCodes={discountCodes}
            selectedCodes={selectedCodes}
            setSelectedCodes={setSelectedCodes}
            onCreateCode={handleCreateCode}
            onEditCode={handleEditCode}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <CountryRulesSection
            countryRules={countryRules}
            onCreateRule={handleCreateCountryRule}
            onEditRule={handleEditCountryRule}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="tiers" className="mt-6">
          <TierManagementSection
            tiers={discountTiers}
            onCreateTier={handleCreateTier}
            onEditTier={handleEditTier}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <UsageAnalyticsSection
            analytics={usageAnalytics}
            loading={analyticsLoading}
            onRefresh={() => loadUsageAnalytics()}
            onPeriodChange={handleAnalyticsPeriodChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}