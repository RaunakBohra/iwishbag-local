import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { getQuoteCalculationMetrics } from '@/services/ErrorHandlingService';
import { cn } from '@/lib/utils';

/**
 * Compact widget showing quote system health
 * Can be embedded in other admin dashboards
 */
interface QuoteMetrics {
  totalQuotes: number;
  successRate: number;
  errorRate: number;
  avgProcessingTime: number;
  recentErrors: Array<{
    error: string;
    count: number;
  }>;
}

export function QuoteHealthWidget() {
  const [metrics, setMetrics] = useState<QuoteMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getQuoteCalculationMetrics(60);
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching quote metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (isLoading || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = Math.round(
    metrics.successRate * 0.5 +
      Math.max(0, 100 - metrics.errorRate) * 0.3 +
      Math.max(0, 100 - metrics.averageCalculationTime / 50) * 0.2,
  );

  const healthStatus = healthScore >= 90 ? 'success' : healthScore >= 70 ? 'warning' : 'error';
  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Quote System Health
          </CardTitle>
          <Badge
            variant={
              healthStatus === 'success'
                ? 'default'
                : healthStatus === 'warning'
                  ? 'secondary'
                  : 'destructive'
            }
            className="ml-auto"
          >
            {healthScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Success Rate</span>
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', statusColors[healthStatus])}>
              {metrics.successRate.toFixed(1)}%
            </span>
            {metrics.successRate >= 95 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
          </div>
        </div>

        <Progress value={healthScore} className="h-2" />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Calculations/hr</span>
            <span className="font-medium">{metrics.totalCalculations}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Time</span>
            <span className="font-medium">{Math.round(metrics.averageCalculationTime)}ms</span>
          </div>
        </div>

        {metrics.errorRate > 5 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <AlertCircle className="h-3 w-3 text-yellow-600" />
            <span className="text-xs text-yellow-600">
              High error rate: {metrics.errorRate.toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
