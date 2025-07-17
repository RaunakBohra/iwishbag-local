import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, CreditCard, Globe, DollarSign } from 'lucide-react';

export const PaymentGatewayTester = () => {
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  interface TestResults {
    paypalExists?: boolean;
    paypalConfig?: Record<string, unknown>;
    countryConfigs?: Array<{
      code: string;
      default_gateway: string | null;
      available_gateways: string[] | null;
    }>;
    profileColumnExists?: boolean;
    paymentTest?: {
      availableMethods: string[];
      recommendedMethod: string | null;
      methodCount: number;
    };
  }

  const [testResults, setTestResults] = useState<TestResults>({});
  const [testing, setTesting] = useState(false);

  const {
    availableMethods,
    methodsLoading,
    getPaymentMethodDisplay,
    getRecommendedPaymentMethodSync,
    _createPayment,
  } = usePaymentGateways(selectedCurrency, selectedCountry);

  const testCountries = [
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'IN', name: 'India', currency: 'INR' },
    { code: 'NP', name: 'Nepal', currency: 'NPR' },
    { code: 'CA', name: 'Canada', currency: 'CAD' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
    { code: 'AU', name: 'Australia', currency: 'AUD' },
    { code: 'DE', name: 'Germany', currency: 'EUR' },
  ];

  const runTests = async () => {
    setTesting(true);
    const results: TestResults = {};

    // Test 1: Check PayPal gateway exists
    try {
      const { data: paypalGateway } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('code', 'paypal')
        .single();

      results.paypalExists = !!paypalGateway;
      results.paypalConfig = paypalGateway?.config;
    } catch {
      results.paypalExists = false;
    }

    // Test 2: Check country configurations
    try {
      const { data: countries } = await supabase
        .from('country_settings')
        .select('code, default_gateway, available_gateways')
        .in(
          'code',
          testCountries.map((c) => c.code),
        );

      results.countryConfigs = countries;
    } catch {
      results.countryConfigs = [];
    }

    // Test 3: Check profile column
    try {
      const { data: _profile } = await supabase
        .from('profiles')
        .select('preferred_payment_gateway')
        .limit(1)
        .single();

      results.profileColumnExists = true;
    } catch {
      results.profileColumnExists = false;
    }

    // Test 4: Test payment creation (dry run)
    results.paymentTest = {
      availableMethods: availableMethods || [],
      recommendedMethod: getRecommendedPaymentMethodSync(),
      methodCount: availableMethods?.length || 0,
    };

    setTestResults(results);
    setTesting(false);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Gateway Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Country/Currency Selector */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Test Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testCountries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {country.name} ({country.code})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Test Currency</label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testCountries.map((country) => (
                    <SelectItem key={country.currency} value={country.currency}>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {country.currency}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available Methods */}
          <div>
            <h3 className="text-sm font-medium mb-2">Available Payment Methods</h3>
            {methodsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableMethods?.map((method) => {
                  const display = getPaymentMethodDisplay(method);
                  return (
                    <Badge
                      key={method}
                      variant={
                        getRecommendedPaymentMethodSync() === method ? 'default' : 'secondary'
                      }
                    >
                      {display.name}
                      {getRecommendedPaymentMethodSync() === method && ' (Recommended)'}
                    </Badge>
                  );
                }) || <span className="text-sm text-gray-500">No methods available</span>}
              </div>
            )}
          </div>

          {/* Run Tests Button */}
          <Button onClick={runTests} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Integration Tests'
            )}
          </Button>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-medium">Test Results:</h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">PayPal Gateway Exists</span>
                  {getStatusIcon(testResults.paypalExists)}
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Profile Column Exists</span>
                  {getStatusIcon(testResults.profileColumnExists)}
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">Countries Configured</span>
                  <Badge variant="outline">
                    {testResults.countryConfigs?.length || 0} countries
                  </Badge>
                </div>

                {testResults.paypalConfig && (
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">PayPal Configuration:</span>
                    <div className="text-xs mt-1">
                      <p>Environment: {testResults.paypalConfig.environment}</p>
                      <p>
                        Sandbox Client ID:{' '}
                        {testResults.paypalConfig.client_id_sandbox ? '✓ Set' : '✗ Not set'}
                      </p>
                      <p>
                        Sandbox Secret:{' '}
                        {testResults.paypalConfig.client_secret_sandbox ? '✓ Set' : '✗ Not set'}
                      </p>
                    </div>
                  </div>
                )}

                {testResults.countryConfigs && (
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Country Gateway Settings:</span>
                    <div className="text-xs mt-1 space-y-1">
                      {testResults.countryConfigs.map((country) => (
                        <div key={country.code}>
                          {country.code}: {country.default_gateway}
                          <span className="text-gray-500 ml-1">
                            ({country.available_gateways?.length || 0} available)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
