import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Route, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  Settings,
  Truck,
  Globe
} from 'lucide-react';
import { useShippingRoutes } from '@/hooks/useShippingRoutes';

export const ShippingRoutesTab: React.FC = () => {
  const { routes, isLoading, error } = useShippingRoutes();

  const getRouteStats = () => {
    if (!routes) return { total: 0, active: 0, inactive: 0 };
    
    const total = routes.length;
    const active = routes.filter(route => route.is_active).length;
    const inactive = total - active;
    
    return { total, active, inactive };
  };

  const stats = getRouteStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Route className="h-6 w-6 text-blue-600" />
            Shipping Routes Integration
          </h2>
          <p className="text-muted-foreground">
            Auto quotes now use the same shipping calculation system as manual quotes
          </p>
        </div>
        <Button variant="outline" onClick={() => window.open('/admin/shipping-routes', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Manage Routes
        </Button>
      </div>

      {/* Integration Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Integration Active
          </CardTitle>
          <CardDescription className="text-green-700">
            Auto quotes are now fully integrated with the shipping routes system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Uses unified shipping calculator</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Supports route-specific pricing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Automatic weight unit conversion</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Fallback to country settings</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Routes</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-sm text-muted-foreground">Active Routes</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
              <p className="text-sm text-muted-foreground">Inactive Routes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Auto Quote Shipping Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              <div>
                <h4 className="font-semibold">Route Lookup</h4>
                <p className="text-sm text-muted-foreground">
                  System looks for a shipping route between the purchase country and shipping destination
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-green-600">2</span>
              </div>
              <div>
                <h4 className="font-semibold">Route-Specific Calculation</h4>
                <p className="text-sm text-muted-foreground">
                  If a route exists, uses its specific pricing, weight units, and carrier information
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">3</span>
              </div>
              <div>
                <h4 className="font-semibold">Fallback to Country Settings</h4>
                <p className="text-sm text-muted-foreground">
                  If no route exists, falls back to the destination country's shipping settings
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600">4</span>
              </div>
              <div>
                <h4 className="font-semibold">Weight Unit Conversion</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically converts between kg and lb based on route or country settings
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Routes */}
      {routes && routes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Recent Shipping Routes
            </CardTitle>
            <CardDescription>
              Routes that auto quotes can use for shipping calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.slice(0, 5).map((route) => (
                <div key={route.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {route.origin_country} → {route.destination_country}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {route.carriers?.[0]?.name || 'Standard'} • {route.weight_unit || 'kg'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={route.is_active ? 'default' : 'secondary'}>
                    {route.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Create routes for popular country combinations</p>
                <p className="text-xs text-muted-foreground">
                  Routes with specific pricing will be used instead of country settings
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Set appropriate weight units</p>
                <p className="text-xs text-muted-foreground">
                  Routes can use kg or lb - the system will convert automatically
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Test with sample auto quotes</p>
                <p className="text-xs text-muted-foreground">
                  Create test auto quotes to verify route calculations work correctly
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 