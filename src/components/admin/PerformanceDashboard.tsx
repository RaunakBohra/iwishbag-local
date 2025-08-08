/**
 * Performance Dashboard Component
 * 
 * Real-time monitoring dashboard for regional pricing performance:
 * - Live performance metrics
 * - Response time trends
 * - Cache performance
 * - Error rates and alerts
 * - System health indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  Shield,
  Users,
  Settings
} from 'lucide-react';

import { performanceMonitoringService, PerformanceStats, PerformanceAlert } from '@/services/PerformanceMonitoringService';

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
}

interface DashboardData {
  currentLoad: number;
  recentStats: PerformanceStats;
  recentAlerts: PerformanceAlert[];
  healthStatus: 'healthy' | 'warning' | 'critical';
}

const PerformanceDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data with auto-refresh
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['performance-dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate the dashboard data
      return performanceMonitoringService.getDashboardData();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchOnWindowFocus: false,
  });

  // Manual refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Calculate health metrics
  const healthMetrics: HealthMetric[] = React.useMemo(() => {
    if (!dashboardData) return [];

    const stats = dashboardData.recentStats;
    
    return [
      {
        name: 'Response Time (P95)',
        value: stats.p95ResponseTime,
        unit: 'ms',
        status: stats.p95ResponseTime < 200 ? 'healthy' : stats.p95ResponseTime < 500 ? 'warning' : 'critical',
        trend: 'stable', // Would calculate from historical data
        icon: Clock
      },
      {
        name: 'Success Rate',
        value: (stats.totalRequests - stats.successfulRequests) > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100) : 100,
        unit: '%',
        status: stats.errorRate < 1 ? 'healthy' : stats.errorRate < 5 ? 'warning' : 'critical',
        trend: 'stable',
        icon: CheckCircle
      },
      {
        name: 'Cache Hit Rate',
        value: stats.cacheHitRate,
        unit: '%',
        status: stats.cacheHitRate > 70 ? 'healthy' : stats.cacheHitRate > 50 ? 'warning' : 'critical',
        trend: 'stable',
        icon: Database
      },
      {
        name: 'Current Load',
        value: dashboardData.currentLoad,
        unit: 'requests',
        status: dashboardData.currentLoad < 50 ? 'healthy' : dashboardData.currentLoad < 100 ? 'warning' : 'critical',
        trend: 'stable',
        icon: Activity
      }
    ];
  }, [dashboardData]);

  // System health status
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Performance Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of regional pricing system performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-2" />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {dashboardData && (
        <Card className={`border-2 ${getHealthStatusColor(dashboardData.healthStatus)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              {getHealthStatusIcon(dashboardData.healthStatus)}
              System Health: {dashboardData.healthStatus.charAt(0).toUpperCase() + dashboardData.healthStatus.slice(1)}
            </CardTitle>
            <CardDescription>
              Overall system performance status based on recent metrics
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Health Metrics Grid */}
      {dashboardData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {healthMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className={`w-5 h-5 ${
                      metric.status === 'healthy' ? 'text-green-600' :
                      metric.status === 'warning' ? 'text-orange-600' : 'text-red-600'
                    }`} />
                    <Badge variant={
                      metric.status === 'healthy' ? 'default' :
                      metric.status === 'warning' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {metric.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-2xl font-bold">
                      {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                      <span className="text-sm font-normal text-gray-500 ml-1">{metric.unit}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Metrics Tabs */}
      {dashboardData && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="countries">Countries</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Request Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Request Statistics
                  </CardTitle>
                  <CardDescription>Last 5 minutes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Requests</span>
                      <span className="font-bold">{dashboardData.recentStats.totalRequests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Successful</span>
                      <span className="font-bold text-green-600">{dashboardData.recentStats.successfulRequests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Error Rate</span>
                      <span className={`font-bold ${dashboardData.recentStats.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                        {dashboardData.recentStats.errorRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Response Time</span>
                      <span className="font-bold">{dashboardData.recentStats.averageResponseTime.toFixed(0)}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cache Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Cache Performance
                  </CardTitle>
                  <CardDescription>Caching efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Hit Rate</span>
                        <span className="font-bold">{dashboardData.recentStats.cacheHitRate.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={dashboardData.recentStats.cacheHitRate} 
                        className="h-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Cache Hits</p>
                        <p className="font-bold text-green-600">
                          {Math.round(dashboardData.recentStats.totalRequests * (dashboardData.recentStats.cacheHitRate / 100))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cache Misses</p>
                        <p className="font-bold text-orange-600">
                          {dashboardData.recentStats.totalRequests - Math.round(dashboardData.recentStats.totalRequests * (dashboardData.recentStats.cacheHitRate / 100))}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Response Time Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Response Times
                  </CardTitle>
                  <CardDescription>Distribution of response times (ms)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average</span>
                      <span className="font-bold">{dashboardData.recentStats.averageResponseTime.toFixed(1)}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">50th Percentile</span>
                      <span className="font-bold">{dashboardData.recentStats.p50ResponseTime.toFixed(1)}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">95th Percentile</span>
                      <span className={`font-bold ${dashboardData.recentStats.p95ResponseTime > 500 ? 'text-red-600' : 'text-green-600'}`}>
                        {dashboardData.recentStats.p95ResponseTime.toFixed(1)}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">99th Percentile</span>
                      <span className={`font-bold ${dashboardData.recentStats.p99ResponseTime > 1000 ? 'text-red-600' : 'text-orange-600'}`}>
                        {dashboardData.recentStats.p99ResponseTime.toFixed(1)}ms
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Top Services
                  </CardTitle>
                  <CardDescription>Most requested services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.recentStats.topServices.slice(0, 5).map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">{service.service}</p>
                          <p className="text-xs text-gray-500">{service.requests} requests</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{service.avgResponseTime.toFixed(0)}ms</p>
                          <p className="text-xs text-gray-500">avg</p>
                        </div>
                      </div>
                    ))}
                    {dashboardData.recentStats.topServices.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No service data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recent Alerts
                </CardTitle>
                <CardDescription>Performance alerts from the last hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentAlerts.length > 0 ? (
                    dashboardData.recentAlerts.map((alert, index) => (
                      <Alert key={index} className={
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
                      }>
                        <AlertTriangle className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{alert.message}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {alert.severity}
                            </Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <p className="text-green-600 font-medium">No recent alerts</p>
                      <p className="text-gray-500 text-sm">System is performing well</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Countries Tab */}
          <TabsContent value="countries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Top Countries by Request Volume
                </CardTitle>
                <CardDescription>Performance breakdown by country</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentStats.topCountries.slice(0, 10).map((country, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{country.country}</p>
                        <p className="text-sm text-gray-500">{country.requests} requests</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{country.avgResponseTime.toFixed(0)}ms</p>
                        <p className="text-xs text-gray-500">avg response</p>
                      </div>
                      <div className="ml-4">
                        <Badge variant={country.avgResponseTime > 300 ? 'destructive' : country.avgResponseTime > 150 ? 'secondary' : 'default'}>
                          {country.avgResponseTime > 300 ? 'Slow' : country.avgResponseTime > 150 ? 'Fair' : 'Fast'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {dashboardData.recentStats.topCountries.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No country data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PerformanceDashboard;