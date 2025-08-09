/**
 * IntegratedAddonServices - Addon Services integrated into Order Summary
 * 
 * Features:
 * - Same checkbox style as CompactPackageProtection  
 * - Seamlessly integrated into order summary
 * - Show more/show less functionality
 * - Consistent with existing order summary design
 * - Auto-selection of recommended services
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { addonServicesService } from '@/services/AddonServicesService';
import { currencyService } from '@/services/CurrencyService';
import { useCountryWithPricing } from '@/hooks/useCountryDetection';
import { toast } from '@/hooks/use-toast';
import { getServiceIcon } from '@/components/addon-services/shared/ServiceIconMap';

interface IntegratedAddonServicesProps {
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

const IntegratedAddonServicesBase: React.FC<IntegratedAddonServicesProps> = ({
  orderValue,
  currency,
  customerCountry,
  onSelectionChange,
  className = '',
}) => {

  // Use useRef for persistent state that survives component unmounts
  const selectionsRef = useRef<Map<string, AddonServiceSelection>>(new Map());
  const [selections, setSelections] = useState<Map<string, AddonServiceSelection>>(selectionsRef.current);
  const [showAllServices, setShowAllServices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltips, setShowTooltips] = useState<Set<string>>(new Set());
  
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
  
  // Load addon service recommendations with optimized caching
  const { data: addonData, isLoading, refetch } = useQuery({
    queryKey: ['integrated-addon-services', finalCountryCode, validOrderValue],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000);
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
    retryDelay: 2000,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Fallback services for errors
  const fallbackServices = useMemo(() => [
    {
      service_key: 'express_processing',
      service_name: 'Express Processing',
      pricing: { calculated_amount: finalCountryCode === 'IN' ? 8 : 15 },
      recommendation_score: 0.6,
      recommendation_reason: 'Faster processing available',
    }
  ], [finalCountryCode]);

  // Use actual data or fallback - memoized to prevent new object references
  const services = useMemo(() => {
    return addonData?.recommendations || (error ? fallbackServices : []);
  }, [addonData?.recommendations, error, fallbackServices]);

  
  // Split services into top recommendations and others
  const topServices = services.filter(s => s.recommendation_score >= 0.6).slice(0, 2);
  const otherServices = services.filter(s => s.recommendation_score < 0.6 || 
    !topServices.find(top => top.service_key === s.service_key));
  
  // Simple initialization - only run once when services first load
  useEffect(() => {
    if (services.length > 0 && selectionsRef.current.size === 0) {
      const newSelections = new Map<string, AddonServiceSelection>();
      
      services.forEach(service => {
        newSelections.set(service.service_key, {
          service_key: service.service_key,
          is_selected: false, // All start unchecked
          calculated_amount: service.pricing.calculated_amount,
          recommendation_score: service.recommendation_score,
        });
      });

      // Update both ref and state
      selectionsRef.current = newSelections;
      setSelections(newSelections);
    }
  }, [services]);

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

  // Handle service toggle - simple and straightforward
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

      // Update the ref as well
      selectionsRef.current = newSelections;
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

  // Handle tooltip toggle
  const toggleTooltip = useCallback((serviceKey: string) => {
    setShowTooltips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceKey)) {
        newSet.delete(serviceKey);
      } else {
        newSet.add(serviceKey);
      }
      return newSet;
    });
  }, []);

  // Render single service item (same style as CompactPackageProtection)
  const renderServiceItem = (service: any) => {
    const IconComponent = getServiceIcon(service.service_key);
    const selection = selections.get(service.service_key);
    const isSelected = selection?.is_selected || false;
    const isHighlyRecommended = service.recommendation_score >= 0.8;
    const showTooltip = showTooltips.has(service.service_key);

    // Clean render without debug logs
    
    
    return (
      <div key={service.service_key} className="relative py-2">
        {/* Main Line - Same style as CompactPackageProtection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              id={`addon-service-${service.service_key}`}
              checked={isSelected}
              onCheckedChange={(checked) => {
                handleServiceToggle(service.service_key, checked === true);
              }}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            
            <div className="flex items-center gap-2">
              <IconComponent className="w-4 h-4 text-gray-500" />
              <Label 
                htmlFor={`addon-service-${service.service_key}`}
                className="text-sm text-gray-700 cursor-pointer font-normal"
              >
                {service.service_name}
              </Label>
              
              {isHighlyRecommended && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Recommended
                </Badge>
              )}
              
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                onClick={() => toggleTooltip(service.service_key)}
                onMouseEnter={() => setShowTooltips(prev => new Set(prev).add(service.service_key))}
                onMouseLeave={() => setShowTooltips(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(service.service_key);
                  return newSet;
                })}
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Price - Always Shown */}
          <span className="text-sm font-medium text-gray-900">
            {currencyService.formatAmount(service.pricing.calculated_amount, currency)}
          </span>
        </div>

        {/* Subtitle - Same style as package protection */}
        <div className="ml-6 mt-1">
          <p className="text-xs text-gray-500">
            {service.recommendation_reason}
          </p>
        </div>

        {/* Simple Tooltip - Same style as package protection */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50 text-sm max-w-xs">
            <div className="font-medium text-gray-900 mb-2">{service.service_name}</div>
            <p className="text-xs text-gray-600 mb-2">{service.recommendation_reason}</p>
            {service.pricing.pricing_tier && (
              <div className="text-xs text-gray-500 pt-2 mt-2 border-t border-gray-100">
                {service.pricing.pricing_tier} pricing • Available in your region
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Don't render anything if loading or no services
  if (isLoading) {
    return (
      <div className={`py-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading services...</span>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return null;
  }


  return (
    <div className={className}>
      {/* Always visible top services */}
      {topServices.map(renderServiceItem)}
      
      {/* Show more/less toggle for other services */}
      {otherServices.length > 0 && (
        <>
          {showAllServices && otherServices.map(renderServiceItem)}
          
          <div className="py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllServices(!showAllServices)}
              className="text-xs text-gray-600 hover:text-gray-800 p-1 h-auto font-normal"
            >
              {showAllServices ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  {otherServices.length} more service{otherServices.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
      
      {/* Retry button if error */}
      {error && (
        <div className="py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              refetch();
            }}
            className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto font-normal"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Load all services
          </Button>
        </div>
      )}
    </div>
  );
};

// Wrap in React.memo with custom comparison to prevent unnecessary re-renders
export const IntegratedAddonServices = memo(IntegratedAddonServicesBase, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when props haven't meaningfully changed
  return (
    prevProps.orderValue === nextProps.orderValue &&
    prevProps.currency === nextProps.currency &&
    prevProps.customerCountry === nextProps.customerCountry &&
    prevProps.className === nextProps.className &&
    prevProps.onSelectionChange === nextProps.onSelectionChange
  );
});

IntegratedAddonServices.displayName = 'IntegratedAddonServices';

export default IntegratedAddonServices;