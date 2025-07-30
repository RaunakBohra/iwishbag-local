import { useState, useEffect } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Globe, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Package,
  ShoppingCart,
  Truck,
  Activity,
  Users,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CountrySetting = Tables<'country_settings'>;

interface MarketViewProps {
  countries: CountrySetting[];
  onEditCountry: (country: CountrySetting) => void;
  onDeleteCountry: (code: string) => void;
  selectedCountries: string[];
  onSelectionChange: (countries: string[]) => void;
  onConfigureMarket?: (marketCode: string) => void;
}

interface MarketGroup {
  name: string;
  code: string;
  countries: CountrySetting[];
  primaryCountry?: string;
}

const defaultMarkets: MarketGroup[] = [
  { name: 'North America', code: 'NA', countries: [], primaryCountry: 'US' },
  { name: 'Europe', code: 'EU', countries: [], primaryCountry: 'DE' },
  { name: 'Asia Pacific', code: 'APAC', countries: [], primaryCountry: 'CN' },
  { name: 'South America', code: 'SA', countries: [], primaryCountry: 'BR' },
  { name: 'Middle East & Africa', code: 'MEA', countries: [], primaryCountry: 'AE' },
  { name: 'Oceania', code: 'OCE', countries: [], primaryCountry: 'AU' },
];

export const MarketView = ({ 
  countries, 
  onEditCountry, 
  onDeleteCountry,
  selectedCountries,
  onSelectionChange,
  onConfigureMarket
}: MarketViewProps) => {
  const [expandedMarkets, setExpandedMarkets] = useState<string[]>(['NA', 'EU']);
  const [markets, setMarkets] = useState<MarketGroup[]>(defaultMarkets);

  // Group countries by continent/market
  useEffect(() => {
    const groupedMarkets = defaultMarkets.map(market => {
      let marketCountries: CountrySetting[] = [];

      switch (market.code) {
        case 'NA':
          marketCountries = countries.filter(c => 
            c.continent === 'North America' ||
            ['US', 'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'HT', 'DO', 'JM', 'TT', 'BB', 'BS', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC'].includes(c.code)
          );
          break;
        case 'EU':
          marketCountries = countries.filter(c => c.continent === 'Europe');
          break;
        case 'APAC':
          marketCountries = countries.filter(c => 
            c.continent === 'Asia' && 
            !['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'IL', 'SY', 'LB', 'IQ', 'IR', 'YE'].includes(c.code)
          );
          break;
        case 'SA':
          marketCountries = countries.filter(c => c.continent === 'South America');
          break;
        case 'MEA':
          marketCountries = countries.filter(c => 
            c.continent === 'Africa' ||
            ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'IL', 'SY', 'LB', 'IQ', 'IR', 'YE'].includes(c.code)
          );
          break;
        case 'OCE':
          marketCountries = countries.filter(c => c.continent === 'Oceania');
          break;
      }

      return {
        ...market,
        countries: marketCountries.sort((a, b) => {
          // Primary country first
          if (a.code === market.primaryCountry) return -1;
          if (b.code === market.primaryCountry) return 1;
          // Then by name
          return (a.display_name || a.name).localeCompare(b.display_name || b.name);
        })
      };
    });

    setMarkets(groupedMarkets.filter(m => m.countries.length > 0));
  }, [countries]);

  const toggleMarket = (marketCode: string) => {
    setExpandedMarkets(prev =>
      prev.includes(marketCode)
        ? prev.filter(code => code !== marketCode)
        : [...prev, marketCode]
    );
  };

  const toggleCountrySelection = (countryCode: string) => {
    if (selectedCountries.includes(countryCode)) {
      onSelectionChange(selectedCountries.filter(c => c !== countryCode));
    } else {
      onSelectionChange([...selectedCountries, countryCode]);
    }
  };

  const selectAllInMarket = (market: MarketGroup) => {
    const marketCountryCodes = market.countries.map(c => c.code);
    const allSelected = marketCountryCodes.every(code => selectedCountries.includes(code));
    
    if (allSelected) {
      onSelectionChange(selectedCountries.filter(c => !marketCountryCodes.includes(c)));
    } else {
      onSelectionChange([...new Set([...selectedCountries, ...marketCountryCodes])]);
    }
  };

  const getMarketStats = (market: MarketGroup) => {
    const active = market.countries.filter(c => c.is_active).length;
    const purchaseEnabled = market.countries.filter(c => c.purchase_allowed).length;
    const shippingEnabled = market.countries.filter(c => c.shipping_allowed).length;

    return { active, purchaseEnabled, shippingEnabled };
  };

  return (
    <div className="space-y-4">
      {markets.map((market) => {
        const isExpanded = expandedMarkets.includes(market.code);
        const stats = getMarketStats(market);
        const marketCountryCodes = market.countries.map(c => c.code);
        const selectedInMarket = marketCountryCodes.filter(code => selectedCountries.includes(code)).length;
        const allSelected = selectedInMarket === market.countries.length && market.countries.length > 0;
        const someSelected = selectedInMarket > 0 && selectedInMarket < market.countries.length;

        return (
          <Card key={market.code} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMarket(market.code)}
                    className="p-0 h-auto hover:bg-transparent"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </Button>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={() => selectAllInMarket(market)}
                    aria-label={`Select all countries in ${market.name}`}
                  />
                  <div>
                    <CardTitle className="text-lg">{market.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {market.countries.length} countries
                      {selectedInMarket > 0 && (
                        <span className="ml-2 text-blue-600 font-medium">
                          ({selectedInMarket} selected)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Activity className="h-3 w-3 mr-1" />
                      {stats.active} active
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      {stats.purchaseEnabled} purchase
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Truck className="h-3 w-3 mr-1" />
                      {stats.shippingEnabled} shipping
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-600"
                    onClick={() => onConfigureMarket?.(market.code)}
                  >
                    <Settings2 className="h-4 w-4 mr-1.5" />
                    Configure Market
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {market.countries.map((country) => {
                    const isPrimary = country.code === market.primaryCountry;
                    const isSelected = selectedCountries.includes(country.code);

                    return (
                      <div
                        key={country.code}
                        className={cn(
                          "border rounded-lg p-4 transition-all",
                          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
                          isPrimary && "ring-2 ring-teal-500 ring-offset-2"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleCountrySelection(country.code)}
                              aria-label={`Select ${country.name}`}
                            />
                            <div className="flex items-center gap-2">
                              {country.flag_emoji ? (
                                <span className="text-2xl">{country.flag_emoji}</span>
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Globe className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {country.display_name || country.name}
                                  {isPrimary && (
                                    <Badge className="ml-2 text-xs bg-teal-100 text-teal-700">Primary</Badge>
                                  )}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {country.code} • {country.currency.toUpperCase()}
                                  {country.phone_code && ` • ${country.phone_code}`}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEditCountry(country)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteCountry(country.code)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            {country.is_active ? (
                              <Badge className="text-xs bg-blue-100 text-blue-700">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                            {country.purchase_allowed && (
                              <Badge className="text-xs bg-green-100 text-green-700">Purchase</Badge>
                            )}
                            {country.shipping_allowed && (
                              <Badge className="text-xs bg-teal-100 text-teal-700">Shipping</Badge>
                            )}
                            {country.auto_tax_calculation && (
                              <Badge className="text-xs bg-purple-100 text-purple-700">Auto Tax</Badge>
                            )}
                          </div>
                          
                          <div className="text-gray-600">
                            <span className="font-medium">Rate:</span> {country.rate_from_usd} {country.currency.toUpperCase()}/USD
                          </div>
                          
                          {country.popular_payment_methods && country.popular_payment_methods.length > 0 && (
                            <div className="text-gray-600">
                              <span className="font-medium">Payment:</span> {country.popular_payment_methods.slice(0, 2).join(', ')}
                              {country.popular_payment_methods.length > 2 && ' ...'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {markets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No countries found</h3>
          <p className="text-gray-600">No countries match your current filters.</p>
        </div>
      )}
    </div>
  );
};