/**
 * HSN Administration Dashboard
 * Central management interface for HSN-based tax system
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Search,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Database,
  Shield,
  Zap,
} from 'lucide-react';
import { hsnTaxIntegration } from '@/services/HSNTaxIntegrationService';
import { HSNCodeManager } from './HSNCodeManager';
import { AdminOverridesManager } from './AdminOverridesManager';
import { HSNAnalytics } from './HSNAnalytics';
import { HSNSystemSettings } from './HSNSystemSettings';

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    classification: { status: string; stats: any };
    weightDetection: { status: string; stats: any };
    taxCalculation: { status: string; stats: any };
    dataEngine: { status: string; analytics: any };
  };
  performance: {
    cacheHitRate: number;
    averageProcessingTime: number;
    totalProcessedToday: number;
  };
}

export const HSNAdminDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch system status
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const status = await hsnTaxIntegration.getSystemStatus();
        setSystemStatus(status);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch HSN system status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClearCaches = async () => {
    try {
      hsnTaxIntegration.clearAllCaches();
      // Show success message
      alert('All HSN service caches cleared successfully');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'down':
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading HSN System Status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HSN Tax Administration</h1>
          <p className="text-gray-600 mt-1">
            Manage HSN-based tax automation system
            <span className="text-sm text-gray-500 ml-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearCaches}>
            <Zap className="h-4 w-4 mr-2" />
            Clear Caches
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(systemStatus.status)}
                  System Status
                </CardTitle>
                <CardDescription>
                  Overall HSN tax system health and performance metrics
                </CardDescription>
              </div>
              <Badge
                variant={systemStatus.status === 'healthy' ? 'default' : 'destructive'}
                className={getStatusColor(systemStatus.status)}
              >
                {systemStatus.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Classification Service */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Classification</span>
                  {getStatusIcon(systemStatus.services.classification.status)}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Cache: {systemStatus.services.classification.stats.cacheSize || 0} items</p>
                  <p>
                    Patterns: {systemStatus.services.classification.stats.supportedPatterns || 0}
                  </p>
                </div>
              </div>

              {/* Weight Detection Service */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Weight Detection</span>
                  {getStatusIcon(systemStatus.services.weightDetection.status)}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Cache: {systemStatus.services.weightDetection.stats.cacheSize || 0} items</p>
                  <p>Units: {systemStatus.services.weightDetection.stats.supportedUnits || 0}</p>
                </div>
              </div>

              {/* Tax Calculation Service */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Tax Calculation</span>
                  {getStatusIcon(systemStatus.services.taxCalculation.status)}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Cache: {systemStatus.services.taxCalculation.stats.cacheSize || 0} items</p>
                  <p>
                    Calculations:{' '}
                    {systemStatus.services.taxCalculation.stats.totalCalculations || 0}
                  </p>
                </div>
              </div>

              {/* Data Engine */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">Data Engine</span>
                  {getStatusIcon(systemStatus.services.dataEngine.status)}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Quotes: {systemStatus.services.dataEngine.analytics?.total_quotes || 0}</p>
                  <p>
                    Value: $
                    {(systemStatus.services.dataEngine.analytics?.total_value || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                  <span className="text-sm text-gray-600">
                    {(systemStatus.performance.cacheHitRate * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={systemStatus.performance.cacheHitRate * 100} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg Processing Time</span>
                  <span className="text-sm text-gray-600">
                    {systemStatus.performance.averageProcessingTime}ms
                  </span>
                </div>
                <Progress
                  value={Math.max(0, 100 - systemStatus.performance.averageProcessingTime / 50)}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Processed Today</span>
                  <span className="text-sm text-gray-600">
                    {systemStatus.performance.totalProcessedToday}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (systemStatus.performance.totalProcessedToday / 1000) * 100)}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Alerts */}
      {systemStatus?.status !== 'healthy' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>System Alert</AlertTitle>
          <AlertDescription>
            The HSN tax system is currently {systemStatus?.status}. Some services may be
            experiencing issues.
            {systemStatus?.status === 'degraded' &&
              ' Manual review may be required for some calculations.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hsn-codes">HSN Codes</TabsTrigger>
          <TabsTrigger value="overrides">Admin Overrides</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common HSN administration tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New HSN Code
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Create Tax Override
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Bulk Process Quotes
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest HSN system activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">Auto-classified 15 products</p>
                    <p className="text-gray-600">2 minutes ago</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Updated tax rates for electronics</p>
                    <p className="text-gray-600">1 hour ago</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Processed 45 quotes successfully</p>
                    <p className="text-gray-600">3 hours ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Classification Accuracy</span>
                    <span className="text-sm font-medium">94.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weight Detection Rate</span>
                    <span className="text-sm font-medium">87.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tax Calculation Success</span>
                    <span className="text-sm font-medium">99.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Manual Review Required</span>
                    <span className="text-sm font-medium text-yellow-600">8.3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hsn-codes">
          <HSNCodeManager />
        </TabsContent>

        <TabsContent value="overrides">
          <AdminOverridesManager />
        </TabsContent>

        <TabsContent value="analytics">
          <HSNAnalytics />
        </TabsContent>

        <TabsContent value="settings">
          <HSNSystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
