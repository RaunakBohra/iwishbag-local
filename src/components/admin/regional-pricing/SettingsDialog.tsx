/**
 * SettingsDialog - Comprehensive Regional Pricing Settings
 * 
 * Features:
 * - Global pricing defaults
 * - Currency preferences
 * - Cache management controls
 * - Import/Export functionality
 * - Performance thresholds
 * - System configuration
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  DollarSign,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Globe,
  Zap,
  BarChart3,
  Save,
  X,
  FileText,
  Clock,
  Shield,
  TrendingUp
} from 'lucide-react';

import { regionalPricingService } from '@/services/RegionalPricingService';
import { currencyService } from '@/services/CurrencyService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface SettingsConfig {
  // Global Defaults
  global_defaults: {
    default_currency: string;
    fallback_rate: number;
    auto_enable_protection: boolean;
    min_order_value_usd: number;
  };
  
  // Performance Settings
  performance: {
    cache_duration_hours: number;
    batch_size_limit: number;
    enable_real_time_updates: boolean;
    performance_monitoring_enabled: boolean;
  };
  
  // Import/Export Settings
  data_management: {
    export_format: 'csv' | 'xlsx' | 'json';
    include_historical_data: boolean;
    backup_frequency_days: number;
    auto_backup_enabled: boolean;
  };
  
  // Alert Thresholds
  alerts: {
    price_change_threshold_percent: number;
    revenue_impact_threshold_usd: number;
    error_rate_threshold_percent: number;
    enable_email_alerts: boolean;
  };
}

interface CacheStats {
  total_entries: number;
  hit_rate_percent: number;
  total_size_mb: number;
  oldest_entry_hours: number;
  expired_entries: number;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: SettingsConfig) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const queryClient = useQueryClient();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [activeTab, setActiveTab] = useState('defaults');
  const [settings, setSettings] = useState<SettingsConfig>({
    global_defaults: {
      default_currency: 'USD',
      fallback_rate: 0.025, // 2.5%
      auto_enable_protection: true,
      min_order_value_usd: 10.00
    },
    performance: {
      cache_duration_hours: 1,
      batch_size_limit: 100,
      enable_real_time_updates: true,
      performance_monitoring_enabled: true
    },
    data_management: {
      export_format: 'csv',
      include_historical_data: false,
      backup_frequency_days: 7,
      auto_backup_enabled: false
    },
    alerts: {
      price_change_threshold_percent: 10,
      revenue_impact_threshold_usd: 1000,
      error_rate_threshold_percent: 5,
      enable_email_alerts: false
    }
  });

  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // ============================================================================
  // LOAD INITIAL DATA
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadCacheStats();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      // Load settings from database or localStorage
      const savedSettings = localStorage.getItem('regional_pricing_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadCacheStats = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_calculation_cache')
        .select('id, created_at, expires_at');

      if (error) throw error;

      const now = new Date();
      const totalEntries = data?.length || 0;
      const expiredEntries = data?.filter(entry => new Date(entry.expires_at) < now).length || 0;
      
      setCacheStats({
        total_entries: totalEntries,
        hit_rate_percent: 75, // This would come from actual stats
        total_size_mb: totalEntries * 0.001, // Rough estimate
        oldest_entry_hours: totalEntries > 0 ? Math.max(
          ...data!.map(entry => (now.getTime() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60))
        ) : 0,
        expired_entries: expiredEntries
      });
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  // ============================================================================
  // MUTATIONS AND ACTIONS
  // ============================================================================

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: SettingsConfig) => {
      // Save to localStorage for now - would be database in production
      localStorage.setItem('regional_pricing_settings', JSON.stringify(newSettings));
      return newSettings;
    },
    onSuccess: (savedSettings) => {
      toast({
        title: 'Settings Saved',
        description: 'Regional pricing settings have been updated successfully.'
      });
      onSave?.(savedSettings);
    },
    onError: (error) => {
      console.error('Save failed:', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save settings. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('pricing_calculation_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all entries
      
      if (error) throw error;
      
      // Also clear the service cache
      regionalPricingService.clearCache();
    },
    onSuccess: () => {
      toast({
        title: 'Cache Cleared',
        description: 'All pricing cache entries have been cleared successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['pricing-matrix'] });
      loadCacheStats();
    },
    onError: (error) => {
      console.error('Cache clear failed:', error);
      toast({
        title: 'Clear Failed',
        description: 'Unable to clear cache. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSave = () => {
    setIsLoading(true);
    saveSettingsMutation.mutate(settings);
    setIsLoading(false);
  };

  const handleClearCache = () => {
    setIsClearingCache(true);
    clearCacheMutation.mutate();
    setIsClearingCache(false);
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `regional-pricing-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Settings Exported',
      description: 'Settings have been downloaded as JSON file.'
    });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        toast({
          title: 'Settings Imported',
          description: 'Settings have been imported successfully. Click Save to apply.'
        });
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: 'Invalid settings file format.',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  const updateSettings = (section: keyof SettingsConfig, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderDefaultsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Global Pricing Defaults
          </CardTitle>
          <CardDescription>
            Set default values used across all regional pricing calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default-currency">Default Currency</Label>
              <Select
                value={settings.global_defaults.default_currency}
                onValueChange={(value) => updateSettings('global_defaults', 'default_currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fallback-rate">Fallback Rate (%)</Label>
              <Input
                id="fallback-rate"
                type="number"
                step="0.001"
                value={settings.global_defaults.fallback_rate * 100}
                onChange={(e) => updateSettings('global_defaults', 'fallback_rate', parseFloat(e.target.value) / 100)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Used when no specific regional pricing is available
              </p>
            </div>

            <div>
              <Label htmlFor="min-order-value">Minimum Order Value (USD)</Label>
              <Input
                id="min-order-value"
                type="number"
                step="0.01"
                value={settings.global_defaults.min_order_value_usd}
                onChange={(e) => updateSettings('global_defaults', 'min_order_value_usd', parseFloat(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-enable-protection"
                checked={settings.global_defaults.auto_enable_protection}
                onCheckedChange={(checked) => updateSettings('global_defaults', 'auto_enable_protection', checked)}
              />
              <Label htmlFor="auto-enable-protection">Auto-enable package protection</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Performance Settings
          </CardTitle>
          <CardDescription>
            Configure caching and performance optimization settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cache-duration">Cache Duration (Hours)</Label>
              <Input
                id="cache-duration"
                type="number"
                min="0.1"
                max="24"
                step="0.1"
                value={settings.performance.cache_duration_hours}
                onChange={(e) => updateSettings('performance', 'cache_duration_hours', parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="batch-size">Batch Size Limit</Label>
              <Input
                id="batch-size"
                type="number"
                min="10"
                max="1000"
                value={settings.performance.batch_size_limit}
                onChange={(e) => updateSettings('performance', 'batch_size_limit', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="real-time-updates"
                checked={settings.performance.enable_real_time_updates}
                onCheckedChange={(checked) => updateSettings('performance', 'enable_real_time_updates', checked)}
              />
              <Label htmlFor="real-time-updates">Enable real-time updates</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="performance-monitoring"
                checked={settings.performance.performance_monitoring_enabled}
                onCheckedChange={(checked) => updateSettings('performance', 'performance_monitoring_enabled', checked)}
              />
              <Label htmlFor="performance-monitoring">Enable performance monitoring</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Cache Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.total_entries}</div>
                <div className="text-xs text-gray-500">Total Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.hit_rate_percent}%</div>
                <div className="text-xs text-gray-500">Hit Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.total_size_mb.toFixed(1)}MB</div>
                <div className="text-xs text-gray-500">Cache Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.expired_entries}</div>
                <div className="text-xs text-gray-500">Expired</div>
              </div>
            </div>

            <Button 
              onClick={handleClearCache}
              disabled={isClearingCache}
              variant="outline"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isClearingCache ? 'Clearing Cache...' : 'Clear All Cache'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Import/Export settings and configure data backup options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="export-format">Export Format</Label>
              <Select
                value={settings.data_management.export_format}
                onValueChange={(value: 'csv' | 'xlsx' | 'json') => updateSettings('data_management', 'export_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="backup-frequency">Backup Frequency (Days)</Label>
              <Input
                id="backup-frequency"
                type="number"
                min="1"
                max="30"
                value={settings.data_management.backup_frequency_days}
                onChange={(e) => updateSettings('data_management', 'backup_frequency_days', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-historical"
                checked={settings.data_management.include_historical_data}
                onCheckedChange={(checked) => updateSettings('data_management', 'include_historical_data', checked)}
              />
              <Label htmlFor="include-historical">Include historical data in exports</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-backup"
                checked={settings.data_management.auto_backup_enabled}
                onCheckedChange={(checked) => updateSettings('data_management', 'auto_backup_enabled', checked)}
              />
              <Label htmlFor="auto-backup">Enable automatic backups</Label>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <Button onClick={handleExportSettings} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Settings
            </Button>

            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                style={{ display: 'none' }}
                id="import-settings"
              />
              <Button 
                onClick={() => document.getElementById('import-settings')?.click()}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alert Thresholds
          </CardTitle>
          <CardDescription>
            Configure when to trigger alerts for pricing changes and system issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price-change-threshold">Price Change Threshold (%)</Label>
              <Input
                id="price-change-threshold"
                type="number"
                min="1"
                max="100"
                value={settings.alerts.price_change_threshold_percent}
                onChange={(e) => updateSettings('alerts', 'price_change_threshold_percent', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert when price changes exceed this percentage
              </p>
            </div>

            <div>
              <Label htmlFor="revenue-threshold">Revenue Impact Threshold (USD)</Label>
              <Input
                id="revenue-threshold"
                type="number"
                min="100"
                step="100"
                value={settings.alerts.revenue_impact_threshold_usd}
                onChange={(e) => updateSettings('alerts', 'revenue_impact_threshold_usd', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert when projected revenue impact exceeds this amount
              </p>
            </div>

            <div>
              <Label htmlFor="error-rate-threshold">Error Rate Threshold (%)</Label>
              <Input
                id="error-rate-threshold"
                type="number"
                min="1"
                max="50"
                step="0.1"
                value={settings.alerts.error_rate_threshold_percent}
                onChange={(e) => updateSettings('alerts', 'error_rate_threshold_percent', parseFloat(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="email-alerts"
                checked={settings.alerts.enable_email_alerts}
                onCheckedChange={(checked) => updateSettings('alerts', 'enable_email_alerts', checked)}
              />
              <Label htmlFor="email-alerts">Enable email alerts</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Regional Pricing Settings
          </DialogTitle>
          <DialogDescription>
            Configure global settings, performance options, and data management preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="defaults" className="mt-6">
            {renderDefaultsTab()}
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            {renderPerformanceTab()}
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            {renderDataTab()}
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            {renderAlertsTab()}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};