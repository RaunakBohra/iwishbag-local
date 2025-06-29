import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAutoQuoteSettings = () => {
  const [settings, setSettings] = useState<any>(null);
  const [rules, setRules] = useState({
    websites: [],
    customs: [],
    pricing: [],
    weight: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch auto quote settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('auto_quote_settings')
        .select('*')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw settingsError;
      }

      // Fetch website scraping rules
      const { data: websiteRules, error: websiteError } = await supabase
        .from('website_scraping_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (websiteError) {
        throw websiteError;
      }

      // Fetch customs rules
      const { data: customsRules, error: customsError } = await supabase
        .from('customs_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (customsError) {
        throw customsError;
      }

      // Fetch pricing rules
      const { data: pricingRules, error: pricingError } = await supabase
        .from('pricing_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (pricingError) {
        throw pricingError;
      }

      // Fetch weight rules
      const { data: weightRules, error: weightError } = await supabase
        .from('weight_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (weightError) {
        throw weightError;
      }

      setSettings(settingsData || {
        isActive: true,
        confidenceThreshold: 0.7,
        markupPercentage: 5.0,
        autoApprovalLimit: 2000,
        requiresAdminReview: true
      });

      setRules({
        websites: websiteRules || [],
        customs: customsRules || [],
        pricing: pricingRules || [],
        weight: weightRules || []
      });

    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch auto quote settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: any) => {
    try {
      const { error: updateError } = await supabase
        .from('auto_quote_settings')
        .upsert(newSettings, { onConflict: 'id' });

      if (updateError) {
        throw updateError;
      }

      setSettings(newSettings);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });

      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update settings: " + err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const addRule = async (ruleType: string, rule: any) => {
    try {
      const tableName = `${ruleType}_rules`;
      const { data, error: addError } = await supabase
        .from(tableName)
        .insert(rule)
        .select()
        .single();

      if (addError) {
        throw addError;
      }

      // Update local state
      setRules(prev => ({
        ...prev,
        [ruleType]: [...prev[ruleType as keyof typeof prev], data]
      }));

      toast({
        title: "Success",
        description: `${ruleType} rule added successfully`,
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to add ${ruleType} rule: ` + err.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRule = async (ruleType: string, ruleId: string, updates: any) => {
    try {
      const tableName = `${ruleType}_rules`;
      const { data, error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', ruleId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setRules(prev => ({
        ...prev,
        [ruleType]: prev[ruleType as keyof typeof prev].map((rule: any) =>
          rule.id === ruleId ? data : rule
        )
      }));

      toast({
        title: "Success",
        description: `${ruleType} rule updated successfully`,
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to update ${ruleType} rule: ` + err.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteRule = async (ruleType: string, ruleId: string) => {
    try {
      const tableName = `${ruleType}_rules`;
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', ruleId);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setRules(prev => ({
        ...prev,
        [ruleType]: prev[ruleType as keyof typeof prev].filter((rule: any) => rule.id !== ruleId)
      }));

      toast({
        title: "Success",
        description: `${ruleType} rule deleted successfully`,
      });

      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to delete ${ruleType} rule: ` + err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleRule = async (ruleType: string, ruleId: string, isActive: boolean) => {
    return updateRule(ruleType, ruleId, { is_active: isActive });
  };

  const reorderRules = async (ruleType: string, ruleIds: string[]) => {
    try {
      const tableName = `${ruleType}_rules`;
      const updates = ruleIds.map((id, index) => ({
        id,
        priority: ruleIds.length - index // Higher priority for earlier items
      }));

      const { error: updateError } = await supabase
        .from(tableName)
        .upsert(updates);

      if (updateError) {
        throw updateError;
      }

      // Refresh rules to get updated order
      await fetchSettings();

      toast({
        title: "Success",
        description: `${ruleType} rules reordered successfully`,
      });

      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to reorder ${ruleType} rules: ` + err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    rules,
    isLoading,
    error,
    fetchSettings,
    updateSettings,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    reorderRules
  };
}; 