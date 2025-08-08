/**
 * PackageProtection - Enhanced insurance component with conversion optimization
 * 
 * Features:
 * - Clear value proposition and benefits
 * - Coverage scenario examples
 * - Progressive disclosure for details
 * - Dynamic risk-based messaging
 * - Social proof elements
 * - Mobile-optimized experience
 */

import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Check, 
  Truck, 
  Package, 
  Clock, 
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { currencyService } from '@/services/CurrencyService';

interface PackageProtectionProps {
  orderValue: number;
  currency: string;
  insuranceRate: number;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
  isLoading?: boolean;
  isInternational?: boolean;
  destinationCountry?: string;
  className?: string;
}

export const PackageProtection: React.FC<PackageProtectionProps> = ({
  orderValue,
  currency,
  insuranceRate,
  isSelected,
  onToggle,
  isLoading = false,
  isInternational = false,
  destinationCountry,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate protection cost
  const protectionCost = orderValue * insuranceRate;
  const protectionCostFormatted = currencyService.formatAmount(protectionCost, currency);
  const orderValueFormatted = currencyService.formatAmount(orderValue, currency);

  // Dynamic messaging based on order characteristics
  const riskMessaging = useMemo(() => {
    if (isInternational) {
      return {
        level: 'higher',
        message: 'International orders have 40% higher risk of shipping issues',
        icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
        color: 'text-orange-600'
      };
    }
    
    if (orderValue > 200) {
      return {
        level: 'elevated',
        message: 'High-value orders are 3x more likely to be targeted by theft',
        icon: <Shield className="w-4 h-4 text-blue-500" />,
        color: 'text-blue-600'
      };
    }

    return {
      level: 'standard',
      message: 'Protect your order against common shipping risks',
      icon: <Package className="w-4 h-4 text-gray-500" />,
      color: 'text-gray-600'
    };
  }, [isInternational, orderValue]);

  // Coverage benefits tooltip content
  const coverageTooltipContent = (
    <div className="space-y-3">
      <div className="font-semibold text-gray-900">Complete Protection Coverage</div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm">Package stolen from doorstep</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm">Damaged during shipping</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm">Lost by carrier</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm">Wrong item delivered</span>
        </div>
        {isInternational && (
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm">Customs delays & damages</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Clock className="w-3 h-3" />
          <span>Claims resolved in under 24 hours</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
          <Users className="w-3 h-3" />
          <span>Trusted by 500K+ customers worldwide</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Protection Option */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            id="package-protection"
            checked={isSelected}
            onCheckedChange={onToggle}
            disabled={isLoading}
            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
          />
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="package-protection"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Package Protection
            </Label>
            <InfoTooltip
              content={coverageTooltipContent}
              side="top"
              className="bg-white border shadow-lg"
            />
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {(insuranceRate * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>
        
        {/* Protection Cost */}
        {isSelected && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{protectionCostFormatted}</span>
          </div>
        )}
      </div>

      {/* Risk-based messaging */}
      <div className={`flex items-center gap-2 text-xs ${riskMessaging.color} ml-8`}>
        {riskMessaging.icon}
        <span>{riskMessaging.message}</span>
      </div>

      {/* Value proposition when selected */}
      {isSelected && (
        <div className="ml-8 p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <Shield className="w-4 h-4" />
            <span className="font-medium">
              Your {orderValueFormatted} order is now protected
            </span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            Instant replacement or refund if anything goes wrong during shipping
          </p>
        </div>
      )}

      {/* Progressive disclosure for detailed benefits */}
      <div className="ml-8">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>Coverage details</span>
          {showDetails ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {showDetails && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md space-y-2">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="font-medium text-gray-900">What's covered:</div>
              <div className="flex items-center gap-2">
                <Truck className="w-3 h-3 text-blue-500" />
                <span>Shipping carrier losses & damages</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-3 h-3 text-purple-500" />
                <span>Package theft & porch piracy</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-orange-500" />
                <span>Delivery delays beyond 14 days</span>
              </div>
              {isInternational && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span>Customs hold damages & losses</span>
                </div>
              )}
            </div>
            
            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
              <div>• File claims instantly via email or phone</div>
              <div>• Get replacement order or full refund</div>
              <div>• No deductibles or hidden fees</div>
              <div>• 24/7 customer support available</div>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-500 ml-8">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
          <span>Updating protection coverage...</span>
        </div>
      )}

      {/* Social proof */}
      {!showDetails && (
        <div className="ml-8 text-xs text-gray-500">
          <span>✓ Trusted by 500K+ customers • 98% claims satisfaction</span>
        </div>
      )}
    </div>
  );
};

export default PackageProtection;