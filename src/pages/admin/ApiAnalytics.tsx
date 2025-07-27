import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Activity,
  Clock,
  Users,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ApiAnalytics {
  period_days: number;
  version_usage: Array<{
    version: string;
    total_calls: number;
    avg_response_time: number;
    error_rate: number;
  }>;
  endpoint_usage: Array<{
    endpoint: string;
    total_calls: number;
    avg_response_time: number;
  }>;
  error_summary: Array<{
    error: string;
    count: number;
    last_seen: string;
  }>;
  generated_at: string;
}

export const ApiAnalytics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['api-analytics', selectedPeriod],
    queryFn: async (): Promise<ApiAnalytics> => {
      const { data, error } = await supabase.rpc('get_api_analytics', {
        p_days: selectedPeriod
      });

      if (error) {
        logger.error('Failed to fetch API analytics:', error);
        throw error;
      }

      return data;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getVersionBadgeColor = (version: string) => {
    switch (version) {
      case 'v1.1': return 'bg-green-600';
      case 'v1': return 'bg-blue-600';
      case 'v0.9': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const getErrorSeverity = (count: number) => {
    if (count > 100) return 'bg-red-600';
    if (count > 50) return 'bg-orange-600';
    if (count > 10) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading API analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor API usage, versions, and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex gap-2">
        {[7, 30, 90].map((days) => (
          <Button
            key={days}
            variant={selectedPeriod === days ? "default" : "outline"}
            onClick={() => setSelectedPeriod(days)}
            size="sm"
          >
            {days} days
          </Button>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.version_usage.reduce((acc, v) => acc + v.total_calls, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last {selectedPeriod} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatResponseTime(
                    analytics?.version_usage.reduce((acc, v, _, arr) => 
                      acc + v.avg_response_time / arr.length, 0
                    ) || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all endpoints
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Versions</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.version_usage.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  API versions in use
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics?.version_usage.reduce((acc, v, _, arr) => 
                    acc + v.error_rate / arr.length, 0
                  ) || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across versions
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="versions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Version Usage</CardTitle>
              <CardDescription>
                Usage statistics by API version
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.version_usage.map((version) => (
                  <div key={version.version} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge className={getVersionBadgeColor(version.version)}>
                        {version.version}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          {version.total_calls.toLocaleString()} calls
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Avg: {formatResponseTime(version.avg_response_time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Error Rate: <span className={
                          version.error_rate > 5 ? 'text-red-600' :
                          version.error_rate > 2 ? 'text-orange-600' : 'text-green-600'
                        }>
                          {version.error_rate.toFixed(1)}%
                        </span>
                      </p>
                      {version.version === 'v0.9' && (
                        <Badge variant="destructive" className="mt-1">
                          Deprecated
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Popular Endpoints</CardTitle>
              <CardDescription>
                Most frequently used API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.endpoint_usage.map((endpoint, index) => (
                  <div key={endpoint.endpoint} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{endpoint.endpoint}</p>
                        <p className="text-sm text-muted-foreground">
                          {endpoint.total_calls.toLocaleString()} calls
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {formatResponseTime(endpoint.avg_response_time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Summary</CardTitle>
              <CardDescription>
                Most common API errors and their frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.error_summary.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No errors reported in the selected period</p>
                  </div>
                ) : (
                  analytics?.error_summary.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{error.error}</p>
                        <p className="text-sm text-muted-foreground">
                          Last seen: {new Date(error.last_seen).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={getErrorSeverity(error.count)}>
                        {error.count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiAnalytics;