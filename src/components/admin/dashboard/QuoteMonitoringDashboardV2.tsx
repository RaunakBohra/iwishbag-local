import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, RefreshCw, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { useQuoteMonitoring } from '@/hooks/useQuoteMonitoring';
import { cn } from '@/lib/utils';

/**
 * Quote Monitoring Dashboard using React Query
 * This version provides better loading states and automatic refetching
 */
export function QuoteMonitoringDashboardV2() {
  const {
    performanceMetrics,
    businessMetrics,
    alertSummary,
    isLoading,
    isError,
    refetchAll,
    queries,
  } = useQuoteMonitoring({
    refetchInterval: 30000, // 30 seconds
  });

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-muted-foreground">Error loading monitoring data</p>
          <Button onClick={refetchAll} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isRefetching =
    queries.performance.isRefetching ||
    queries.business.isRefetching ||
    queries.alerts.isRefetching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quote Monitoring</h2>
          <p className="text-muted-foreground">Real-time system performance and health metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} disabled={isRefetching}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Calculations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calculations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {performanceMetrics?.totalCalculations || 0}
                </div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {performanceMetrics?.successRate.toFixed(1)}%
                </div>
                <Progress value={performanceMetrics?.successRate || 0} className="h-1 mt-2" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {businessMetrics?.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Quote to order</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(alertSummary?.criticalAlerts || 0) + (alertSummary?.warningAlerts || 0)}
                </div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="destructive" className="text-xs">
                    {alertSummary?.criticalAlerts || 0} critical
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {alertSummary?.warningAlerts || 0} warning
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Performance Details */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Details</CardTitle>
            <CardDescription>System performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Average Calculation Time</span>
                    <span className="font-medium">
                      {Math.round(performanceMetrics?.averageCalculationTime || 0)}
                      ms
                    </span>
                  </div>
                  <Progress
                    value={Math.min((performanceMetrics?.averageCalculationTime || 0) / 50, 100)}
                    className="h-2 mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span className="font-medium">{performanceMetrics?.errorRate.toFixed(2)}%</span>
                  </div>
                  <Progress value={performanceMetrics?.errorRate || 0} className="h-2 mt-1" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Slow Calculations</span>
                    <span className="font-medium">{performanceMetrics?.slowCalculations || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Errors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Errors</CardTitle>
            <CardDescription>Most frequent error codes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : performanceMetrics?.topErrors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No errors recorded</p>
            ) : (
              <div className="space-y-3">
                {performanceMetrics?.topErrors.map(({ code, count }) => (
                  <div key={code} className="flex justify-between items-center">
                    <span className="font-mono text-xs">{code}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
