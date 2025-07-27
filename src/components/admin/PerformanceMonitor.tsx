import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity,
  BarChart3, 
  Clock,
  HardDrive,
  RefreshCw,
  Zap,
  AlertTriangle,
  TrendingUp,
  Package
} from 'lucide-react';
import { performanceOptimizationService, usePerformanceTracking } from '@/services/PerformanceOptimizationService';

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Track this component's performance
  const { getMetrics, shouldLazyLoad } = usePerformanceTracking('PerformanceMonitor');

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const currentMetrics = performanceOptimizationService.getAllMetrics();
      const currentRecommendations = performanceOptimizationService.getOptimizationRecommendations();
      
      setMetrics(currentMetrics);
      setRecommendations(currentRecommendations);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (loadTime: number) => {
    if (loadTime < 100) return 'text-green-600 bg-green-50';
    if (loadTime < 500) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSizeColor = (size: number) => {
    if (size < 100000) return 'text-green-600 bg-green-50'; // < 100KB
    if (size < 500000) return 'text-yellow-600 bg-yellow-50'; // < 500KB
    return 'text-red-600 bg-red-50'; // > 500KB
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Track and optimize application performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Components Tracked</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.totalComponents}</div>
            <p className="text-xs text-muted-foreground">
              Performance monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(metrics.summary.avgLoadTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Component load average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Chunk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.summary.largestChunk ? formatBytes(metrics.summary.largestChunk.size) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.summary.largestChunk?.name || 'No chunks tracked'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              Optimization suggestions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="space-y-6">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="chunks">Bundle Chunks</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Component Performance</CardTitle>
              <CardDescription>
                Load times and render counts for tracked components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.components.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No component metrics available yet</p>
                    <p className="text-sm">Performance data will appear as you navigate the app</p>
                  </div>
                ) : (
                  metrics.components.map((component: any) => (
                    <div key={component.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{component.name}</h3>
                          {shouldLazyLoad && component.name === 'PerformanceMonitor' && (
                            <Badge variant="secondary">Should Lazy Load</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {component.renderCount} render{component.renderCount !== 1 ? 's' : ''} • 
                          Last loaded: {new Date(component.lastLoaded).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={getPerformanceColor(component.loadTime)}>
                          {formatTime(component.loadTime)}
                        </Badge>
                        {component.memoryUsage > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {formatBytes(component.memoryUsage)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chunks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Chunks</CardTitle>
              <CardDescription>
                JavaScript chunk sizes and loading performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.chunks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chunk metrics available</p>
                    <p className="text-sm">Build the application to see chunk analysis</p>
                  </div>
                ) : (
                  metrics.chunks
                    .sort((a: any, b: any) => b.size - a.size)
                    .map((chunk: any) => (
                      <div key={chunk.name} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{chunk.name}</span>
                            <Badge className={getSizeColor(chunk.size)}>
                              {formatBytes(chunk.size)}
                            </Badge>
                          </div>
                          {chunk.gzipSize > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Gzipped: {formatBytes(chunk.gzipSize)}
                            </p>
                          )}
                        </div>
                        {chunk.loadTime && (
                          <div className="text-sm">
                            {formatTime(chunk.loadTime)}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                Suggestions to improve application performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-medium">Great performance!</p>
                    <p className="text-sm text-muted-foreground">No optimization recommendations at this time</p>
                  </div>
                ) : (
                  recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{recommendation}</p>
                      </div>
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

export default PerformanceMonitor;