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
import { currencyService } from '@/services/CurrencyService';
import { RefreshCw, TrendingUp, Globe, ArrowRightLeft, Settings, CheckCircle } from 'lucide-react';
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

  const fetchExchangeRates = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch existing exchange rates
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

  useEffect(() => {
    fetchExchangeRates();
  }, [fetchExchangeRates]);

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

  const updateShippingRouteRates = async () => {
    try {
      setLoading(true);
      console.log('🔄 [ExchangeRateManager] Starting shipping route exchange rate updates...');

      // Step 1: First update the base exchange rates using our admin service
      console.log('🔄 [ExchangeRateManager] Updating base exchange rates...');
      
      const { data: updateResult, error: updateError } = await supabase.functions.invoke(
        'admin-update-exchange-rates',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (updateError) {
        console.error('❌ [ExchangeRateManager] Base update failed:', updateError);
        throw new Error(`Base exchange rate update failed: ${updateError.message}`);
      }

      if (!updateResult?.success) {
        throw new Error(updateResult?.error || 'Base exchange rate update failed');
      }

      const baseUpdatedCount = updateResult?.updated_count || 0;
      console.log(`✅ [ExchangeRateManager] Base rates updated: ${baseUpdatedCount} countries`);

      // Step 2: Now update shipping routes with the fresh exchange rates
      console.log('🔄 [ExchangeRateManager] Updating shipping route exchange rates...');

      // Get all active shipping routes
      const { data: routes, error: routesError } = await supabase
        .from('shipping_routes')
        .select('id, origin_country, destination_country')
        .eq('is_active', true);

      if (routesError) throw routesError;

      let routeUpdatedCount = 0;

      // Calculate fresh rates directly from country_settings data instead of using stale D1 cache
      console.log(`🔄 [ExchangeRateManager] Found ${routes.length} active shipping routes to update:`, routes);
      
      // Get fresh country settings data directly from database
      const { data: countrySettings, error: countryError } = await supabase
        .from('country_settings')
        .select('code, rate_from_usd, currency')
        .not('rate_from_usd', 'is', null);

      if (countryError) {
        console.error('❌ [ExchangeRateManager] Failed to fetch country settings:', countryError);
        throw new Error(`Could not fetch country settings: ${countryError.message}`);
      }

      console.log(`✅ [ExchangeRateManager] Loaded ${countrySettings.length} country settings with fresh USD rates`);
      
      // Create lookup map for quick access
      const countryRates = new Map();
      countrySettings.forEach(country => {
        countryRates.set(country.code, country.rate_from_usd);
        console.log(`📊 [ExchangeRateManager] ${country.code} (${country.currency}): ${country.rate_from_usd} per USD`);
      });
      
      for (const route of routes) {
        try {
          console.log(`🔄 [ExchangeRateManager] Processing route ${route.id}: ${route.origin_country} → ${route.destination_country}`);
          
          // Skip INR → NPR (India → Nepal) route - do not update this exchange rate
          if (route.origin_country === 'IN' && route.destination_country === 'NP') {
            console.log(`⏭️ [ExchangeRateManager] Skipping INR → NPR route ${route.id} as requested - keeping existing rate`);
            continue;
          }
          
          // Calculate exchange rate directly from country_settings data
          const originRate = countryRates.get(route.origin_country);
          const destRate = countryRates.get(route.destination_country);
          
          console.log(`📊 [ExchangeRateManager] Rates: ${route.origin_country}=${originRate}/USD, ${route.destination_country}=${destRate}/USD`);
          
          if (!originRate || !destRate || originRate <= 0 || destRate <= 0) {
            console.warn(`⚠️ [ExchangeRateManager] Skipping route ${route.id}: missing or invalid rates (${originRate}, ${destRate})`);
            continue;
          }
          
          // Cross-rate calculation: dest_rate / origin_rate
          const exchangeRate = destRate / originRate;
          const roundedRate = parseFloat(exchangeRate.toFixed(4));
          
          console.log(`🧮 [ExchangeRateManager] Calculated cross-rate: ${destRate} ÷ ${originRate} = ${roundedRate}`);
          
          const { error: routeUpdateError } = await supabase
            .from('shipping_routes')
            .update({
              exchange_rate: roundedRate,
              updated_at: new Date().toISOString(),
            })
            .eq('id', route.id);

          if (!routeUpdateError) {
            routeUpdatedCount++;
            console.log(`✅ [ExchangeRateManager] Route ${route.id} updated: ${route.origin_country} → ${route.destination_country} = ${roundedRate}`);
          } else {
            console.error(`❌ [ExchangeRateManager] Route ${route.id} update failed:`, routeUpdateError);
          }
        } catch (routeError) {
          console.error(`❌ [ExchangeRateManager] Route ${route.id} calculation failed for ${route.origin_country} → ${route.destination_country}:`, routeError);
        }
      }

      console.log(`✅ [ExchangeRateManager] Update completed: ${baseUpdatedCount} countries, ${routeUpdatedCount} routes`);

      toast({
        title: '🎉 Exchange Rates Updated Successfully!',
        description: `Updated ${baseUpdatedCount} base rates and ${routeUpdatedCount} shipping routes with live rates and freshness validation.`,
      });

      // Refresh the display
      fetchExchangeRates();
      
    } catch (error) {
      console.error('💥 [ExchangeRateManager] Error updating rates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: '❌ Failed to Update Exchange Rates',
        description: `${errorMessage}. Some rates may have been updated.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
      console.log(`🧪 [TEST] Starting exchange rate test: ${originCountry} → ${destinationCountry}`);
      
      // Calculate rate directly from country_settings data (bypass D1 cache completely)
      console.log(`🔄 [TEST] Fetching fresh country_settings data directly from database...`);
      
      const { data: countrySettings, error: countryError } = await supabase
        .from('country_settings')
        .select('code, rate_from_usd, currency')
        .in('code', [originCountry, destinationCountry])
        .not('rate_from_usd', 'is', null);

      if (countryError) {
        console.error('❌ [TEST] Failed to fetch country settings:', countryError);
        throw new Error(`Could not fetch country settings: ${countryError.message}`);
      }

      console.log(`✅ [TEST] Loaded ${countrySettings.length} country settings:`, countrySettings);
      
      const originCountryData = countrySettings.find(c => c.code === originCountry);
      const destCountryData = countrySettings.find(c => c.code === destinationCountry);
      
      if (!originCountryData || !destCountryData) {
        console.log(`❌ [TEST] Missing country data - origin: ${!!originCountryData}, dest: ${!!destCountryData}`);
        toast({
          title: 'Test Failed - Country Data Missing',
          description: `Missing exchange rate data for ${originCountry} or ${destinationCountry} in database.`,
          variant: 'destructive',
        });
        return;
      }
      
      // Same currency check
      if (originCountry === destinationCountry) {
        console.log(`✅ [TEST] Same country, returning rate: 1.0`);
        const rate = 1.0;
        
        toast({
          title: `Exchange Rate Test - Same Country`,
          description: `${originCountry} → ${destinationCountry}: Rate = 1.0000 (same currency)`,
        });
        return;
      }
      
      // Cross-rate calculation: dest_rate / origin_rate
      const originRate = originCountryData.rate_from_usd;
      const destRate = destCountryData.rate_from_usd;
      const rate = destRate / originRate;
      
      console.log(`🧮 [TEST] Calculated cross-rate: ${destRate} (${destCountryData.currency}/USD) ÷ ${originRate} (${originCountryData.currency}/USD) = ${rate}`);
      console.log(`🧪 [TEST] Test completed with fresh database rate: ${rate}`);

      // Validation check
      if (!rate || rate <= 0 || rate > 10000) {
        console.log(`❌ [TEST] Invalid calculated rate: ${rate}`);
        toast({
          title: 'Test Failed - Invalid Rate',
          description: `Calculated invalid exchange rate: ${rate}. Check country settings data.`,
          variant: 'destructive',
        });
        return;
      }

      // Get currency symbols for better display
      const originCurrency = currencyService.getCurrencyForCountrySync(originCountry);
      const destCurrency = currencyService.getCurrencyForCountrySync(destinationCountry);
      
      const originSymbol = currencyService.getCurrencySymbol(originCurrency);
      const destSymbol = currencyService.getCurrencySymbol(destCurrency);

      // Determine confidence based on rate reasonableness and freshness
      let confidence: 'success' | 'warning' | 'destructive' = 'success';
      let statusMessage = '';
      
      if (rate <= 0 || rate > 10000) {
        confidence = 'destructive';
        statusMessage = ' ❌ Invalid rate';
      } else if (rate === 1.0 && originCountry !== destinationCountry) {
        confidence = 'warning';
        statusMessage = ' ⚠️ Fallback rate';
      } else {
        // Check console logs to determine actual source
        console.log(`🔍 [TEST] Analyzing rate source for ${originCountry}→${destinationCountry}: ${rate}`);
        
        // We'll update this based on what we see in logs
        // For now, let's be honest about the uncertainty
        statusMessage = ' 📊 Check console for data source';
        confidence = 'warning'; // Until we confirm it's truly live
      }

      toast({
        title: `Exchange Rate Test`,
        description: `${originCountry} → ${destinationCountry}: 1 ${originSymbol} = ${rate.toFixed(4)} ${destSymbol}${statusMessage}`,
        variant: confidence === 'destructive' ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('🚨 [TEST] Exchange rate test failed:', error);
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Could not test exchange rate',
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
          <Button onClick={updateShippingRouteRates} variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Update Routes
          </Button>
          <Button 
            onClick={async () => {
              console.log('🔍 [D1Health] Testing D1 Edge API health...');
              try {
                const response = await fetch('https://iwishbag-edge-api.rnkbohra.workers.dev/api/countries');
                const data = await response.json();
                console.log('🔍 [D1Health] D1 API Response:', data);
                
                if (data.countries && data.countries.length > 0) {
                  const sampleCountry = data.countries[0];
                  const dataAge = sampleCountry.updated_at ? 
                    Math.round((Date.now() - (sampleCountry.updated_at * 1000)) / (1000 * 60 * 60)) : 
                    'unknown';
                  
                  toast({
                    title: 'D1 Edge API Status',
                    description: `✅ API responding with ${data.countries.length} countries. Sample data age: ${dataAge}h`,
                  });
                } else {
                  toast({
                    title: 'D1 Edge API Status', 
                    description: '⚠️ API responding but no country data found',
                    variant: 'destructive'
                  });
                }
              } catch (error) {
                console.error('🚨 [D1Health] D1 API Error:', error);
                toast({
                  title: 'D1 Edge API Status',
                  description: `❌ API not responding: ${error.message}`,
                  variant: 'destructive'
                });
              }
            }}
            variant="outline" 
            size="sm"
          >
            <Globe className="h-4 w-4 mr-2" />
            Test D1 API
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
                            {country.name} (
                            {currencyService.getCurrencySymbol(
                              currencyService.getCurrencyForCountrySync(country.code),
                            )}
                            )
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
                            {country.name} (
                            {currencyService.getCurrencySymbol(
                              currencyService.getCurrencyForCountrySync(country.code),
                            )}
                            )
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
                      1{' '}
                      {currencyService.getCurrencySymbol(
                        currencyService.getCurrencyForCountrySync(newRate.origin_country),
                      )}{' '}
                      = {newRate.exchange_rate}{' '}
                      {currencyService.getCurrencySymbol(
                        currencyService.getCurrencyForCountrySync(newRate.destination_country),
                      )}
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
          const originCurrency = currencyService.getCurrencyForCountrySync(rate.origin_country);
          const destinationCurrency = currencyService.getCurrencyForCountrySync(
            rate.destination_country,
          );

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
                        1{' '}
                        {currencyService.getCurrencySymbol(
                          currencyService.getCurrencyForCountrySync(rate.origin_country),
                        )}{' '}
                        = {rate.exchange_rate}{' '}
                        {currencyService.getCurrencySymbol(
                          currencyService.getCurrencyForCountrySync(rate.destination_country),
                        )}
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
        <Card className="shadow-sm border-blue-200 bg-blue-50/20 overflow-hidden">
          {/* Configuration Prompt Indicator */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1 w-full" />

          <CardContent className="p-6">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Exchange Rates Configuration
                </h3>
                <p className="text-gray-600 mb-4">
                  No exchange rates configured yet. Set up currency conversion to enable accurate
                  pricing.
                </p>
              </div>

              {/* Configuration Options */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                <div className="flex items-start space-x-3">
                  <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 text-sm mb-2">Quick Setup Options</h4>

                    <div className="space-y-2 text-xs text-blue-800">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        <span>
                          <strong>Automatic:</strong> Configure Exchange Rate API in System Settings
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        <span>
                          <strong>Manual:</strong> Create custom rates for specific shipping routes
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        <span>
                          <strong>Hybrid:</strong> Use API rates with manual overrides
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-3 text-xs">
                      <Button
                        size="sm"
                        onClick={() => (window.location.href = '/admin/system-settings')}
                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        System Settings
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (window.location.href = '/admin/shipping-routes')}
                        className="h-7 px-3 border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Shipping Routes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="text-left">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Benefits of configuring exchange rates:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Accurate multi-currency pricing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Automatic rate updates</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Consistent profit margins</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Better customer experience</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
