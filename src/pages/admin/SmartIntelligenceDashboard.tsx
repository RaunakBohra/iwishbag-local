import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Globe, 
  Database, 
  Settings,
  FileText,
  Upload,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Activity,
  TrendingUp,
  Users,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { smartManagementService, SmartSystemStats } from '@/services/SmartManagementService';
import { toast } from '@/hooks/use-toast';

const SmartIntelligenceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SmartSystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      setLoading(true);
      const systemStats = await smartManagementService.getSystemStats();
      setStats(systemStats);
    } catch (error) {
      console.error('Error loading system stats:', error);
      toast({
        title: "Error Loading Stats",
        description: "Failed to load system statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSystemHealthStatus = () => {
    if (!stats) return { status: 'loading', message: 'Loading...' };
    
    if (stats.countriesWithData === 0) {
      return { status: 'error', message: 'No product data configured' };
    }
    
    if (stats.countriesWithData < 2) {
      return { status: 'warning', message: 'Limited country coverage' };
    }
    
    return { status: 'healthy', message: 'System operational' };
  };

  const healthStatus = getSystemHealthStatus();

  const quickActions = [
    {
      title: 'Manage Classifications',
      description: 'Add, edit, and organize HSN/HS codes',
      icon: Package,
      color: 'blue',
      path: '/admin/product-classifications',
      stats: stats?.totalClassifications || 0
    },
    {
      title: 'Country Settings',
      description: 'Configure countries and tax systems',
      icon: Globe,
      color: 'green',
      path: '/admin/country-settings', 
      stats: stats?.totalCountries || 0
    },
    {
      title: 'Intelligence Settings',
      description: 'AI parameters and system configuration',
      icon: Brain,
      color: 'purple',
      path: '/admin/intelligence-settings',
      stats: 'Config'
    },
    {
      title: 'Data Management',
      description: 'Import, export, and backup tools',
      icon: Database,
      color: 'orange',
      path: '/admin/data-management',
      stats: 'Tools'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Smart Intelligence Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage HSN codes, country settings, and AI product intelligence
          </p>
        </div>
        <Button onClick={loadSystemStats} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {healthStatus.status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {healthStatus.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
            {healthStatus.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium">{healthStatus.message}</p>
              <p className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
            <Badge 
              variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}
              className={
                healthStatus.status === 'healthy' ? 'bg-green-100 text-green-800' :
                healthStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }
            >
              {healthStatus.status.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* System Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Countries</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalCountries}</p>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Countries with Data</p>
                  <p className="text-2xl font-bold text-green-600">{stats.countriesWithData}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classifications</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalClassifications}</p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Status</p>
                  <p className="text-2xl font-bold text-green-600">Online</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Country Breakdown */}
      {stats && Object.keys(stats.classificationsByCountry).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Classification Breakdown by Country</CardTitle>
            <CardDescription>
              Distribution of product classifications across configured countries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(stats.classificationsByCountry).map(([country, count]) => (
                <div key={country} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{country}</p>
                  <p className="text-2xl font-bold text-blue-600">{count}</p>
                  <p className="text-xs text-gray-600">classifications</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Management Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <Card 
                key={action.path}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(action.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <IconComponent className={`h-8 w-8 text-${action.color}-500`} />
                    <Badge variant="secondary">{action.stats}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {stats && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system changes and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.details}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.date).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="ml-3 text-gray-600">Loading system statistics...</p>
        </div>
      )}
    </div>
  );
};

export default SmartIntelligenceDashboard;