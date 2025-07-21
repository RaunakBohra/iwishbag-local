import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { RefreshCw, AlertTriangle, CheckCircle, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

interface CountrySettings {
  code: string;
  currency: string;
  rate_from_usd: number;
  updated_at: string;
  name: string;
}

interface CurrencyValidationResult {
  country: string;
  code: string;
  currentCurrency: string;
  suggestedCurrency: string;
  isValid: boolean;
}

// Standard ISO currency codes for common countries
const STANDARD_CURRENCY_CODES: { [key: string]: string } = {
  US: 'USD',
  GB: 'GBP',
  EU: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  JP: 'JPY',
  CN: 'CNY',
  IN: 'INR',
  NP: 'NPR',
  AU: 'AUD',
  CA: 'CAD',
  CH: 'CHF',
  SG: 'SGD',
  HK: 'HKD',
  KR: 'KRW',
  TH: 'THB',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  BD: 'BDT',
  LK: 'LKR',
  PK: 'PKR',
  AE: 'AED',
  SA: 'SAR',
  BR: 'BRL',
  MX: 'MXN',
  ZA: 'ZAR',
  NG: 'NGN',
  EG: 'EGP',
  TR: 'TRY',
  RU: 'RUB',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  IL: 'ILS',
  NZ: 'NZD',
};

export function CountrySettingsManager() {
  const [countries, setCountries] = useState<CountrySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationResults, setValidationResults] = useState<CurrencyValidationResult[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const { toast } = useToast();

  const fetchCountries = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('country_settings')
        .select('code, currency, rate_from_usd, updated_at, name')
        .order('code');

      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch country settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const validateCurrencyCodes = useCallback(async () => {
    try {
      setLoading(true);

      // Check each country's currency code against standard ISO codes
      const results: CurrencyValidationResult[] = [];

      for (const country of countries) {
        const standardCurrency = STANDARD_CURRENCY_CODES[country.code];
        const isValid = !standardCurrency || country.currency === standardCurrency;

        if (!isValid) {
          results.push({
            country: country.name || country.code,
            code: country.code,
            currentCurrency: country.currency,
            suggestedCurrency: standardCurrency,
            isValid: false,
          });
        }
      }

      setValidationResults(results);
      setShowValidation(true);

      if (results.length === 0) {
        toast({
          title: 'Validation Complete',
          description: 'All currency codes are valid',
        });
      } else {
        toast({
          title: 'Validation Issues Found',
          description: `Found ${results.length} countries with incorrect currency codes`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error validating currency codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate currency codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [countries, toast]);

  const fixCurrencyCode = async (countryCode: string, newCurrency: string) => {
    try {
      const { error } = await supabase
        .from('country_settings')
        .update({
          currency: newCurrency,
          updated_at: new Date().toISOString(),
        })
        .eq('code', countryCode);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated ${countryCode} currency to ${newCurrency}`,
      });

      // Refresh data and validation
      await fetchCountries();
      setValidationResults((prev) => prev.filter((r) => r.code !== countryCode));
    } catch (error) {
      console.error('Error fixing currency code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update currency code',
        variant: 'destructive',
      });
    }
  };

  const fixAllCurrencyCodes = async () => {
    try {
      setLoading(true);
      let fixedCount = 0;

      for (const result of validationResults) {
        const { error } = await supabase
          .from('country_settings')
          .update({
            currency: result.suggestedCurrency,
            updated_at: new Date().toISOString(),
          })
          .eq('code', result.code);

        if (!error) {
          fixedCount++;
        }
      }

      toast({
        title: 'Bulk Fix Complete',
        description: `Fixed ${fixedCount} currency codes`,
      });

      // Refresh data and clear validation
      await fetchCountries();
      setValidationResults([]);
      setShowValidation(false);
    } catch (error) {
      console.error('Error fixing all currency codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix all currency codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading country settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Country Settings</h2>
          <p className="text-gray-600">Manage country currencies and exchange rates</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCountries} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={validateCurrencyCodes} variant="outline" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Validate
          </Button>
        </div>
      </div>

      {showValidation && validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Currency Code Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  The following countries have incorrect currency codes that may prevent exchange
                  rate updates:
                </p>
                <Button onClick={fixAllCurrencyCodes} size="sm">
                  Fix All
                </Button>
              </div>

              <div className="space-y-2">
                {validationResults.map((result) => (
                  <div
                    key={result.code}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="font-medium">
                          {result.country} ({result.code})
                        </p>
                        <p className="text-sm text-gray-600">
                          Current:{' '}
                          <span className="font-mono bg-red-100 px-1 rounded">
                            {result.currentCurrency}
                          </span>
                          {' → '}
                          Suggested:{' '}
                          <span className="font-mono bg-green-100 px-1 rounded">
                            {result.suggestedCurrency}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => fixCurrencyCode(result.code, result.suggestedCurrency)}
                      size="sm"
                      variant="outline"
                    >
                      Fix
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {countries.map((country) => {
          const hasValidCurrency =
            !STANDARD_CURRENCY_CODES[country.code] ||
            country.currency === STANDARD_CURRENCY_CODES[country.code];
          const hasValidRate = country.rate_from_usd > 0 && country.rate_from_usd !== 1;

          return (
            <Card key={country.code}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{country.name || country.code}</h3>
                      <Badge variant="secondary">{country.code}</Badge>
                      <Badge variant={hasValidCurrency ? 'default' : 'destructive'}>
                        {country.currency}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Rate: {country.rate_from_usd}</span>
                      <span>Updated: {new Date(country.updated_at).toLocaleDateString()}</span>
                      {hasValidRate ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {countries.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No countries configured yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
