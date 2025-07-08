import React, { useState } from 'react';
import { Price, DualPrice, AdminPrice, QuotePrice, CartItemPrice, OrderPrice } from '@/components/ui/Price';
import { usePrice, useSimplePrice, useAdminPrice } from '@/hooks/usePrice';
import { usePriceWithCache } from '@/hooks/usePriceWithCache';
import { usePrefetchExchangeRates } from '@/hooks/useExchangeRates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const countries = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'NP', name: 'Nepal', currency: 'NPR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CN', name: 'China', currency: 'CNY' }
];

export const PriceSystemDemo: React.FC = () => {
  const [amount, setAmount] = useState<number>(1000);
  const [originCountry, setOriginCountry] = useState<string>('US');
  const [destinationCountry, setDestinationCountry] = useState<string>('IN');
  const [userPreferredCurrency, setUserPreferredCurrency] = useState<string>('');
  const [customExchangeRate, setCustomExchangeRate] = useState<number | undefined>();

  // Prefetch common exchange rates
  usePrefetchExchangeRates();

  // Test different hooks
  const priceHook = usePrice({
    originCountry,
    destinationCountry,
    userPreferredCurrency: userPreferredCurrency || undefined,
    exchangeRate: customExchangeRate,
    showWarnings: true
  });

  const simplePriceHook = useSimplePrice({
    originCountry,
    destinationCountry
  });

  const adminPriceHook = useAdminPrice({
    originCountry,
    destinationCountry
  });

  const priceWithCacheHook = usePriceWithCache({
    originCountry,
    destinationCountry,
    userPreferredCurrency: userPreferredCurrency || undefined,
    exchangeRate: customExchangeRate,
    showWarnings: true
  });

  // Mock data for testing utility components
  const mockQuote = {
    id: 1,
    final_total: amount,
    country_code: originCountry,
    destination_country: destinationCountry,
    exchange_rate: customExchangeRate,
    shipping_address: {
      country_code: destinationCountry
    }
  };

  const mockCartItem = {
    finalTotal: amount,
    purchaseCountryCode: originCountry,
    destinationCountryCode: destinationCountry,
    countryCode: originCountry
  };

  const mockOrder = {
    final_total: amount,
    country_code: originCountry,
    destination_country: destinationCountry,
    exchange_rate: customExchangeRate
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Price System Demo</h1>
        <p className="text-gray-600">Testing the new centralized pricing system</p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="origin">Origin Country</Label>
              <Select value={originCountry} onValueChange={setOriginCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select origin country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="destination">Destination Country</Label>
              <Select value={destinationCountry} onValueChange={setDestinationCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userCurrency">User Preferred Currency (Optional)</Label>
              <Select value={userPreferredCurrency} onValueChange={setUserPreferredCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preferred currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Use default priority)</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.currency} value={country.currency}>
                      {country.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exchangeRate">Custom Exchange Rate (Optional)</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.0001"
                value={customExchangeRate || ''}
                onChange={(e) => setCustomExchangeRate(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Leave empty for auto-fetch"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Components Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Price Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Single Price</h3>
              <Price
                amount={amount}
                originCountry={originCountry}
                destinationCountry={destinationCountry}
                userPreferredCurrency={userPreferredCurrency || undefined}
                exchangeRate={customExchangeRate}
                showWarnings={true}
                className="text-lg font-bold text-green-600"
              />
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Dual Price</h3>
              <DualPrice
                amount={amount}
                originCountry={originCountry}
                destinationCountry={destinationCountry}
                exchangeRate={customExchangeRate}
                showWarnings={true}
                className="text-lg font-bold text-blue-600"
              />
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Admin Price</h3>
              <AdminPrice
                amount={amount}
                originCountry={originCountry}
                destinationCountry={destinationCountry}
                exchangeRate={customExchangeRate}
                showExchangeRate={true}
                className="text-lg font-bold text-purple-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Utility Components Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Utility Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Quote Price</h3>
              <QuotePrice quote={mockQuote} className="text-lg font-bold text-green-600" />
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Cart Item Price</h3>
              <CartItemPrice 
                item={mockCartItem} 
                quantity={2} 
                className="text-lg font-bold text-blue-600" 
              />
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Order Price</h3>
              <OrderPrice order={mockOrder} className="text-lg font-bold text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hook Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Hook Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price Hook with Cache */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">usePriceWithCache Hook</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Single Price:</Badge>
                <span className="font-mono">{priceWithCacheHook.formatPrice(amount).formatted}</span>
              </div>
              {priceWithCacheHook.formatDualPrice(amount) && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Dual Price:</Badge>
                  <span className="font-mono">{priceWithCacheHook.formatDualPrice(amount)?.display}</span>
                </div>
              )}
              {priceWithCacheHook.exchangeRateInfo && (
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Exchange Rate: {priceWithCacheHook.exchangeRateInfo.rate.toFixed(4)}</div>
                  <div>Source: {priceWithCacheHook.exchangeRateInfo.source}</div>
                  <div>Confidence: {priceWithCacheHook.exchangeRateInfo.confidence}</div>
                  {priceWithCacheHook.exchangeRateInfo.warning && (
                    <div className="text-orange-600">Warning: {priceWithCacheHook.exchangeRateInfo.warning}</div>
                  )}
                </div>
              )}
              {priceWithCacheHook.isLoading && <div className="text-blue-600">Loading...</div>}
              {priceWithCacheHook.error && <div className="text-red-600">Error: {priceWithCacheHook.error}</div>}
            </div>
          </div>

          {/* Simple Price Hook */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">useSimplePrice Hook</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Formatted Amount:</Badge>
                <span className="font-mono">{simplePriceHook.formattedAmount || 'Not formatted yet'}</span>
              </div>
              <Button 
                onClick={() => simplePriceHook.formatAmount(amount)}
                disabled={simplePriceHook.isLoading}
              >
                {simplePriceHook.isLoading ? 'Formatting...' : 'Format Amount'}
              </Button>
            </div>
          </div>

          {/* Admin Price Hook */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">useAdminPrice Hook</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Admin Price:</Badge>
                <span className="font-mono">{adminPriceHook.dualPrice?.display || 'Not formatted yet'}</span>
              </div>
              <Button 
                onClick={() => adminPriceHook.formatAdminPrice(amount)}
                disabled={adminPriceHook.isLoading}
              >
                {adminPriceHook.isLoading ? 'Formatting...' : 'Format Admin Price'}
              </Button>
              {adminPriceHook.error && <div className="text-red-600">Error: {adminPriceHook.error}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Info */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-2">
            <div>• Exchange rates are cached for 15 minutes using React Query</div>
            <div>• Common exchange rate pairs are prefetched on app start</div>
            <div>• Price formatting uses memoized functions to prevent unnecessary re-renders</div>
            <div>• Singleton PriceFormatter instance ensures consistent behavior</div>
            <div>• Admin warnings are shown only when showWarnings=true</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};