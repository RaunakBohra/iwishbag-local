/**
 * ServiceSelector - Service Selection Component for Regional Pricing
 * 
 * Features:
 * - Service dropdown with icons and badges
 * - Real-time statistics display
 * - Professional styling with service metadata
 * - Reusable component extracted from main manager
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Package,
  Globe,
  Target,
  TrendingUp,
  Shield,
  Zap,
  Headphones,
  Gift,
  Camera
} from 'lucide-react';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface Service {
  service_key: string;
  service_name: string;
  badge_text?: string;
  pricing_type: 'percentage' | 'fixed';
  is_active: boolean;
}

interface PricingStats {
  total_countries: number;
  coverage_percentage: number;
  avg_rate: number;
  min_rate: number;
  max_rate: number;
  tier_distribution: Record<string, number>;
}

interface ServiceSelectorProps {
  services: Service[];
  selectedService: string;
  onServiceChange: (serviceKey: string) => void;
  pricingStats?: PricingStats | null;
  isLoading?: boolean;
}

// ============================================================================
// SERVICE ICON MAPPING
// ============================================================================

const ServiceIconMap: Record<string, React.ComponentType<any>> = {
  'package_protection': Shield,
  'express_processing': Zap,
  'priority_support': Headphones,
  'gift_wrapping': Gift,
  'photo_documentation': Camera,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ServiceSelector: React.FC<ServiceSelectorProps> = React.memo(({
  services,
  selectedService,
  onServiceChange,
  pricingStats,
  isLoading = false
}) => {
  
  // Get current service details
  const currentService = services.find(s => s.service_key === selectedService);
  
  return (
    <div className="flex items-center justify-between">
      {/* Service Selection */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-600" />
          <Label className="text-base font-semibold text-gray-700">Service:</Label>
        </div>
        <Select value={selectedService} onValueChange={onServiceChange} disabled={isLoading}>
          <SelectTrigger className="w-[350px] h-12 bg-white border-2 border-blue-200">
            <SelectValue placeholder="Select addon service" />
          </SelectTrigger>
          <SelectContent>
            {services
              .filter(service => service.is_active)
              .map((service) => {
                const IconComponent = ServiceIconMap[service.service_key] || Package;
                return (
                  <SelectItem key={service.service_key} value={service.service_key}>
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium">{service.service_name}</span>
                      {service.badge_text && (
                        <Badge variant="secondary" className="text-xs">
                          {service.badge_text}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
          </SelectContent>
        </Select>
      </div>

      {/* Service Statistics */}
      {pricingStats && !isLoading && (
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-white text-base px-4 py-2">
            <Globe className="w-4 h-4 mr-2" />
            {pricingStats.total_countries} countries
          </Badge>
          <Badge variant="outline" className="bg-white text-base px-4 py-2">
            <Target className="w-4 h-4 mr-2" />
            {pricingStats.coverage_percentage.toFixed(1)}% coverage
          </Badge>
          <Badge variant="outline" className="bg-white text-base px-4 py-2">
            <TrendingUp className="w-4 h-4 mr-2" />
            {currentService?.pricing_type === 'percentage' 
              ? `${(pricingStats.avg_rate * 100).toFixed(2)}% avg`
              : `$${pricingStats.avg_rate.toFixed(2)} avg`
            }
          </Badge>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.selectedService === nextProps.selectedService &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.services.length === nextProps.services.length &&
    JSON.stringify(prevProps.pricingStats) === JSON.stringify(nextProps.pricingStats)
  );
});

ServiceSelector.displayName = 'ServiceSelector';