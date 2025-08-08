/**
 * CompactAddonServices - Streamlined add-on services for checkout
 * 
 * Features:
 * - Ultra-compact design perfect for checkout flow
 * - Essential information only (service name, price, toggle)
 * - Smart pre-selection based on recommendations
 * - Minimal visual clutter
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { addonServicesService } from '@/services/AddonServicesService';
import { currencyService } from '@/services/CurrencyService';
import { useCountryWithPricing } from '@/hooks/useCountryDetection';
import { toast } from '@/hooks/use-toast';
import { getServiceIcon } from '@/components/addon-services/shared/ServiceIconMap';

interface CompactAddonServicesProps {
  orderValue: number;
  currency: string;
  customerCountry?: string;
  onSelectionChange: (selections: AddonServiceSelection[], totalCost: number) => void;
  className?: string;
}

interface AddonServiceSelection {
  service_key: string;
  is_selected: boolean;
  calculated_amount: number;
  recommendation_score?: number;
}


export const CompactAddonServices: React.FC<CompactAddonServicesProps> = ({
  orderValue,
  currency,
  customerCountry,
  onSelectionChange,
  className = '',
}) => {
  const [selections, setSelections] = useState<Map<string, AddonServiceSelection>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced country detection
  const { countryCode: detectedCountry, isLoading: countryLoading } = useCountryWithPricing();
  
  const finalCountryCode = useMemo(() => {
    if (customerCountry && customerCountry.length === 2) return customerCountry;
    if (detectedCountry && detectedCountry.length === 2) return detectedCountry;
    return 'US';
  }, [customerCountry, detectedCountry]);
  
  const validOrderValue = useMemo(() => {
    if (!orderValue || isNaN(orderValue) || orderValue <= 0) {
      return 50; // Fallback value
    }
    return Math.max(orderValue, 0.01);
  }, [orderValue]);

  // Query enablement conditions
  const queryEnabled = validOrderValue > 0 && !countryLoading && !!finalCountryCode;
  
  // Load addon service recommendations with fast timeout
  const { data: addonData, isLoading, refetch } = useQuery({
    queryKey: ['compact-addon-services', finalCountryCode, validOrderValue],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000); // 5s timeout
      });
      
      const servicePromise = addonServicesService.getRecommendedServices({
        country_code: finalCountryCode,
        order_value: validOrderValue,
        order_type: 'quote',
        customer_tier: 'regular',
      }, currency);

      try {
        const result = await Promise.race([servicePromise, timeoutPromise]);
        if (!result.success) throw new Error(result.error || 'Failed to load');
        return result;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    },
    enabled: queryEnabled,
    retry: 1,
    retryDelay: 1000,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
  });

  // Fallback services for errors
  const fallbackServices = useMemo(() => [
    {
      service_key: 'package_protection',
      service_name: 'Package Protection',
      pricing: { calculated_amount: Math.max(validOrderValue * 0.025, 2.00) },
      recommendation_score: 0.8,
    },
    {
      service_key: 'express_processing',
      service_name: 'Express Processing',
      pricing: { calculated_amount: finalCountryCode === 'IN' ? 8 : 15 },
      recommendation_score: 0.6,
    }
  ], [validOrderValue, finalCountryCode]);

  // Use actual data or fallback
  const services = addonData?.recommendations || (error ? fallbackServices : []);
  
  // Auto-select highly recommended services
  useEffect(() => {
    if (services.length > 0 && selections.size === 0) {
      const newSelections = new Map<string, AddonServiceSelection>();
      
      services.forEach(service => {
        const autoSelect = service.recommendation_score >= 0.8;
        newSelections.set(service.service_key, {
          service_key: service.service_key,
          is_selected: autoSelect,
          calculated_amount: service.pricing.calculated_amount,
          recommendation_score: service.recommendation_score,
        });
      });

      setSelections(newSelections);
    }
  }, [services, selections.size]);

  // Calculate total cost
  const totalAddonCost = useMemo(() => {
    return Array.from(selections.values())
      .filter(s => s.is_selected)
      .reduce((sum, s) => sum + s.calculated_amount, 0);
  }, [selections]);

  // Notify parent of changes (with change detection to prevent loops)
  const previousSelections = useRef<Map<string, AddonServiceSelection>>(new Map());
  const previousTotalCost = useRef<number>(0);
  
  useEffect(() => {
    const hasChanged = 
      previousSelections.current.size !== selections.size ||
      previousTotalCost.current !== totalAddonCost ||
      Array.from(selections.entries()).some(([key, value]) => {
        const prev = previousSelections.current.get(key);
        return !prev || prev.is_selected !== value.is_selected;
      });
    
    if (hasChanged) {
      onSelectionChange(Array.from(selections.values()), totalAddonCost);
      previousSelections.current = new Map(selections);
      previousTotalCost.current = totalAddonCost;
    }
  }, [selections, totalAddonCost, onSelectionChange]);

  // Handle service toggle
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

    if (isSelected) {
      const serviceName = services.find(s => s.service_key === serviceKey)?.service_name || serviceKey;
      toast({
        title: 'Service Added',
        description: `${serviceName} added to your order`,
        duration: 2000,
      });
    }
  }, [services]);

  // Render compact service item
  const renderCompactService = (service: any) => {
    const IconComponent = getServiceIcon(service.service_key);
    const selection = selections.get(service.service_key);
    const isSelected = selection?.is_selected || false;
    const isHighlyRecommended = service.recommendation_score >= 0.8;

    return (
      <div 
        key={service.service_key} 
        className={`flex items-center justify-between py-2 px-3 rounded-md border transition-all ${
          isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <IconComponent className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{service.service_name}</span>
              {isHighlyRecommended && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Recommended
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-600">
              {currencyService.formatAmount(service.pricing.calculated_amount, currency)}
            </span>
          </div>
        </div>
        <Switch
          size="sm"
          checked={isSelected}
          onCheckedChange={(checked) => handleServiceToggle(service.service_key, checked)}
        />
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={`${className} border-dashed`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading services...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main render
  const selectedCount = Array.from(selections.values()).filter(s => s.is_selected).length;
  const topServices = services.slice(0, 2); // Show top 2 by default
  const additionalServices = services.slice(2);

  return (
    <Card className={`${className} ${error ? 'border-yellow-300' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Add-on Services
            {selectedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedCount} selected
              </Badge>
            )}
          </CardTitle>
          {totalAddonCost > 0 && (
            <span className="text-sm font-semibold text-green-600">
              +{currencyService.formatAmount(totalAddonCost, currency)}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-yellow-600">
            Using basic services - full recommendations temporarily unavailable
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 pb-4">
        <div className="space-y-2">
          {/* Always visible top services */}
          {topServices.map(renderCompactService)}
          
          {/* Expandable additional services */}
          {additionalServices.length > 0 && (
            <>
              {isExpanded && additionalServices.map(renderCompactService)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-xs text-gray-600 hover:text-gray-800 mt-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    {additionalServices.length} More Services
                  </>
                )}
              </Button>
            </>
          )}
          
          {/* Retry button if error */}
          {error && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                refetch();
              }}
              className="w-full text-xs mt-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Load Full Services
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactAddonServices;