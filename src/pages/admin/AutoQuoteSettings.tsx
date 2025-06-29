import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Globe, 
  Calculator, 
  Package, 
  Zap, 
  Plus, 
  Save, 
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Route
} from 'lucide-react';
import { useAutoQuoteSettings } from '@/hooks/useAutoQuoteSettings';
import { GeneralSettingsTab } from '@/components/admin/auto-quote/GeneralSettingsTab';
import { WebsiteRulesTab } from '@/components/admin/auto-quote/WebsiteRulesTab';
import { CustomsRulesTab } from '@/components/admin/auto-quote/CustomsRulesTab';
import { PricingRulesTab } from '@/components/admin/auto-quote/PricingRulesTab';
import { WeightRulesTab } from '@/components/admin/auto-quote/WeightRulesTab';
import { CountrySettingsTab } from '@/components/admin/auto-quote/CountrySettingsTab';
import { AnalyticsTab } from '@/components/admin/auto-quote/AnalyticsTab';
import { ShippingRoutesTab } from '@/components/admin/auto-quote/ShippingRoutesTab';

export default function AutoQuoteSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const {
    settings,
    rules,
    isLoading,
    error,
    updateSettings,
    addRule,
    updateRule,
    deleteRule,
    fetchSettings
  } = useAutoQuoteSettings();

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <p>Error loading auto quote settings: {error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Auto Quote Settings</h1>
            <p className="text-muted-foreground">
              Configure rules, thresholds, and settings for the auto quote system
            </p>
          </div>
          <Button onClick={fetchSettings} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save All Changes
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="websites" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Websites
            </TabsTrigger>
            <TabsTrigger value="customs" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Customs
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="weight" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Weight
            </TabsTrigger>
            <TabsTrigger value="countries" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Countries
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Shipping Routes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <GeneralSettingsTab 
              settings={settings}
              onUpdate={updateSettings}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="websites" className="space-y-6">
            <WebsiteRulesTab 
              rules={rules.websites || []}
              onAdd={addRule}
              onUpdate={updateRule}
              onDelete={deleteRule}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="customs" className="space-y-6">
            <CustomsRulesTab 
              rules={rules.customs || []}
              onAdd={addRule}
              onUpdate={updateRule}
              onDelete={deleteRule}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <PricingRulesTab 
              rules={rules.pricing || []}
              onAdd={addRule}
              onUpdate={updateRule}
              onDelete={deleteRule}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="weight" className="space-y-6">
            <WeightRulesTab 
              rules={rules.weight || []}
              onAdd={addRule}
              onUpdate={updateRule}
              onDelete={deleteRule}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="countries" className="space-y-6">
            <CountrySettingsTab 
              settings={settings}
              onUpdate={updateSettings}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="shipping" className="space-y-6">
            <ShippingRoutesTab />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current auto quote system configuration and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {settings?.isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-sm text-muted-foreground">System Status</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {rules?.customs?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Customs Rules</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {rules?.pricing?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Pricing Rules</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {rules?.weight?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Weight Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 