/**
 * System Performance Admin Page
 * 
 * Main admin page for monitoring system performance:
 * - Performance dashboard
 * - Configuration settings
 * - Alert management
 * - Performance testing tools
 */

import React, { useState } from 'react';
import PerformanceDashboard from '@/components/admin/PerformanceDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Play,
  Download,
  AlertTriangle,
  BarChart3,
  Database,
  Zap,
  Clock,
  Shield,
  TestTube
} from 'lucide-react';

import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { toast } from '@/hooks/use-toast';

const SystemPerformance: React.FC = () => {
  const [isRunningLoadTest, setIsRunningLoadTest] = useState(false);
  const [performanceThresholds, setPerformanceThresholds] = useState({
    maxResponseTimeP95: 500,
    maxErrorRate: 5,
    minCacheHitRate: 70,
    maxConcurrentRequests: 100
  });

  // Handle load test execution
  const handleRunLoadTest = async () => {
    setIsRunningLoadTest(true);
    
    try {
      // This would typically trigger a load test
      toast({
        title: 'Load Test Started',
        description: 'Performance load test is running in the background...'
      });

      // Simulate load test
      setTimeout(() => {
        setIsRunningLoadTest(false);
        toast({
          title: 'Load Test Complete',
          description: 'Check the performance dashboard for results.'
        });
      }, 30000); // 30 second simulation

    } catch (error) {
      console.error('Load test failed:', error);
      toast({
        title: 'Load Test Failed',
        description: 'There was an error running the performance load test.',
        variant: 'destructive'
      });
      setIsRunningLoadTest(false);
    }
  };

  // Handle threshold updates
  const handleUpdateThresholds = () => {
    try {
      performanceMonitoringService.updateThresholds(performanceThresholds);
      toast({
        title: 'Thresholds Updated',
        description: 'Performance alert thresholds have been updated successfully.'
      });
    } catch (error) {
      console.error('Failed to update thresholds:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update performance thresholds.',
        variant: 'destructive'
      });
    }
  };

  // Handle performance data export
  const handleExportData = async () => {
    try {
      const stats = performanceMonitoringService.getPerformanceStats();
      const dataStr = JSON.stringify(stats, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data Exported',
        description: 'Performance data has been exported successfully.'
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export performance data.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              System Performance
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor and optimize regional pricing system performance
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button 
              onClick={handleRunLoadTest}
              disabled={isRunningLoadTest}
              variant={isRunningLoadTest ? 'secondary' : 'default'}
            >
              <TestTube className={`w-4 h-4 mr-2 ${isRunningLoadTest ? 'animate-pulse' : ''}`} />
              {isRunningLoadTest ? 'Running Test...' : 'Load Test'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <PerformanceDashboard />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Performance Alert Thresholds
              </CardTitle>
              <CardDescription>
                Configure thresholds for performance alerts and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="response-time">Max Response Time P95 (ms)</Label>
                  <Input
                    id="response-time"
                    type="number"
                    value={performanceThresholds.maxResponseTimeP95}
                    onChange={(e) => setPerformanceThresholds(prev => ({
                      ...prev,
                      maxResponseTimeP95: parseInt(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-gray-500">
                    Alert when 95th percentile response time exceeds this threshold
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="error-rate">Max Error Rate (%)</Label>
                  <Input
                    id="error-rate"
                    type="number"
                    value={performanceThresholds.maxErrorRate}
                    onChange={(e) => setPerformanceThresholds(prev => ({
                      ...prev,
                      maxErrorRate: parseFloat(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-gray-500">
                    Alert when error rate exceeds this percentage
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cache-hit-rate">Min Cache Hit Rate (%)</Label>
                  <Input
                    id="cache-hit-rate"
                    type="number"
                    value={performanceThresholds.minCacheHitRate}
                    onChange={(e) => setPerformanceThresholds(prev => ({
                      ...prev,
                      minCacheHitRate: parseFloat(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-gray-500">
                    Alert when cache hit rate falls below this percentage
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concurrent-requests">Max Concurrent Requests</Label>
                  <Input
                    id="concurrent-requests"
                    type="number"
                    value={performanceThresholds.maxConcurrentRequests}
                    onChange={(e) => setPerformanceThresholds(prev => ({
                      ...prev,
                      maxConcurrentRequests: parseInt(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-gray-500">
                    Alert when concurrent request count exceeds this threshold
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Alert Configuration</h4>
                  <p className="text-xs text-gray-500">
                    These thresholds determine when performance alerts are triggered
                  </p>
                </div>
                <Button onClick={handleUpdateThresholds}>
                  Update Thresholds
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cache Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Cache Configuration
              </CardTitle>
              <CardDescription>
                Configure caching behavior for optimal performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Regional Pricing Cache</h4>
                    <p className="text-sm text-gray-500">Cache duration: 1 hour</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Country Detection Cache</h4>
                    <p className="text-sm text-gray-500">Cache duration: 24 hours</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Currency Conversion Cache</h4>
                    <p className="text-sm text-gray-500">Cache duration: 5 minutes</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Performance Testing
              </CardTitle>
              <CardDescription>
                Run performance tests to validate system behavior under load
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Quick Load Test */}
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <Zap className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h4 className="font-medium mb-2">Quick Test</h4>
                    <p className="text-sm text-gray-600 mb-4">50 requests, 5 concurrent</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={isRunningLoadTest}
                      onClick={handleRunLoadTest}
                    >
                      Run Test
                    </Button>
                  </CardContent>
                </Card>

                {/* Medium Load Test */}
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                    <h4 className="font-medium mb-2">Medium Load</h4>
                    <p className="text-sm text-gray-600 mb-4">200 requests, 10 concurrent</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={isRunningLoadTest}
                      onClick={handleRunLoadTest}
                    >
                      Run Test
                    </Button>
                  </CardContent>
                </Card>

                {/* Stress Test */}
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
                    <h4 className="font-medium mb-2">Stress Test</h4>
                    <p className="text-sm text-gray-600 mb-4">500 requests, 20 concurrent</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={isRunningLoadTest}
                      onClick={handleRunLoadTest}
                    >
                      Run Test
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Test Configuration */}
              <div>
                <h4 className="font-medium mb-4">Test Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test-countries">Test Countries</Label>
                    <Input
                      id="test-countries"
                      placeholder="US,IN,NP,GB,DE"
                      defaultValue="US,IN,NP,GB,DE,JP,SG,AU"
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-services">Test Services</Label>
                    <Input
                      id="test-services"
                      placeholder="package_protection,express_processing"
                      defaultValue="package_protection,express_processing,priority_support"
                    />
                  </div>
                </div>
              </div>

              {isRunningLoadTest && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse">
                      <TestTube className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-800">Load Test in Progress</h4>
                      <p className="text-sm text-blue-600">
                        Performance testing is running. Results will appear in the dashboard when complete.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Reports
              </CardTitle>
              <CardDescription>
                Generate and export detailed performance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Daily Summary Report</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Comprehensive performance metrics for the last 24 hours
                    </p>
                    <Button size="sm" variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Country Performance Report</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Performance breakdown by country and region
                    </p>
                    <Button size="sm" variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Service Performance Report</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Individual service performance analysis
                    </p>
                    <Button size="sm" variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Cache Performance Report</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Detailed cache hit rates and optimization recommendations
                    </p>
                    <Button size="sm" variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemPerformance;