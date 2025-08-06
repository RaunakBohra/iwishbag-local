import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { DiscountService, type DiscountCampaign, type DiscountCode } from '@/services/DiscountService';
import { toast } from 'sonner';

// Import our refactored components
import { DiscountCampaignsSection } from './discount-management/DiscountCampaignsSection';
import { DiscountCodesSection } from './discount-management/DiscountCodesSection';
import { DiscountAnalyticsSection } from './discount-management/DiscountAnalyticsSection';
import { DiscountSettingsSection } from './discount-management/DiscountSettingsSection';
import { DiscountRulesSection } from './discount-management/DiscountRulesSection';

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

interface PaymentDiscounts {
  bank_transfer: { percentage: number; is_active: boolean };
  wire_transfer: { percentage: number; is_active: boolean };
}

interface StackingRules {
  allow_multiple_campaigns: boolean;
  allow_code_with_auto: boolean;
  max_discount_percentage: number;
  priority_order: string[];
}

interface TriggerRules {
  happy_hour: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    days?: number[];
    discount_percentage: number;
  };
  cart_abandonment: {
    enabled: boolean;
    delay_hours: number;
    discount_percentage: number;
    max_uses_per_customer: number;
  };
}

export function DiscountManagementPanelRefactored() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [countryRules, setCountryRules] = useState<CountryDiscountRule[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [usageAnalytics, setUsageAnalytics] = useState<CustomerDiscountUsage[]>([]);
  const [stats, setStats] = useState<DiscountStats | null>(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedCampaign, setSelectedCampaign] = useState<DiscountCampaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<DiscountCampaign | null>(null);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [editingCountryRule, setEditingCountryRule] = useState<CountryDiscountRule | null>(null);
  const [editingDiscountTier, setEditingDiscountTier] = useState<DiscountTier | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // Settings State
  const [paymentDiscounts, setPaymentDiscounts] = useState<PaymentDiscounts>({
    bank_transfer: { percentage: 2, is_active: true },
    wire_transfer: { percentage: 2, is_active: true }
  });
  
  const [stackingRules, setStackingRules] = useState<StackingRules>({
    allow_multiple_campaigns: false,
    allow_code_with_auto: true,
    max_discount_percentage: 50,
    priority_order: ['code', 'campaign', 'payment']
  });

  const [triggerRules, setTriggerRules] = useState<TriggerRules>({
    happy_hour: {
      enabled: false,
      start_time: '15:00',
      end_time: '17:00',
      days: [1, 2, 3, 4, 5], // Mon-Fri
      discount_percentage: 10
    },
    cart_abandonment: {
      enabled: false,
      delay_hours: 24,
      discount_percentage: 15,
      max_uses_per_customer: 3
    }
  });

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCampaigns(),
        loadDiscountCodes(),
        loadCountryRules(),
        loadDiscountTiers(),
        loadUsageAnalytics(),
        loadStats(),
        loadSettings(),
      ]);
    } catch (error) {
      console.error('Error loading discount data:', error);
      toast.error('Failed to load discount data');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const campaigns = await DiscountService.getCampaigns();
      setCampaigns(campaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadDiscountCodes = async () => {
    try {
      const codes = await DiscountService.getDiscountCodes();
      setDiscountCodes(codes);
    } catch (error) {
      console.error('Error loading discount codes:', error);
    }
  };

  const loadCountryRules = async () => {
    try {
      // Mock data - replace with actual API call
      setCountryRules([]);
    } catch (error) {
      console.error('Error loading country rules:', error);
    }
  };

  const loadDiscountTiers = async () => {
    try {
      // Mock data - replace with actual API call
      setDiscountTiers([]);
    } catch (error) {
      console.error('Error loading discount tiers:', error);
    }
  };

  const loadUsageAnalytics = async () => {
    try {
      // Mock data - replace with actual API call
      setUsageAnalytics([]);
    } catch (error) {
      console.error('Error loading usage analytics:', error);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await DiscountService.getStats();
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSettings = async () => {
    try {
      // Load settings from database or use defaults
      // This would typically come from your settings API
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Save payment discounts, stacking rules, and trigger rules
      await Promise.all([
        DiscountService.savePaymentDiscounts(paymentDiscounts),
        DiscountService.saveStackingRules(stackingRules),
        DiscountService.saveTriggerRules(triggerRules),
      ]);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  const handleCampaignEdit = (campaign: DiscountCampaign) => {
    setEditingCampaign(campaign);
    // This would open a modal or navigate to edit page
  };

  const handleCampaignView = (campaign: DiscountCampaign) => {
    setSelectedCampaign(campaign);
    // This would open a view modal
  };

  const handleCodeEdit = (code: DiscountCode) => {
    setEditingCode(code);
    // This would open a modal or navigate to edit page
  };

  const handleCountryRuleEdit = (rule: CountryDiscountRule) => {
    setEditingCountryRule(rule);
    // This would open a modal or navigate to edit page
  };

  const handleDiscountTierEdit = (tier: DiscountTier) => {
    setEditingDiscountTier(tier);
    // This would open a modal or navigate to edit page
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Discount Management</h2>
          <p className="text-muted-foreground">Loading discount data...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Discount Management (Refactored)</h2>
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
          <DiscountCampaignsSection
            campaigns={campaigns}
            stats={stats}
            showInactive={showInactive}
            selectedCampaigns={selectedCampaigns}
            onCampaignsChange={setCampaigns}
            onShowInactiveChange={setShowInactive}
            onSelectedCampaignsChange={setSelectedCampaigns}
            onCampaignEdit={handleCampaignEdit}
            onCampaignView={handleCampaignView}
          />
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <DiscountCodesSection
            discountCodes={discountCodes}
            campaigns={campaigns}
            selectedCodes={selectedCodes}
            onCodesChange={setDiscountCodes}
            onSelectedCodesChange={setSelectedCodes}
            onCodeEdit={handleCodeEdit}
          />
        </TabsContent>

        <TabsContent value="country-rules" className="space-y-4">
          <DiscountRulesSection
            countryRules={countryRules}
            discountTiers={discountTiers}
            campaigns={campaigns}
            onCountryRulesChange={setCountryRules}
            onDiscountTiersChange={setDiscountTiers}
            onCountryRuleEdit={handleCountryRuleEdit}
            onDiscountTierEdit={handleDiscountTierEdit}
            activeTab={activeTab}
          />
        </TabsContent>

        <TabsContent value="discount-tiers" className="space-y-4">
          <DiscountRulesSection
            countryRules={countryRules}
            discountTiers={discountTiers}
            campaigns={campaigns}
            onCountryRulesChange={setCountryRules}
            onDiscountTiersChange={setDiscountTiers}
            onCountryRuleEdit={handleCountryRuleEdit}
            onDiscountTierEdit={handleDiscountTierEdit}
            activeTab={activeTab}
          />
        </TabsContent>

        <TabsContent value="usage-analytics" className="space-y-4">
          <DiscountAnalyticsSection
            usageAnalytics={usageAnalytics}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <DiscountSettingsSection
            paymentDiscounts={paymentDiscounts}
            stackingRules={stackingRules}
            triggerRules={triggerRules}
            onPaymentDiscountsChange={setPaymentDiscounts}
            onStackingRulesChange={setStackingRules}
            onTriggerRulesChange={setTriggerRules}
            onSaveSettings={handleSaveSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}