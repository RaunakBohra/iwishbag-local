import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { RefreshCw, Plus, Edit, Percent, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { ShippingRouteDisplay } from '../shared/ShippingRouteDisplay';
import { getCurrencySymbolFromCountry } from '../../lib/currencyUtils';

interface RouteMarkup {
  id: number;
  origin_country: string;
  destination_country: string;
  markup_percentage: number;
  markup_fixed_amount: number;
  exchange_rate_markup: number;
  priority_fee: number;
  markup_notes: string;
  cost_percentage: number; // existing percentage
  base_shipping_cost: number; // existing base cost
  cost_per_kg: number; // existing per-kg cost
}

interface CountryMarkup {
  code: string;
  name: string;
  country_markup_percentage: number;
  country_markup_fixed: number;
  exchange_rate_adjustment: number;
  country_markup_notes: string;
}

export function MarkupManager() {
  const [routeMarkups, setRouteMarkups] = useState<RouteMarkup[]>([]);
  const [countryMarkups, setCountryMarkups] = useState<CountryMarkup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'routes' | 'countries'>('routes');
  const [editingRoute, setEditingRoute] = useState<RouteMarkup | null>(null);
  const [editingCountry, setEditingCountry] = useState<CountryMarkup | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchRouteMarkups = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_routes')
        .select(`
          id, origin_country, destination_country,
          markup_percentage, markup_fixed_amount, exchange_rate_markup,
          priority_fee, markup_notes, cost_percentage,
          base_shipping_cost, cost_per_kg
        `)
        .order('origin_country')
        .order('destination_country');

      if (error) throw error;
      setRouteMarkups(data || []);
    } catch (error) {
      console.error('Error fetching route markups:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch route markups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCountryMarkups = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('country_settings')
        .select(`
          code, name, country_markup_percentage, country_markup_fixed,
          exchange_rate_adjustment, country_markup_notes
        `)
        .order('code');

      if (error) throw error;
      setCountryMarkups(data || []);
    } catch (error) {
      console.error('Error fetching country markups:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch country markups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'routes') {
      fetchRouteMarkups();
    } else {
      fetchCountryMarkups();
    }
  }, [activeTab, fetchRouteMarkups, fetchCountryMarkups]);

  const updateRouteMarkup = async (routeId: number, updates: Partial<RouteMarkup>) => {
    try {
      const { error } = await supabase
        .from('shipping_routes')
        .update(updates)
        .eq('id', routeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Route markup updated successfully',
      });

      fetchRouteMarkups();
    } catch (error) {
      console.error('Error updating route markup:', error);
      toast({
        title: 'Error',
        description: 'Failed to update route markup',
        variant: 'destructive',
      });
    }
  };

  const updateCountryMarkup = async (countryCode: string, updates: Partial<CountryMarkup>) => {
    try {
      const { error } = await supabase
        .from('country_settings')
        .update(updates)
        .eq('code', countryCode);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Country markup updated successfully',
      });

      fetchCountryMarkups();
    } catch (error) {
      console.error('Error updating country markup:', error);
      toast({
        title: 'Error',
        description: 'Failed to update country markup',
        variant: 'destructive',
      });
    }
  };

  const hasMarkup = (route: RouteMarkup): boolean => {
    return (
      route.markup_percentage > 0 ||
      route.markup_fixed_amount > 0 ||
      route.exchange_rate_markup > 0 ||
      route.priority_fee > 0 ||
      route.cost_percentage > 0 ||
      route.base_shipping_cost > 0 ||
      route.cost_per_kg > 0
    );
  };

  const hasCountryMarkup = (country: CountryMarkup): boolean => {
    return (
      country.country_markup_percentage > 0 ||
      country.country_markup_fixed > 0 ||
      country.exchange_rate_adjustment !== 0
    );
  };

  const calculateTotalMarkup = (route: RouteMarkup, itemPrice: number = 100, weight: number = 1): number => {
    const percentageMarkup = (itemPrice * route.markup_percentage) / 100;
    const legacyPercentageMarkup = (itemPrice * route.cost_percentage) / 100;
    const weightMarkup = weight * route.cost_per_kg;
    
    return (
      route.markup_fixed_amount +
      percentageMarkup +
      route.priority_fee +
      route.base_shipping_cost +
      legacyPercentageMarkup +
      weightMarkup
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading markups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Markup Management</h2>
          <p className="text-gray-600">Add percentage or fixed amount markups to routes and countries</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => activeTab === 'routes' ? fetchRouteMarkups() : fetchCountryMarkups()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-4 border-b pb-2 mb-4">
        <button
          className={`px-4 py-2 font-semibold rounded-t ${activeTab === 'routes' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setActiveTab('routes')}
        >
          Route Markups
        </button>
        <button
          className={`px-4 py-2 font-semibold rounded-t ${activeTab === 'countries' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setActiveTab('countries')}
        >
          Country Markups
        </button>
      </div>

      {/* Route Markups Tab */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {routeMarkups.map((route) => (
              <Card key={route.id} className={hasMarkup(route) ? 'border-teal-200 bg-teal-50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        <ShippingRouteDisplay
                          origin={route.origin_country}
                          destination={route.destination_country}
                          showCodes={true}
                          showIcon={false}
                        />
                      </CardTitle>
                      {hasMarkup(route) && (
                        <Badge variant="secondary">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Has Markup
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingRoute(route);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-2">Current Markups:</p>
                      <div className="space-y-1">
                        {route.markup_percentage > 0 && (
                          <div className="flex items-center gap-2">
                            <Percent className="h-3 w-3 text-teal-500" />
                            <span>Markup: {route.markup_percentage}%</span>
                          </div>
                        )}
                        {route.markup_fixed_amount > 0 && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3 text-green-500" />
                            <span>Fixed: {getCurrencySymbolFromCountry(route.origin_country)}{route.markup_fixed_amount}</span>
                          </div>
                        )}
                        {route.exchange_rate_markup > 0 && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-orange-500" />
                            <span>Exchange Rate: +{route.exchange_rate_markup}</span>
                          </div>
                        )}
                        {route.priority_fee > 0 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                            <span>Priority: {getCurrencySymbolFromCountry(route.origin_country)}{route.priority_fee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Legacy Costs:</p>
                      <div className="space-y-1">
                        {route.cost_percentage > 0 && (
                          <div className="flex items-center gap-2">
                            <Percent className="h-3 w-3 text-gray-500" />
                            <span>Legacy %: {route.cost_percentage}%</span>
                          </div>
                        )}
                        {route.base_shipping_cost > 0 && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3 text-gray-500" />
                            <span>Base: {getCurrencySymbolFromCountry(route.origin_country)}{route.base_shipping_cost}</span>
                          </div>
                        )}
                        {route.cost_per_kg > 0 && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3 text-gray-500" />
                            <span>Per kg: {getCurrencySymbolFromCountry(route.origin_country)}{route.cost_per_kg}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasMarkup(route) && (
                    <div className="mt-4 p-3 bg-teal-100 rounded-lg">
                      <p className="text-sm font-medium">Sample Calculation (100 USD, 1 kg):</p>
                      <p className="text-sm">
                        Total Extra Cost: {getCurrencySymbolFromCountry(route.origin_country)}{calculateTotalMarkup(route, 100, 1).toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Country Markups Tab */}
      {activeTab === 'countries' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {countryMarkups.map((country) => (
              <Card key={country.code} className={hasCountryMarkup(country) ? 'border-green-200 bg-green-50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {country.name || country.code} ({country.code})
                      </CardTitle>
                      {hasCountryMarkup(country) && (
                        <Badge variant="secondary">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Has Markup
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCountry(country);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {country.country_markup_percentage > 0 && (
                      <div className="flex items-center gap-2">
                        <Percent className="h-3 w-3 text-teal-500" />
                        <span>Country Markup: {country.country_markup_percentage}%</span>
                      </div>
                    )}
                    {country.country_markup_fixed > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-green-500" />
                        <span>Fixed Fee: {getCurrencySymbolFromCountry(country.code)}{country.country_markup_fixed}</span>
                      </div>
                    )}
                    {country.exchange_rate_adjustment !== 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-orange-500" />
                        <span>Exchange Rate Adjustment: {country.exchange_rate_adjustment > 0 ? '+' : ''}{country.exchange_rate_adjustment}</span>
                      </div>
                    )}
                    {country.country_markup_notes && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        <strong>Notes:</strong> {country.country_markup_notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? 'Edit Route Markup' : 'Edit Country Markup'}
            </DialogTitle>
            <DialogDescription>
              {editingRoute 
                ? `Configure markups for ${editingRoute.origin_country} → ${editingRoute.destination_country}`
                : `Configure markups for ${editingCountry?.name || editingCountry?.code}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {editingRoute && (
            <RouteMarkupForm
              route={editingRoute}
              onSave={(updates) => {
                updateRouteMarkup(editingRoute.id, updates);
                setIsDialogOpen(false);
                setEditingRoute(null);
              }}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingRoute(null);
              }}
            />
          )}
          
          {editingCountry && (
            <CountryMarkupForm
              country={editingCountry}
              onSave={(updates) => {
                updateCountryMarkup(editingCountry.code, updates);
                setIsDialogOpen(false);
                setEditingCountry(null);
              }}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingCountry(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Route Markup Form Component
function RouteMarkupForm({ route, onSave, onCancel }: {
  route: RouteMarkup;
  onSave: (updates: Partial<RouteMarkup>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    markup_percentage: route.markup_percentage || 0,
    markup_fixed_amount: route.markup_fixed_amount || 0,
    exchange_rate_markup: route.exchange_rate_markup || 0,
    priority_fee: route.priority_fee || 0,
    markup_notes: route.markup_notes || '',
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="markup_percentage">Markup Percentage (%)</Label>
          <Input
            id="markup_percentage"
            type="number"
            step="0.01"
            value={formData.markup_percentage}
            onChange={(e) => setFormData(prev => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">Additional percentage of item price</p>
        </div>
        <div>
          <Label htmlFor="markup_fixed_amount">Fixed Markup Amount</Label>
          <Input
            id="markup_fixed_amount"
            type="number"
            step="0.01"
            value={formData.markup_fixed_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, markup_fixed_amount: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">Fixed amount in {getCurrencySymbolFromCountry(route.origin_country)}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="exchange_rate_markup">Exchange Rate Markup</Label>
          <Input
            id="exchange_rate_markup"
            type="number"
            step="0.0001"
            value={formData.exchange_rate_markup}
            onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate_markup: parseFloat(e.target.value) || 0 }))}
            placeholder="0.0000"
          />
          <p className="text-xs text-gray-500 mt-1">Additional exchange rate adjustment</p>
        </div>
        <div>
          <Label htmlFor="priority_fee">Priority Fee</Label>
          <Input
            id="priority_fee"
            type="number"
            step="0.01"
            value={formData.priority_fee}
            onChange={(e) => setFormData(prev => ({ ...prev, priority_fee: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">Priority processing fee</p>
        </div>
      </div>
      
      <div>
        <Label htmlFor="markup_notes">Notes</Label>
        <textarea
          id="markup_notes"
          value={formData.markup_notes}
          onChange={(e) => setFormData(prev => ({ ...prev, markup_notes: e.target.value }))}
          placeholder="Optional notes about this markup..."
          rows={3}
          className="w-full p-2 border rounded-md"
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>
          Save Markup
        </Button>
      </div>
    </div>
  );
}

// Country Markup Form Component
function CountryMarkupForm({ country, onSave, onCancel }: {
  country: CountryMarkup;
  onSave: (updates: Partial<CountryMarkup>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    country_markup_percentage: country.country_markup_percentage || 0,
    country_markup_fixed: country.country_markup_fixed || 0,
    exchange_rate_adjustment: country.exchange_rate_adjustment || 0,
    country_markup_notes: country.country_markup_notes || '',
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country_markup_percentage">Country Markup Percentage (%)</Label>
          <Input
            id="country_markup_percentage"
            type="number"
            step="0.01"
            value={formData.country_markup_percentage}
            onChange={(e) => setFormData(prev => ({ ...prev, country_markup_percentage: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">Applied to all routes to this country</p>
        </div>
        <div>
          <Label htmlFor="country_markup_fixed">Fixed Country Fee</Label>
          <Input
            id="country_markup_fixed"
            type="number"
            step="0.01"
            value={formData.country_markup_fixed}
            onChange={(e) => setFormData(prev => ({ ...prev, country_markup_fixed: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">Fixed fee in {getCurrencySymbolFromCountry(country.code)}</p>
        </div>
      </div>
      
      <div>
        <Label htmlFor="exchange_rate_adjustment">Exchange Rate Adjustment</Label>
        <Input
          id="exchange_rate_adjustment"
          type="number"
          step="0.0001"
          value={formData.exchange_rate_adjustment}
          onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate_adjustment: parseFloat(e.target.value) || 0 }))}
          placeholder="0.0000"
        />
        <p className="text-xs text-gray-500 mt-1">
          Adjustment to exchange rate (positive = more expensive, negative = cheaper)
        </p>
      </div>
      
      <div>
        <Label htmlFor="country_markup_notes">Notes</Label>
        <textarea
          id="country_markup_notes"
          value={formData.country_markup_notes}
          onChange={(e) => setFormData(prev => ({ ...prev, country_markup_notes: e.target.value }))}
          placeholder="Optional notes about this country's markup..."
          rows={3}
          className="w-full p-2 border rounded-md"
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>
          Save Markup
        </Button>
      </div>
    </div>
  );
}