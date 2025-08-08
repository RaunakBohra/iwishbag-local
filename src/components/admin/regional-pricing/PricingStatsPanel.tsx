/**
 * PricingStatsPanel - Statistical Overview Component for Regional Pricing
 * 
 * Features:
 * - Real-time pricing statistics display
 * - Min/max/average rate visualization  
 * - Coverage percentage tracking
 * - Professional card-based layout
 * - Responsive design for mobile/desktop
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  Target, 
  Globe 
} from 'lucide-react';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface PricingStats {
  min_rate: number;
  max_rate: number;
  avg_rate: number;
  coverage_percentage: number;
  total_countries: number;
  overrides_count: number;
  inheritance_breakdown: {
    global: number;
    continental: number;
    regional: number;
    country: number;
  };
}

interface PricingStatsPanelProps {
  stats: PricingStats | null;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PricingStatsPanel: React.FC<PricingStatsPanelProps> = ({
  stats,
  isLoading = false,
  className = ""
}) => {
  
  if (isLoading) {
    return (
      <div className={`grid grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`grid grid-cols-4 gap-4 ${className}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">No Data</span>
            </div>
            <p className="text-2xl font-bold text-gray-400">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">No Data</span>
            </div>
            <p className="text-2xl font-bold text-gray-400">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">No Data</span>
            </div>
            <p className="text-2xl font-bold text-gray-400">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">No Data</span>
            </div>
            <p className="text-2xl font-bold text-gray-400">—</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-4 gap-4 ${className}`}>
      {/* Min Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Min Rate</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {(stats.min_rate * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Lowest across all markets
          </p>
        </CardContent>
      </Card>

      {/* Max Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium">Max Rate</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {(stats.max_rate * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Highest across all markets
          </p>
        </CardContent>
      </Card>

      {/* Average Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Average</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {(stats.avg_rate * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Weighted average rate
          </p>
        </CardContent>
      </Card>

      {/* Coverage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Coverage</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {stats.coverage_percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.total_countries} countries supported
          </p>
        </CardContent>
      </Card>
    </div>
  );
};