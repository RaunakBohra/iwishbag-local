import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Package, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  TrendingUp,
  MapPin,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DeliveryOption, 
  getActiveDeliveryOptions, 
  validateDeliveryOption,
  generateDeliveryOptionId 
} from '@/lib/delivery-estimates';
import { 
  getWeatherImpactSummary, 
  getActiveWeatherAlerts,
  formatWeatherImpact 
} from '@/lib/weather-impact';

interface ShippingRoute {
  id: string;
  origin_country: string;
  destination_country: string;
  delivery_options: DeliveryOption[];
  processing_days: number;
  active: boolean;
  is_active: boolean;
}

export const DeliveryManagementDashboard: React.FC = () => {
  const [routes, setRoutes] = useState<ShippingRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherImpact, setWeatherImpact] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<ShippingRoute | null>(null);

  useEffect(() => {
    loadShippingRoutes();
    loadWeatherImpact();
  }, []);

  const loadShippingRoutes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_routes')
        .select('*')
        .order('origin_country');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading shipping routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeatherImpact = () => {
    const impact = getWeatherImpactSummary();
    setWeatherImpact(impact);
  };

  const handleAddDeliveryOption = async (routeId: string) => {
    const newOption: DeliveryOption = {
      id: generateDeliveryOptionId(),
      name: 'New Delivery Option',
      carrier: 'Standard Carrier',
      min_days: 5,
      max_days: 10,
      price: 25.00,
      active: true
    };

    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) return;

      const updatedOptions = [...(route.delivery_options || []), newOption];
      
      const { error } = await supabase
        .from('shipping_routes')
        .update({ delivery_options: updatedOptions })
        .eq('id', routeId);

      if (error) throw error;
      await loadShippingRoutes();
    } catch (error) {
      console.error('Error adding delivery option:', error);
    }
  };

  const handleUpdateDeliveryOption = async (routeId: string, optionId: string, updates: Partial<DeliveryOption>) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) return;

      const updatedOptions = route.delivery_options.map(option =>
        option.id === optionId ? { ...option, ...updates } : option
      );

      const { error } = await supabase
        .from('shipping_routes')
        .update({ delivery_options: updatedOptions })
        .eq('id', routeId);

      if (error) throw error;
      await loadShippingRoutes();
    } catch (error) {
      console.error('Error updating delivery option:', error);
    }
  };

  const handleDeleteDeliveryOption = async (routeId: string, optionId: string) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) return;

      const updatedOptions = route.delivery_options.filter(option => option.id !== optionId);

      const { error } = await supabase
        .from('shipping_routes')
        .update({ delivery_options: updatedOptions })
        .eq('id', routeId);

      if (error) throw error;
      await loadShippingRoutes();
    } catch (error) {
      console.error('Error deleting delivery option:', error);
    }
  };

  const getRouteStats = (route: ShippingRoute) => {
    const activeOptions = getActiveDeliveryOptions(route.delivery_options);
    const totalOptions = route.delivery_options.length;
    
    return {
      activeOptions: activeOptions.length,
      totalOptions,
      avgProcessingDays: route.processing_days,
      routeKey: `${route.origin_country} → ${route.destination_country}`
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
          <p className="text-gray-600">Manage delivery options and monitor delivery status</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Route
        </Button>
      </div>

      {/* Weather Impact Summary */}
      {weatherImpact && weatherImpact.totalAlerts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Weather Impact Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-800 mb-2">
              {formatWeatherImpact(weatherImpact)}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-900">{weatherImpact.totalAlerts}</p>
                <p className="text-sm text-orange-700">Total Alerts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-900">{weatherImpact.highSeverityAlerts}</p>
                <p className="text-sm text-red-700">High Severity</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-900">{weatherImpact.affectedRoutes.length}</p>
                <p className="text-sm text-orange-700">Affected Routes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-900">+{weatherImpact.totalEstimatedDelay}</p>
                <p className="text-sm text-orange-700">Days Delay</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{routes.length}</p>
                <p className="text-sm text-gray-600">Active Routes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {routes.reduce((sum, route) => sum + (route.delivery_options?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Delivery Options</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {routes.reduce((sum, route) => sum + getActiveDeliveryOptions(route.delivery_options).length, 0)}
                </p>
                <p className="text-sm text-gray-600">Active Options</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(routes.reduce((sum, route) => sum + route.processing_days, 0) / routes.length)}
                </p>
                <p className="text-sm text-gray-600">Avg Processing Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routes">Shipping Routes</TabsTrigger>
          <TabsTrigger value="weather">Weather Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {routes.map((route) => {
              const stats = getRouteStats(route);
              return (
                <Card key={route.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {stats.routeKey}
                      </div>
                      <Badge variant={route.is_active ? "default" : "secondary"}>
                        {route.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Processing Days</p>
                        <p className="font-medium">{stats.avgProcessingDays}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Delivery Options</p>
                        <p className="font-medium">{stats.activeOptions}/{stats.totalOptions}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Delivery Options</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddDeliveryOption(route.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {getActiveDeliveryOptions(route.delivery_options).map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{option.name}</p>
                              <p className="text-xs text-gray-600">
                                {option.carrier} • {option.min_days}-{option.max_days} days • ${option.price}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateDeliveryOption(route.id, option.id, { active: !option.active })}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteDeliveryOption(route.id, option.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="weather" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Weather Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getActiveWeatherAlerts().map((alert) => (
                  <div key={alert.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{alert.severity}</Badge>
                        <span className="font-medium">{alert.type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        +{alert.estimated_delay_days} days
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{alert.location}</span>
                      <span>
                        {alert.start_date.toLocaleDateString()} - {alert.end_date.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Delivery Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Analytics dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 