/**
 * EnhancedAddonServicesSelector - Smart Add-on Services for Customer Quotes
 * 
 * Features:
 * - Intelligent service recommendations based on location/order
 * - Real-time pricing with regional optimization
 * - Bundle suggestions with savings calculations
 * - Smart defaults and upselling
 * - Seamless integration with quote flow
 * 
 * Designed for maximum conversion and customer satisfaction
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  Zap,
  Headphones,
  Gift,
  Camera,
  Package,
  Star,
  TrendingUp,
  CheckCircle,
  Info,
  AlertTriangle,
  DollarSign,
  Percent,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Loader2,
  RefreshCw
} from 'lucide-react';

import { addonServicesService, type AddonServiceRecommendation, type AddonServicesBundle } from '@/services/AddonServicesService';
import { regionalPricingService } from '@/services/RegionalPricingService';
import { currencyService } from '@/services/CurrencyService';
import { useCountryWithPricing } from '@/hooks/useCountryDetection';
import { toast } from '@/hooks/use-toast';
import { getServiceIcon, getServiceColors } from '@/components/addon-services/shared/ServiceIconMap';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface EnhancedAddonServicesSelectorProps {
  quoteId?: string;
  orderValue: number;
  currency: string;
  customerCountry?: string;
  customerTier?: 'new' | 'regular' | 'vip';
  onSelectionChange: (selections: AddonServiceSelection[], totalCost: number) => void;
  showRecommendations?: boolean;
  showBundles?: boolean;
  compact?: boolean;
  className?: string;
}

interface AddonServiceSelection {
  service_key: string;
  is_selected: boolean;
  calculated_amount: number;
  recommendation_score?: number;
}

// ============================================================================
// SERVICE ICON MAPPING
// ============================================================================
// Using shared ServiceIconMap and ServiceColors from @/components/addon-services/shared/ServiceIconMap

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EnhancedAddonServicesSelector: React.FC<EnhancedAddonServicesSelectorProps> = ({
  quoteId,
  orderValue,
  currency,
  customerCountry,
  customerTier = 'regular',
  onSelectionChange,
  showRecommendations = true,
  showBundles = true,
  compact = false,
  className = '',
}) => {
  
  const [selections, setSelections] = useState<Map<string, AddonServiceSelection>>(new Map());
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  
  // Enhanced country detection with pricing integration and fallbacks
  const { countryCode: detectedCountry, hasRegionalPricing, countryInfo, isLoading: countryLoading } = useCountryWithPricing();
  
  // More robust country code detection with multiple fallbacks
  const finalCountryCode = useMemo(() => {
    // Priority: customerCountry → detectedCountry → user profile → US fallback
    if (customerCountry && customerCountry.length === 2) return customerCountry;
    if (detectedCountry && detectedCountry.length === 2) return detectedCountry;
    return 'US'; // Always fallback to US
  }, [customerCountry, detectedCountry]);
  
  // More robust order value calculation with fallbacks
  const validOrderValue = useMemo(() => {
    if (!orderValue || isNaN(orderValue) || orderValue <= 0) {
      console.warn('⚠️ [AddonServices] Invalid order value, using fallback:', {
        orderValue,
        type: typeof orderValue,
        isNaN: isNaN(orderValue),
        isPositive: orderValue > 0
      });
      return 50; // Better fallback value for addon calculations
    }
    return Math.max(orderValue, 0.01); // Ensure positive value
  }, [orderValue]);
  
  // Country detection completed
  
  // Show pricing optimization badge if we have regional pricing
  const showRegionalPricingBadge = hasRegionalPricing && countryInfo?.pricingInfo?.hasRegionalPricing;

  // Query enablement conditions with enhanced validation
  const queryEnabled = validOrderValue > 0 && !countryLoading && !!finalCountryCode;
  
  // Debug logging can be enabled for troubleshooting if needed
  // React.useEffect(() => {
  //   console.log('🔍 [AddonServices Debug] Query conditions:', {
  //     originalOrderValue: orderValue,
  //     validOrderValue,
  //     finalCountryCode,
  //     queryEnabled,
  //     currency,
  //     customerTier,
  //   });
  // }, [orderValue, validOrderValue, finalCountryCode, queryEnabled, currency, customerTier]);

  // Load addon service recommendations with timeout and enhanced error handling
  const { data: addonData, isLoading, error, refetch } = useQuery({
    queryKey: ['addon-services-recommendations', finalCountryCode, validOrderValue, customerTier],
    queryFn: async () => {
      // Add timeout promise race condition - reduced to 8 seconds since DB is fast
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Addon services request timed out after 8 seconds'));
        }, 8000); // 8 second timeout - more reasonable for fast local DB
      });
      
      const servicePromise = addonServicesService.getRecommendedServices(
        {
          country_code: finalCountryCode,
          order_value: validOrderValue,
          order_type: 'quote',
          customer_tier: customerTier,
        },
        currency
      );

      try {
        const result = await Promise.race([servicePromise, timeoutPromise]);

        if (!result.success) {
          throw new Error(result.error || 'Failed to load recommendations');
        }

        return result;
      } catch (error) {
        console.error('❌ [AddonServices] Query failed:', error);
        throw error;
      }
    },
    enabled: queryEnabled,
    retry: 3, // Increased retries since we have faster timeout
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000), // Faster exponential backoff: 0.5s, 1s, 2s
    staleTime: 3 * 60 * 1000, // 3 minutes - reduced cache time
    gcTime: 5 * 60 * 1000, // 5 minutes - reduced garbage collection time
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Enable reconnect refetch
    meta: {
      errorMessage: 'Failed to load addon services'
    }
  });

  // Loading timeout - show enhanced error message if loading takes too long
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTooLong(true);
      }, 10000); // 10 seconds timeout - reduced since we have 8s service timeout
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTooLong(false);
    }
  }, [isLoading]);

  // Calculate total cost when selections change
  const totalAddonCost = useMemo(() => {
    return Array.from(selections.values())
      .filter(s => s.is_selected)
      .reduce((sum, s) => sum + s.calculated_amount, 0);
  }, [selections]);

  // Notify parent of selection changes - use callback ref to avoid infinite loops
  const previousSelections = useRef<Map<string, AddonServiceSelection>>(new Map());
  const previousTotalCost = useRef<number>(0);
  
  useEffect(() => {
    // Only update if selections actually changed
    const hasSelectionChanged = 
      previousSelections.current.size !== selections.size ||
      Array.from(selections.entries()).some(([key, value]) => {
        const prev = previousSelections.current.get(key);
        return !prev || prev.is_selected !== value.is_selected || prev.calculated_amount !== value.calculated_amount;
      });
    
    const hasTotalChanged = previousTotalCost.current !== totalAddonCost;
    
    if (hasSelectionChanged || hasTotalChanged) {
      const selectedServices = Array.from(selections.values());
      onSelectionChange(selectedServices, totalAddonCost);
      
      // Update refs
      previousSelections.current = new Map(selections);
      previousTotalCost.current = totalAddonCost;
    }
  }, [selections, totalAddonCost]);

  // Auto-select recommended services on load
  useEffect(() => {
    if (addonData && addonData.recommendations.length > 0) {
      const newSelections = new Map<string, AddonServiceSelection>();
      
      addonData.recommendations.forEach(rec => {
        const isAutoSelected = 
          rec.recommendation_score >= 0.8 || // Highly recommended
          (rec.pricing.calculated_amount <= 5 && rec.recommendation_score >= 0.6); // Low cost, good score

        newSelections.set(rec.service_key, {
          service_key: rec.service_key,
          is_selected: isAutoSelected,
          calculated_amount: rec.pricing.calculated_amount,
          recommendation_score: rec.recommendation_score,
        });
      });

      setSelections(newSelections);
    }
  }, [addonData]);

  // Handle service selection toggle
  const handleServiceToggle = useCallback((serviceKey: string, isSelected: boolean) => {
    setSelections(prev => {
      const newSelections = new Map(prev);
      const current = newSelections.get(serviceKey);
      
      if (current) {
        newSelections.set(serviceKey, {
          ...current,
          is_selected: isSelected,
        });
      }

      return newSelections;
    });

    // Track selection for analytics
    if (isSelected) {
      toast({
        title: 'Service Added',
        description: `${serviceKey.replace('_', ' ')} has been added to your order`,
        duration: 2000,
      });
    }
  }, []);

  // Handle bundle selection
  const handleBundleSelect = useCallback((bundle: AddonServicesBundle) => {
    setSelections(prev => {
      const newSelections = new Map(prev);
      
      // Select all services in the bundle
      bundle.included_services.forEach(serviceKey => {
        const current = newSelections.get(serviceKey);
        if (current) {
          newSelections.set(serviceKey, {
            ...current,
            is_selected: true,
          });
        }
      });

      return newSelections;
    });

    toast({
      title: 'Bundle Selected',
      description: `${bundle.bundle_name} added - you save $${bundle.savings_amount.toFixed(2)}!`,
      duration: 3000,
    });
  }, []);

  // Get recommendation level styling
  const getRecommendationStyling = (score: number) => {
    if (score >= 0.8) return 'border-l-4 border-l-green-500 bg-green-50';
    if (score >= 0.6) return 'border-l-4 border-l-blue-500 bg-blue-50';
    if (score >= 0.4) return 'border-l-4 border-l-yellow-500 bg-yellow-50';
    return 'border-l-4 border-l-gray-300 bg-gray-50';
  };

  const getRecommendationBadge = (score: number) => {
    if (score >= 0.8) return { text: 'Highly Recommended', color: 'bg-green-600' };
    if (score >= 0.6) return { text: 'Recommended', color: 'bg-blue-600' };
    if (score >= 0.4) return { text: 'Consider', color: 'bg-yellow-600' };
    return { text: 'Optional', color: 'bg-gray-600' };
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderServiceRecommendation = (rec: AddonServiceRecommendation) => {
    const IconComponent = getServiceIcon(rec.service_key);
    const selection = selections.get(rec.service_key);
    const isSelected = selection?.is_selected || false;
    const badge = getRecommendationBadge(rec.recommendation_score);
    const serviceColor = getServiceColors(rec.service_key);

    return (
      <div
        key={rec.service_key}
        className={`p-4 rounded-lg border transition-all ${
          isSelected ? 'ring-2 ring-blue-500 ' + serviceColor : 'border-gray-200 hover:border-gray-300'
        } ${getRecommendationStyling(rec.recommendation_score)}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${serviceColor}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{rec.service_name}</h4>
                <Badge className={`text-white text-xs ${badge.color}`}>
                  {badge.text}
                </Badge>
                {rec.recommendation_score >= 0.8 && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{rec.recommendation_reason}</p>
              
              {/* Pricing Information */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-600">
                    {currencyService.formatAmount(rec.pricing.calculated_amount, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Target className="w-4 h-4" />
                  <span>{(rec.customer_acceptance_rate * 100).toFixed(0)}% choose this</span>
                </div>
                {rec.pricing.pricing_tier !== 'global' && (
                  <Badge variant="outline" className="text-xs">
                    {rec.pricing.pricing_tier} rate
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Recommendation Score: {(rec.recommendation_score * 100).toFixed(0)}%<br/>
                    {rec.pricing.source_description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Switch
              checked={isSelected}
              onCheckedChange={(checked) => handleServiceToggle(rec.service_key, checked)}
            />
          </div>
        </div>

        {/* Value Proposition */}
        {rec.recommendation_score >= 0.6 && (
          <Alert className="bg-blue-50 border-blue-200">
            <TrendingUp className="w-4 h-4" />
            <AlertDescription className="text-sm">
              This service adds approximately <strong>${rec.estimated_value_add.toFixed(0)}</strong> in protection value to your order.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderServiceBundle = (bundle: AddonServicesBundle) => {
    const isExpanded = expandedBundle === bundle.bundle_id;
    const allSelected = bundle.included_services.every(serviceKey => 
      selections.get(serviceKey)?.is_selected
    );

    return (
      <Card key={bundle.bundle_id} className="border-2 border-dashed border-purple-300 bg-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">{bundle.bundle_name}</CardTitle>
              {bundle.is_recommended && (
                <Badge className="bg-purple-600 text-white">
                  Best Value
                </Badge>
              )}
            </div>
            <Button 
              variant={allSelected ? "secondary" : "default"}
              onClick={() => handleBundleSelect(bundle)}
              disabled={allSelected}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {allSelected ? 'Selected' : `Save $${bundle.savings_amount.toFixed(2)}`}
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {bundle.included_services.length} services included
            </span>
            <div className="flex items-center gap-4">
              <span className="text-gray-500 line-through">
                {currencyService.formatAmount(bundle.total_individual_cost, currency)}
              </span>
              <span className="text-lg font-bold text-purple-600">
                {currencyService.formatAmount(bundle.bundle_cost, currency)}
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {bundle.bundle_discount_percentage.toFixed(0)}% OFF
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Collapsible open={isExpanded} onOpenChange={() => 
          setExpandedBundle(isExpanded ? null : bundle.bundle_id)
        }>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              View included services
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {bundle.included_services.map(serviceKey => {
                  const rec = addonData?.recommendations.find(r => r.service_key === serviceKey);
                  if (!rec) return null;

                  const IconComponent = getServiceIcon(serviceKey);
                  return (
                    <div key={serviceKey} className="flex items-center justify-between p-2 bg-white rounded">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span className="font-medium">{rec.service_name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {currencyService.formatAmount(rec.pricing.calculated_amount, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // Handle loading states
  if (countryLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2">Detecting your location...</span>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Setting up personalized pricing for your region
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading personalized recommendations...</span>
          </div>
          {loadingTooLong && (
            <div className="mt-4 text-center">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This is taking longer than expected. You can wait a bit more or try refreshing.
                  <br />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Emergency fallback data for when service fails
  const getFallbackAddonServices = () => {
    // Use validOrderValue since it has proper fallbacks
    const baseOrderValue = Math.max(validOrderValue, 50);
    
    const fallbackServices = [
      {
        service_key: 'package_protection',
        service_name: 'Package Protection Insurance',
        pricing: { 
          calculated_amount: Math.max(baseOrderValue * 0.025, 2.00), 
          pricing_tier: 'global' 
        },
        recommendation_score: 0.7,
        recommendation_reason: 'Essential protection for your shipment',
      },
      {
        service_key: 'express_processing', 
        service_name: 'Express Processing',
        pricing: { 
          calculated_amount: finalCountryCode === 'IN' ? 8 : finalCountryCode === 'NP' ? 10 : 15, 
          pricing_tier: 'global' 
        },
        recommendation_score: 0.5,
        recommendation_reason: 'Faster processing available',
      }
    ];

    return {
      success: true,
      available_services: fallbackServices,
      recommendations: fallbackServices,
      pricing_calculations: fallbackServices.map(s => s.pricing),
      suggested_bundles: [],
      total_addon_cost: 0,
      currency_code: currency,
    };
  };

  if (error || !addonData) {
    const fallbackData = getFallbackAddonServices();
    
    // Show enhanced error state with fallback services
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Add-on Services
            <Badge variant="secondary">Limited Mode</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-4 bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              {error?.message?.includes('timed out') ? (
                <>
                  Personalized recommendations are taking longer than expected. 
                  We're showing basic services while we retry in the background.
                </>
              ) : (
                <>
                  Using basic add-on services. Personalized recommendations will load shortly.
                </>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Fallback Services */}
          <div className="space-y-3">
            {fallbackData.recommendations.map((service) => (
              <div key={service.service_key} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = getServiceIcon(service.service_key);
                      return <IconComponent className={`w-4 h-4 ${
                        service.service_key === 'package_protection' ? 'text-green-600' : 'text-blue-600'
                      }`} />;
                    })()}
                    <span className="font-medium">{service.service_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">
                      {currencyService.formatAmount(service.pricing.calculated_amount, currency)}
                    </span>
                    <Switch
                      checked={false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const fallbackSelection = {
                            service_key: service.service_key,
                            is_selected: true,
                            calculated_amount: service.pricing.calculated_amount,
                          };
                          onSelectionChange([fallbackSelection], service.pricing.calculated_amount);
                          toast({
                            title: 'Service Added',
                            description: `${service.service_name} has been added with standard pricing`,
                            duration: 3000,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{service.recommendation_reason}</p>
              </div>
            ))}
          </div>
          
          {/* Debug info for development */}
          {import.meta.env.DEV && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="text-xs">
                  <strong>Debug Info:</strong><br/>
                  Country: {finalCountryCode} | Order Value: {validOrderValue} | Currency: {currency}
                  <br/>Query Enabled: {queryEnabled ? 'Yes' : 'No'} | Error: {error?.message || 'None'}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading Full Services...
                </>
              ) : (
                'Load Personalized Services'
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.reload()}
              title="Reload entire page"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topRecommendations = addonData.recommendations.filter(r => r.recommendation_score >= 0.5);
  const otherServices = addonData.recommendations.filter(r => r.recommendation_score < 0.5);
  const selectedCount = Array.from(selections.values()).filter(s => s.is_selected).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Add-on Services
            {selectedCount > 0 && (
              <Badge variant="secondary">{selectedCount} selected</Badge>
            )}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Personalized recommendations for {finalCountryCode} • Order value: {currencyService.formatAmount(orderValue, currency)}
            {showRegionalPricingBadge && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                Optimized Regional Pricing
              </Badge>
            )}
          </p>
        </div>

        {totalAddonCost > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Add-ons</p>
            <p className="text-xl font-bold text-green-600">
              {currencyService.formatAmount(totalAddonCost, currency)}
            </p>
          </div>
        )}
      </div>

      {/* Service Bundles */}
      {showBundles && addonData.suggested_bundles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Special Bundles
          </h4>
          {addonData.suggested_bundles.map(renderServiceBundle)}
        </div>
      )}

      {/* Top Recommendations */}
      {showRecommendations && topRecommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Recommended for You
          </h4>
          <div className="grid gap-3">
            {topRecommendations.map(renderServiceRecommendation)}
          </div>
        </div>
      )}

      {/* Other Services */}
      {otherServices.length > 0 && (
        <div className="space-y-3">
          <Collapsible open={showAllServices} onOpenChange={setShowAllServices}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Other Available Services ({otherServices.length})
                {showAllServices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-3 mt-3">
                {otherServices.map(renderServiceRecommendation)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium">
                  {selectedCount} service{selectedCount !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Additional Cost</p>
                <p className="text-xl font-bold text-blue-600">
                  {currencyService.formatAmount(totalAddonCost, currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};