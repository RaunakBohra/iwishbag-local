/**
 * Performance Monitoring Dashboard for Regional Pricing
 * 
 * Real-time monitoring of pricing service performance:
 * - Response time metrics
 * - Error rates and alerts
 * - Cache performance
 * - Country-specific performance patterns
 * - Load balancing metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  RefreshCw,
  Server,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  AlertCircle,
  Shield,
  Timer,
  Users
} from 'lucide-react';
import { performanceMonitoringService, PerformanceStats, PerformanceAlert } from '@/services/PerformanceMonitoringService';

interface DashboardData {
  currentLoad: number;
  recentStats: PerformanceStats;
  recentAlerts: PerformanceAlert[];
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export const PerformanceMonitoringDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(() => {
    const data = performanceMonitoringService.getDashboardData();
    setDashboardData(data);
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    fetchDashboardData(); // Initial load
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchDashboardData]);

  // Get time range in milliseconds
  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  };

  // Fetch historical stats based on time range
  const { data: historicalStats, isLoading } = useQuery({
    queryKey: ['performance-stats', timeRange],
    queryFn: () => {
      const now = Date.now();
      const timeRangeMs = getTimeRangeMs(timeRange);
      return performanceMonitoringService.getPerformanceStats(now - timeRangeMs, now);
    },
    refetchInterval: autoRefresh ? 10000 : false // Refresh every 10 seconds when auto-refresh is on
  });

  const renderHealthStatus = () => {
    if (!dashboardData) return null;

    const { healthStatus, currentLoad } = dashboardData;
    
    const statusConfig = {
      healthy: { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Healthy' 
      },
      warning: { 
        icon: AlertTriangle, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Warning' 
      },
      critical: { 
        icon: AlertCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Critical' 
      }
    };

    const config = statusConfig[healthStatus];
    const StatusIcon = config.icon;

    return (
      <Card className={`${config.bgColor} ${config.borderColor}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-6 h-6 ${config.color}`} />
              <div>
                <h3 className="font-semibold">System Health</h3>
                <p className={`text-sm ${config.color}`}>{config.label}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-mono">{currentLoad}</span>
              </div>
              <p className="text-xs text-gray-500">Active requests</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMetricsCards = () => {
    const stats = historicalStats || dashboardData?.recentStats;
    if (!stats) return null;

    const metrics = [
      {
        title: 'Response Time',
        value: `${stats.p95ResponseTime.toFixed(0)}ms`,
        subtitle: '95th percentile',
        icon: Timer,
        trend: stats.p95ResponseTime > 200 ? 'up' : 'down',
        status: stats.p95ResponseTime > 500 ? 'critical' : stats.p95ResponseTime > 200 ? 'warning' : 'healthy'
      },
      {
        title: 'Success Rate',
        value: `${(100 - stats.errorRate).toFixed(1)}%`,
        subtitle: `${stats.totalRequests} total requests`,
        icon: CheckCircle,
        trend: stats.errorRate > 1 ? 'up' : 'down',
        status: stats.errorRate > 5 ? 'critical' : stats.errorRate > 1 ? 'warning' : 'healthy'
      },
      {
        title: 'Cache Hit Rate',
        value: `${stats.cacheHitRate.toFixed(1)}%`,
        subtitle: 'Cached responses',
        icon: Database,
        trend: stats.cacheHitRate > 70 ? 'down' : 'up',
        status: stats.cacheHitRate < 50 ? 'critical' : stats.cacheHitRate < 70 ? 'warning' : 'healthy'
      },
      {
        title: 'Throughput',
        value: `${(stats.totalRequests / ((stats.timeRange.end - stats.timeRange.start) / 1000 / 60)).toFixed(1)}`,
        subtitle: 'requests/minute',
        icon: Activity,
        trend: 'neutral',
        status: 'healthy'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const statusColors = {
            healthy: 'text-green-600',
            warning: 'text-yellow-600', 
            critical: 'text-red-600'
          };
          
          const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Activity;
          const IconComponent = metric.icon;

          return (
            <Card key={metric.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className="w-5 h-5 text-gray-500" />
                  <TrendIcon className={`w-4 h-4 ${statusColors[metric.status]}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-sm text-gray-600">{metric.title}</p>
                  <p className="text-xs text-gray-500">{metric.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderAlertsSection = () => {
    const alerts = dashboardData?.recentAlerts || [];
    
    if (alerts.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500">No recent alerts - system running smoothly</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert, index) => (
              <Alert key={index} className={
                alert.severity === 'critical' 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-yellow-200 bg-yellow-50'
              }>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCountryPerformance = () => {
    const stats = historicalStats || dashboardData?.recentStats;
    if (!stats || stats.topCountries.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Country Performance
          </CardTitle>
          <CardDescription>
            Top countries by request volume and response time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Avg Response</TableHead>
                <TableHead className="text-right">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.topCountries.slice(0, 10).map((country) => {
                const performance = country.avgResponseTime < 100 ? 'excellent' : 
                                 country.avgResponseTime < 200 ? 'good' : 'slow';
                const performanceColor = performance === 'excellent' ? 'text-green-600' :
                                       performance === 'good' ? 'text-yellow-600' : 'text-red-600';
                
                return (
                  <TableRow key={country.country}>
                    <TableCell className="font-mono font-medium">{country.country}</TableCell>
                    <TableCell className="text-right">{country.requests.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">
                      {country.avgResponseTime.toFixed(0)}ms
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={performanceColor}>
                        {performance}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
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
            Performance Monitoring
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of regional pricing service performance
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">Last 5m</SelectItem>
              <SelectItem value="15m">Last 15m</SelectItem>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="6h">Last 6h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {renderHealthStatus()}

      {/* Metrics Cards */}
      {renderMetricsCards()}

      {/* Alerts and Country Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderAlertsSection()}
        {renderCountryPerformance()}
      </div>
    </div>
  );
};