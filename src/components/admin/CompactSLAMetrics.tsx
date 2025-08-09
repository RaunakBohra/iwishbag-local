/**
 * Compact SLA Metrics - Shows key metrics in header format
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { slaService } from '@/services/SLAService';

export const CompactSLAMetrics: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['sla-dashboard-metrics'],
    queryFn: () => slaService.getDashboardMetrics(),
    refetchInterval: 60000, // Refresh every minute for header
    staleTime: 30000, // Consider stale after 30 seconds
  });

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right animate-pulse">
          <p className="text-xs text-gray-500">Response Time</p>
          <div className="h-4 w-12 bg-gray-200 rounded"></div>
        </div>
        <div className="text-right animate-pulse">
          <p className="text-xs text-gray-500">SLA</p>
          <div className="h-4 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="text-right animate-pulse">
          <p className="text-xs text-gray-500">Satisfaction</p>
          <div className="h-4 w-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const formatResponseTime = (minutes: number | null): string => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.round(minutes / 60 * 10) / 10}h`;
  };

  const getSLAColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSatisfactionColor = (rating: number | null): string => {
    if (!rating) return 'text-gray-500';
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-4">
      {/* Response Time */}
      <div className="text-right">
        <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" />
          Response Time
        </p>
        <p className={`text-sm font-semibold ${getSLAColor(metrics.responseSLAComplianceRate)}`}>
          {formatResponseTime(metrics.avgFirstResponseMinutes)} avg
        </p>
      </div>

      {/* SLA Compliance */}
      <div className="text-right">
        <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
          <TrendingUp className="h-3 w-3" />
          SLA
        </p>
        <p className={`text-sm font-semibold ${getSLAColor(metrics.responseSLAComplianceRate)}`}>
          {metrics.responseSLAComplianceRate.toFixed(0)}%
        </p>
      </div>

      {/* Customer Satisfaction */}
      <div className="text-right">
        <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
          <Star className="h-3 w-3" />
          Satisfaction
        </p>
        <p className={`text-sm font-semibold ${getSatisfactionColor(metrics.customerSatisfactionAvg)}`}>
          {metrics.customerSatisfactionAvg 
            ? `${metrics.customerSatisfactionAvg.toFixed(1)}/5.0`
            : 'N/A'
          }
        </p>
      </div>

      {/* Alert for overdue tickets */}
      {metrics.ticketsOverdue > 0 && (
        <div className="text-right">
          <p className="text-xs text-red-500 flex items-center justify-end gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </p>
          <p className="text-sm font-semibold text-red-600">
            {metrics.ticketsOverdue}
          </p>
        </div>
      )}
    </div>
  );
};