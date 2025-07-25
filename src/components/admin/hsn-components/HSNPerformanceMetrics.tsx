/**
 * HSN Performance Metrics
 * Displays performance statistics and real-time metrics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Clock,
  Zap,
  Database,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface PerformanceStats {
  totalCalculations: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  apiCallsSaved: number;
  errorsHandled: number;
}

interface RealTimeUpdates {
  taxRatesUpdated: boolean;
  weightDetected: boolean;
  hsnCodesClassified: number;
  apiCallsMade: number;
  cacheHits: number;
}

interface HSNPerformanceMetricsProps {
  performanceStats?: PerformanceStats;
  realTimeUpdates?: RealTimeUpdates;
  showDetailedMetrics?: boolean;
}

export const HSNPerformanceMetrics: React.FC<HSNPerformanceMetricsProps> = ({
  performanceStats,
  realTimeUpdates,
  showDetailedMetrics = true,
}) => {
  if (!performanceStats && !realTimeUpdates) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No performance data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate performance indicators
  const getPerformanceStatus = () => {
    if (!performanceStats) return 'unknown';

    if (performanceStats.averageProcessingTime < 1000 && performanceStats.cacheHitRate > 0.8) {
      return 'excellent';
    } else if (
      performanceStats.averageProcessingTime < 2000 &&
      performanceStats.cacheHitRate > 0.6
    ) {
      return 'good';
    } else if (performanceStats.averageProcessingTime < 5000) {
      return 'fair';
    } else {
      return 'poor';
    }
  };

  const performanceStatus = getPerformanceStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'good':
        return 'text-blue-600 bg-blue-50';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4" />;
      case 'good':
        return <TrendingUp className="h-4 w-4" />;
      case 'fair':
        return <Activity className="h-4 w-4" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Overview
            <Badge variant="outline" className={getStatusColor(performanceStatus)}>
              {getStatusIcon(performanceStatus)}
              {performanceStatus.charAt(0).toUpperCase() + performanceStatus.slice(1)}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {performanceStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Target className="h-3 w-3" />
                  Total Calculations
                </div>
                <div className="text-lg font-semibold">{performanceStats.totalCalculations}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="h-3 w-3" />
                  Avg Processing Time
                </div>
                <div className="text-lg font-semibold">
                  {performanceStats.averageProcessingTime.toFixed(0)}ms
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Database className="h-3 w-3" />
                  Cache Hit Rate
                </div>
                <div className="text-lg font-semibold">
                  {Math.round(performanceStats.cacheHitRate * 100)}%
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Zap className="h-3 w-3" />
                  API Calls Saved
                </div>
                <div className="text-lg font-semibold">{performanceStats.apiCallsSaved}</div>
              </div>
            </div>
          )}

          {realTimeUpdates && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Current Session</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">HSN Codes Classified</span>
                  <span className="font-medium">{realTimeUpdates.hsnCodesClassified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">API Calls Made</span>
                  <span className="font-medium">{realTimeUpdates.apiCallsMade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cache Hits</span>
                  <span className="font-medium">{realTimeUpdates.cacheHits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Real-time Updates</span>
                  <Badge
                    variant={realTimeUpdates.taxRatesUpdated ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {realTimeUpdates.taxRatesUpdated ? 'Active' : 'Cached'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      {showDetailedMetrics && performanceStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detailed Metrics
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Processing Time Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Processing Speed</span>
                <span className="font-medium">
                  {performanceStats.averageProcessingTime < 1000
                    ? 'Excellent'
                    : performanceStats.averageProcessingTime < 2000
                      ? 'Good'
                      : performanceStats.averageProcessingTime < 5000
                        ? 'Fair'
                        : 'Needs Improvement'}
                </span>
              </div>
              <Progress
                value={Math.max(0, 100 - performanceStats.averageProcessingTime / 50)}
                className="h-2"
              />
              <div className="text-xs text-gray-500">
                Target: &lt;1000ms | Current: {performanceStats.averageProcessingTime.toFixed(0)}ms
              </div>
            </div>

            {/* Cache Efficiency */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cache Efficiency</span>
                <span className="font-medium">
                  {Math.round(performanceStats.cacheHitRate * 100)}%
                </span>
              </div>
              <Progress value={performanceStats.cacheHitRate * 100} className="h-2" />
              <div className="text-xs text-gray-500">
                Higher cache hit rates reduce API calls and improve performance
              </div>
            </div>

            {/* Error Rate */}
            {performanceStats.errorsHandled > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Error Rate</span>
                  <span className="font-medium text-red-600">
                    {(
                      (performanceStats.errorsHandled / performanceStats.totalCalculations) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (performanceStats.errorsHandled / performanceStats.totalCalculations) * 100
                  }
                  className="h-2"
                />
                <div className="text-xs text-gray-500">
                  {performanceStats.errorsHandled} errors out of{' '}
                  {performanceStats.totalCalculations} calculations
                </div>
              </div>
            )}

            {/* Performance Recommendations */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-medium text-blue-800 mb-1">Performance Tips</h5>
              <ul className="text-xs text-blue-700 space-y-1">
                {performanceStats.cacheHitRate < 0.6 && (
                  <li>• Consider increasing cache duration to improve hit rate</li>
                )}
                {performanceStats.averageProcessingTime > 2000 && (
                  <li>• Enable batch processing to reduce individual calculation time</li>
                )}
                {performanceStats.errorsHandled > performanceStats.totalCalculations * 0.05 && (
                  <li>• High error rate detected - check government API status</li>
                )}
                <li>• Enable auto-classification to reduce manual intervention</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
