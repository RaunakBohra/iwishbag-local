/**
 * RegionalPricingManager - Advanced Regional Pricing Management Interface
 * 
 * Features:
 * - Visual pricing hierarchy (Global → Continental → Regional → Country)
 * - Interactive pricing matrix with bulk editing
 * - Revenue impact calculator
 * - Smart regional groupings
 * - Real-time validation and preview
 * 
 * Inspired by Shopify, Stripe, and Amazon pricing management interfaces
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePricingMatrix } from '@/hooks/usePricingMatrix';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Globe,
  Calculator,
  BarChart3,
  Settings,
  RefreshCw,
  Users,
  TreePine,
  Activity,
  Download
} from 'lucide-react';

import { regionalPricingService, AddonService, PricingCalculation } from '@/services/RegionalPricingService';
import { currencyService } from '@/services/CurrencyService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SettingsDialog } from '@/components/admin/regional-pricing/SettingsDialog';
import { BulkEditingPanel } from '@/components/admin/regional-pricing/BulkEditingPanel';
import { HierarchicalPricingTree } from '@/components/admin/regional-pricing/HierarchicalPricingTree';
import { CSVImportExport } from '@/components/admin/regional-pricing/CSVImportExport';
import { ServiceSelector } from '@/components/admin/regional-pricing/ServiceSelector';
import { PricingAuditLog } from '@/components/admin/regional-pricing/PricingAuditLog';
import { PricingStatsPanel } from '@/components/admin/regional-pricing/PricingStatsPanel';
import { PricingTableView } from '@/components/admin/regional-pricing/PricingTableView';
import type { CountryPricing } from '@/components/admin/regional-pricing/BulkEditingPanel';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface PricingRule {
  id: string;
  service_id: string;
  tier: 'global' | 'continental' | 'regional' | 'country';
  rate: number;
  min_amount: number;
  max_amount?: number;
  currency_code: string;
  description: string;
  is_active: boolean;
  effective_countries?: string[];
  created_at: string;
  updated_at: string;
}

interface PricingMatrix {
  service_key: string;
  service_name: string;
  pricing_type: 'percentage' | 'fixed';
  icon_name?: string;
  countries: Record<string, {
    rate: number;
    tier: 'global' | 'continental' | 'regional' | 'country';
    source: string;
    min_amount: number;
    max_amount?: number;
  }>;
}

interface RegionTemplate {
  region_key: string;
  region_name: string;
  country_codes: string[];
  description: string;
  is_predefined: boolean;
}

interface RevenueImpactCalculation {
  current_monthly_revenue: number;
  projected_monthly_revenue: number;
  impact_amount: number;
  impact_percentage: number;
  affected_countries: string[];
  confidence_score: number;
}

// ServiceIconMap moved to ServiceSelector component

// ============================================================================
// CONTINENTAL MAPPINGS
// ============================================================================

const PredefinedRegions: RegionTemplate[] = [
  {
    region_key: 'south_asia',
    region_name: 'South Asia',
    country_codes: ['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'AF'],
    description: 'High-volume, price-sensitive market with strong growth potential',
    is_predefined: true
  },
  {
    region_key: 'southeast_asia',
    region_name: 'Southeast Asia', 
    country_codes: ['TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'MM', 'KH', 'LA', 'BN'],
    description: 'Rapidly growing e-commerce market with improving infrastructure',
    is_predefined: true
  },
  {
    region_key: 'east_asia',
    region_name: 'East Asia',
    country_codes: ['JP', 'KR', 'CN', 'TW', 'HK', 'MO'],
    description: 'Premium market with high-value orders and advanced logistics',
    is_predefined: true
  },
  {
    region_key: 'western_europe',
    region_name: 'Western Europe',
    country_codes: ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'IE'],
    description: 'Premium market with excellent infrastructure and high service expectations',
    is_predefined: true
  },
  {
    region_key: 'northern_europe',
    region_name: 'Northern Europe',
    country_codes: ['SE', 'NO', 'DK', 'FI', 'IS'],
    description: 'Ultra-premium market with highest service standards and pricing tolerance',
    is_predefined: true
  },
  {
    region_key: 'north_america_premium',
    region_name: 'North America Premium',
    country_codes: ['US', 'CA'],
    description: 'Largest market with premium pricing and high-volume potential',
    is_predefined: true
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RegionalPricingManager: React.FC = React.memo(() => {
  const [selectedService, setSelectedService] = useState<string>('package_protection');
  
  // Memoize the service change handler to prevent unnecessary re-renders
  const handleServiceChange = useCallback((serviceKey: string) => {
    setSelectedService(serviceKey);
    // Clear any existing revenue impact when switching services
    setRevenueImpact(null);
  }, []);
  const [revenueImpact, setRevenueImpact] = useState<RevenueImpactCalculation | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'hierarchy' | 'import-export' | 'audit'>('table');

  const queryClient = useQueryClient();

  // Load addon services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['addon-services'],
    queryFn: () => regionalPricingService.getAvailableServices(),
  });

  // Load countries with continents
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries-with-continents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('country_settings')
        .select('code, name, continent, currency')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Use custom hooks for pricing matrix and bulk operations
  const {
    pricingMatrix,
    pricingStats,
    countriesByContinent,
    isLoading: pricingLoading,
    error: pricingError,
    refetch: refetchPricing
  } = usePricingMatrix(selectedService, services, countries, {
    adminMode: true, // Enable faster updates for admin interface
  });

  const {
    handleBulkUpdate,
    handleHierarchicalRateUpdate,
    handleCountryRateUpdate,
    calculateRevenueImpact
  } = useBulkOperations(selectedService, services, countries, pricingMatrix);

  // ============================================================================
  // EDITING FUNCTIONS
  // ============================================================================

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================



  const renderRevenueeImpactAnalytics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Revenue Impact Calculator
          </CardTitle>
          <CardDescription>
            Simulate pricing changes and see projected revenue impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revenueImpact ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">Current Monthly Revenue</Label>
                  <p className="text-2xl font-bold">
                    ${revenueImpact.current_monthly_revenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Projected Monthly Revenue</Label>
                  <p className="text-2xl font-bold text-green-600">
                    ${revenueImpact.projected_monthly_revenue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">Revenue Impact</Label>
                  <p className={`text-2xl font-bold ${revenueImpact.impact_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueImpact.impact_amount >= 0 ? '+' : ''}${revenueImpact.impact_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Percentage Change</Label>
                  <p className={`text-2xl font-bold ${revenueImpact.impact_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueImpact.impact_percentage >= 0 ? '+' : ''}{revenueImpact.impact_percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select countries and modify rates to see revenue impact</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (servicesLoading || countriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading regional pricing data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header with Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-2xl p-8 border border-blue-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <Globe className="w-8 h-8 text-blue-600" />
              Regional Pricing
            </h1>
            <p className="text-lg text-gray-700 mt-2">
              Intelligent pricing management across global markets
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{services.length}</div>
              <div className="text-sm text-gray-600 font-medium">Services</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{countries.length}</div>
              <div className="text-sm text-gray-600 font-medium">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">6</div>
              <div className="text-sm text-gray-600 font-medium">Continents</div>
            </div>
          </div>
        </div>

        {/* Service Selector */}
        <ServiceSelector
          services={services}
          selectedService={selectedService}
          onServiceChange={handleServiceChange}
          pricingStats={pricingStats}
          isLoading={pricingLoading}
        />
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-xl p-1 shadow-sm">
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-10 px-4"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Table
            </Button>
            <Button 
              variant={viewMode === 'hierarchy' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('hierarchy')}
              className="h-10 px-4"
            >
              <TreePine className="w-4 h-4 mr-2" />
              Hierarchy
            </Button>
            <Button 
              variant={viewMode === 'import-export' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('import-export')}
              className="h-10 px-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Import/Export
            </Button>
            <Button 
              variant={viewMode === 'audit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('audit')}
              className="h-10 px-4"
            >
              <Activity className="w-4 h-4 mr-2" />
              Audit Log
            </Button>
          </div>

          {/* Mode-specific controls */}
          {viewMode === 'table' && (
            <Button 
              variant={isBulkMode ? "default" : "outline"}
              onClick={() => setIsBulkMode(!isBulkMode)}
              className="h-10"
            >
              <Users className="w-4 h-4 mr-2" />
              {isBulkMode ? 'Exit Bulk' : 'Bulk Edit'}
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline"
            className="h-10"
            onClick={() => {
              if (selectedCountries.length > 0 && pricingMatrix) {
                const avgCurrentRate = selectedCountries.reduce((sum, code) => {
                  return sum + (pricingMatrix.countries[code]?.rate || 0);
                }, 0) / selectedCountries.length;
                calculateRevenueImpact(avgCurrentRate, avgCurrentRate * 1.1, selectedCountries);
              } else {
                toast({ 
                  title: 'Revenue Impact Calculator', 
                  description: 'Select countries and enable bulk mode to calculate revenue impact.',
                  variant: 'default'
                });
              }
            }}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Revenue Impact
          </Button>
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="h-10">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Bulk Editing Panel */}
      {isBulkMode && (
        <BulkEditingPanel
          countries={countries.map(country => {
            const pricing = pricingMatrix?.countries[country.code];
            return {
              code: country.code,
              name: country.name,
              continent: country.continent || 'Other',
              currency: country.currency || 'USD',
              rate: pricing?.rate || 0,
              tier: pricing?.tier || 'global',
              source: pricing?.source || 'Default',
              min_amount: pricing?.min_amount || 0,
              max_amount: pricing?.max_amount,
            };
          })}
          selectedCountries={selectedCountries}
          onSelectionChange={setSelectedCountries}
          onBulkUpdate={handleBulkUpdate}
          isLoading={false}
        />
      )}

      {/* Revenue Impact Analytics */}
      {revenueImpact && (
        <div className="mt-6">
          {renderRevenueeImpactAnalytics()}
        </div>
      )}

      {/* Main Content */}
      <div className="mt-6">
        {viewMode === 'table' ? (
          <PricingTableView
            pricingMatrix={pricingMatrix}
            countries={countries}
            onEditRate={async (countryCode: string, newRate: number, currency?: string, localAmount?: number) => {
              const service = services.find(s => s.service_key === selectedService);
              if (!service) {
                throw new Error('Service not found');
              }

              // Determine the reason based on whether this is a currency conversion
              const reason = currency && localAmount 
                ? `Local currency update: ${currency} ${localAmount} → $${newRate.toFixed(4)} USD`
                : `Manual update - ${new Date().toLocaleDateString()}`;

              // Create or update country override
              const { error } = await supabase
                .from('country_pricing_overrides')
                .upsert({
                  service_id: service.id,
                  country_code: countryCode,
                  rate: newRate,
                  currency_code: currency || 'USD', // Store the original currency
                  reason: reason,
                  notes: currency && localAmount ? `Original amount: ${currency} ${localAmount}` : undefined,
                  is_active: true,
                  effective_from: new Date().toISOString(),
                }, {
                  onConflict: 'service_id,country_code'
                });

              if (error) throw error;

              // Clear service cache for immediate updates
              regionalPricingService.clearCache();
              
              // Clear database cache for the specific service and country
              try {
                await supabase
                  .from('pricing_calculation_cache')
                  .delete()
                  .eq('service_id', service.id)
                  .eq('country_code', countryCode);
              } catch (cacheError) {
                console.warn('Failed to clear database cache:', cacheError);
              }

              // Refresh React Query data
              queryClient.invalidateQueries({ queryKey: ['pricing-matrix', selectedService] });
            }}
            isLoading={pricingLoading}
            pricingType={services.find(s => s.service_key === selectedService)?.pricing_type || 'percentage'}
          />
        ) : viewMode === 'hierarchy' ? (
          <HierarchicalPricingTree
            serviceKey={selectedService}
            serviceName={services.find(s => s.service_key === selectedService)?.service_name || 'Unknown Service'}
            pricingType={services.find(s => s.service_key === selectedService)?.pricing_type || 'percentage'}
            pricingMatrix={pricingMatrix}
            countries={countries}
            onRateUpdate={handleHierarchicalRateUpdate}
          />
        ) : viewMode === 'import-export' ? (
          <CSVImportExport
            services={services}
            onDataUpdate={() => queryClient.invalidateQueries({ queryKey: ['pricing-matrix', selectedService] })}
          />
        ) : (
          <PricingAuditLog
            serviceKey={selectedService}
          />
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(config) => {
          console.log('Settings saved:', config);
          // Handle settings save logic here
        }}
      />
    </div>
  );
});

RegionalPricingManager.displayName = 'RegionalPricingManager';