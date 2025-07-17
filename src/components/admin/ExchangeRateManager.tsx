import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { useAllCountries } from '../../hooks/useAllCountries';
import {
  getCurrencySymbolFromCountry,
  getCountryCurrency,
  getExchangeRate,
} from '../../lib/currencyUtils';
import { RefreshCw, TrendingUp, Globe, ArrowRightLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { ShippingRouteDisplay } from '../shared/ShippingRouteDisplay';

interface ExchangeRateData {
  id?: number;
  origin_country: string;
  destination_country: string;
  exchange_rate: number;
  last_updated?: string;
  source: 'manual' | 'api' | 'calculated';
}

export function ExchangeRateManager() {
  const [rates, setRates] = useState<ExchangeRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: countries = [] } = useAllCountries();
  const { toast } = useToast();

  const [newRate, setNewRate] = useState({
    origin_country: '',
    destination_country: '',
    exchange_rate: 1,
  });

  useEffect(() => {
    fetchExchangeRates();
  }, [fetchExchangeRates]);

  const fetchExchangeRates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_routes')
        .select('id, origin_country, destination_country, exchange_rate, updated_at')
        .not('exchange_rate', 'is', null)
        .order('origin_country')
        .order('destination_country');

      if (error) throw error;

      const formattedRates =
        data?.map((rate) => ({
          ...rate,
          last_updated: rate.updated_at,
          source: 'manual' as const,
        })) || [];

      setRates(formattedRates);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exchange rates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateExchangeRate = async (id: number, newExchangeRate: number) => {
    try {
      const { error } = await supabase
        .from('shipping_routes')
        .update({
          exchange_rate: newExchangeRate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Exchange rate updated successfully',
      });

      fetchExchangeRates();
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exchange rate',
        variant: 'destructive',
      });
    }
  };

  const createNewRate = async () => {
    if (!newRate.origin_country || !newRate.destination_country) {
      toast({
        title: 'Error',
        description: 'Please select both origin and destination countries',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if route exists
      const { data: existingRoute } = await supabase
        .from('shipping_routes')
        .select('id')
        .eq('origin_country', newRate.origin_country)
        .eq('destination_country', newRate.destination_country)
        .maybeSingle();

      if (existingRoute) {
        // Update existing route
        await updateExchangeRate(existingRoute.id, newRate.exchange_rate);
      } else {
        // Create new route with minimal data
        const { error } = await supabase.from('shipping_routes').insert({
          origin_country: newRate.origin_country,
          destination_country: newRate.destination_country,
          exchange_rate: newRate.exchange_rate,
          base_shipping_cost: 0,
          cost_per_kg: 0,
          cost_percentage: 0,
          processing_days: 2,
          customs_clearance_days: 3,
          weight_unit: 'kg',
          is_active: true,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'New exchange rate created successfully',
        });
      }

      setIsCreateDialogOpen(false);
      setNewRate({
        origin_country: '',
        destination_country: '',
        exchange_rate: 1,
      });
      fetchExchangeRates();
    } catch (error) {
      console.error('Error creating exchange rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to create exchange rate',
        variant: 'destructive',
      });
    }
  };

  const testExchangeRate = async (originCountry: string, destinationCountry: string) => {
    try {
      const result = await getExchangeRate(originCountry, destinationCountry);

      const confidence =
        result.confidence === 'high'
          ? 'success'
          : result.confidence === 'medium'
            ? 'warning'
            : 'destructive';

      toast({
        title: `Exchange Rate Test`,
        description: `${originCountry} → ${destinationCountry}: ${result.rate} (${result.source})`,
        variant: confidence === 'destructive' ? 'destructive' : 'default',
      });
    } catch {
      toast({
        title: 'Test Failed',
        description: 'Could not test exchange rate',
        variant: 'destructive',
      });
    }
  };

  const getRateStatus = (rate: ExchangeRateData) => {
    const daysSinceUpdate = rate.last_updated
      ? Math.floor((Date.now() - new Date(rate.last_updated).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceUpdate > 30) return { color: 'destructive', label: 'Stale' };
    if (daysSinceUpdate > 7) return { color: 'warning', label: 'Old' };
    return { color: 'success', label: 'Fresh' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading exchange rates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exchange Rate Management</h2>
          <p className="text-gray-600">Manage currency conversion rates for shipping routes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchExchangeRates} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <TrendingUp className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Exchange Rate</DialogTitle>
                <DialogDescription>
                  Create or update an exchange rate for a specific route.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin">Origin Country</Label>
                    <Select
                      value={newRate.origin_country}
                      onValueChange={(value) =>
                        setNewRate((prev) => ({ ...prev, origin_country: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select origin" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({getCurrencySymbolFromCountry(country.code)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="destination">Destination Country</Label>
                    <Select
                      value={newRate.destination_country}
                      onValueChange={(value) =>
                        setNewRate((prev) => ({
                          ...prev,
                          destination_country: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({getCurrencySymbolFromCountry(country.code)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rate">Exchange Rate</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.0001"
                    value={newRate.exchange_rate}
                    onChange={(e) =>
                      setNewRate((prev) => ({
                        ...prev,
                        exchange_rate: parseFloat(e.target.value) || 1,
                      }))
                    }
                    placeholder="1.0000"
                  />
                  {newRate.origin_country && newRate.destination_country && (
                    <div className="text-xs text-gray-500 mt-1">
                      1 {getCurrencySymbolFromCountry(newRate.origin_country)} ={' '}
                      {newRate.exchange_rate}{' '}
                      {getCurrencySymbolFromCountry(newRate.destination_country)}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createNewRate}>Save Rate</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {rates.map((rate) => {
          const status = getRateStatus(rate);
          const originCurrency = getCountryCurrency(rate.origin_country);
          const destinationCurrency = getCountryCurrency(rate.destination_country);

          return (
            <Card key={rate.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <ShippingRouteDisplay
                        origin={rate.origin_country}
                        destination={rate.destination_country}
                        className="font-medium"
                        showIcon={false}
                      />
                      <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                      <ShippingRouteDisplay
                        origin={originCurrency}
                        destination={destinationCurrency}
                        className="text-sm text-gray-600"
                        showIcon={false}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          status.color === 'success'
                            ? 'default'
                            : status.color === 'warning'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {status.label}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Last updated:{' '}
                        {rate.last_updated
                          ? new Date(rate.last_updated).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold">
                        1 {getCurrencySymbolFromCountry(rate.origin_country)} = {rate.exchange_rate}{' '}
                        {getCurrencySymbolFromCountry(rate.destination_country)}
                      </div>
                      <div className="text-sm text-gray-500">Rate: {rate.exchange_rate}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          testExchangeRate(rate.origin_country, rate.destination_country)
                        }
                      >
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const routeText = `${rate.origin_country} → ${rate.destination_country}`;
                          const newRate = prompt(
                            `Enter new exchange rate for ${routeText}:`,
                            rate.exchange_rate.toString(),
                          );
                          if (newRate && !isNaN(parseFloat(newRate)) && rate.id) {
                            updateExchangeRate(rate.id, parseFloat(newRate));
                          }
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rates.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No exchange rates configured yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Create your first exchange rate to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
