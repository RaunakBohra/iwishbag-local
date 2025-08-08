/**
 * CompactPackageProtection - Shopify/Amazon style insurance component
 * 
 * Features:
 * - Single line layout like Shopify/Amazon
 * - Minimal space usage (2-3 lines max)
 * - Clean alignment
 * - Simple tooltip for details
 * - Mobile optimized
 */

import React, { useState } from 'react';
import { Shield, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { currencyService } from '@/services/CurrencyService';

interface CompactPackageProtectionProps {
  orderValue: number;
  currency: string;
  insuranceRate: number;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
  isLoading?: boolean;
  isInternational?: boolean;
  className?: string;
}

export const CompactPackageProtection: React.FC<CompactPackageProtectionProps> = ({
  orderValue,
  currency,
  insuranceRate,
  isSelected,
  onToggle,
  isLoading = false,
  isInternational = false,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const protectionCost = orderValue * insuranceRate;
  const protectionCostFormatted = currencyService.formatAmount(protectionCost, currency);

  return (
    <div className={`relative py-2 ${className}`}>
      {/* Main Line - Shopify/Amazon Style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            id="package-protection-compact"
            checked={isSelected}
            onCheckedChange={onToggle}
            disabled={isLoading}
            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
          />
          
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="package-protection-compact"
              className="text-sm text-gray-700 cursor-pointer font-normal"
            >
              Package Protection ({(insuranceRate * 100).toFixed(1)}%)
            </Label>
            
            <button 
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Price - Always Shown */}
        <span className="text-sm font-medium text-gray-900">
          {protectionCostFormatted}
        </span>
      </div>

      {/* Subtitle - Better Aligned */}
      <div className="ml-6 mt-1">
        <p className="text-xs text-gray-500">
          Covers theft, damage & loss
          {isInternational && ' • International shipping protection'}
        </p>
      </div>

      {/* Simple Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50 text-sm max-w-xs">
          <div className="font-medium text-gray-900 mb-2">Coverage includes:</div>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Package theft & loss</li>
            <li>• Shipping damage</li>
            <li>• Wrong delivery</li>
            {isInternational && <li>• Customs issues</li>}
          </ul>
          <div className="text-xs text-gray-500 pt-2 mt-2 border-t border-gray-100">
            File claims 24/7 • Instant resolution
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="ml-6 mt-1 flex items-center gap-2 text-xs text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
          <span>Updating...</span>
        </div>
      )}
    </div>
  );
};

export default CompactPackageProtection;