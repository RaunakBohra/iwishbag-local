import React, { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Truck, Clock, DollarSign } from 'lucide-react';
import { useDeliveryIntegration } from '@/hooks/useDeliveryIntegration';
import { formatCurrency } from '@/utils/format';
import { currencyService } from '@/services/CurrencyService';

interface DeliveryProviderSelectorProps {
  quote: any;
  onProviderSelect: (provider: string, rate: any) => void;
  selectedProvider?: string;
}

export const DeliveryProviderSelector: React.FC<DeliveryProviderSelectorProps> = ({
  quote,
  onProviderSelect,
  selectedProvider
}) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getDeliveryOptions } = useDeliveryIntegration();

  useEffect(() => {
    loadDeliveryOptions();
  }, [quote.destination_country, quote.items]);

  const loadDeliveryOptions = async () => {
    setLoading(true);
    try {
      const deliveryOptions = await getDeliveryOptions(quote);
      setOptions(deliveryOptions);
      
      // Auto-select first option if none selected
      if (deliveryOptions.length > 0 && !selectedProvider) {
        const firstOption = deliveryOptions[0];
        const firstRate = firstOption.rates[0];
        onProviderSelect(firstOption.provider, firstRate);
      }
    } catch (error) {
      console.error('Error loading delivery options:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderLogo = (provider: string) => {
    const logos: Record<string, string> = {
      NCM: '/logos/ncm.png',
      DELHIVERY: '/logos/delhivery.png',
      FEDEX: '/logos/fedex.png',
      DHL: '/logos/dhl.png'
    };
    return logos[provider] || null;
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      NCM: 'Nepal Can Move',
      DELHIVERY: 'Delhivery',
      FEDEX: 'FedEx',
      DHL: 'DHL Express'
    };
    return names[provider] || provider;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading delivery options...</span>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No delivery options available for this destination.</p>
      </div>
    );
  }

  const currency = currencyService.getCurrency(quote.destination_country);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Delivery Provider</h3>
      
      <RadioGroup
        value={selectedProvider}
        onValueChange={(value) => {
          const option = options.find(o => o.provider === value);
          if (option) {
            onProviderSelect(value, option.rates[0]);
          }
        }}
      >
        {options.map((option) => {
          const rate = option.rates[0]; // Use first/cheapest rate
          const logo = getProviderLogo(option.provider);
          
          return (
            <div
              key={option.provider}
              className="relative flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <RadioGroupItem
                value={option.provider}
                id={option.provider}
                className="mt-1"
              />
              <Label
                htmlFor={option.provider}
                className="flex-1 cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {logo && (
                      <img
                        src={logo}
                        alt={getProviderName(option.provider)}
                        className="h-8 w-auto"
                      />
                    )}
                    <div>
                      <p className="font-medium">{getProviderName(option.provider)}</p>
                      <p className="text-sm text-muted-foreground">{rate.service}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(rate.amount, currency.code)}
                    </p>
                    {rate.currency !== currency.code && (
                      <p className="text-xs text-muted-foreground">
                        {rate.currency} {rate.amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{rate.estimatedDays} days</span>
                  </div>
                  {rate.cutoffTime && (
                    <div className="flex items-center space-x-1">
                      <span>Order before {rate.cutoffTime}</span>
                    </div>
                  )}
                </div>
                
                {option.provider === 'NCM' && quote.destination_country === 'NP' && (
                  <div className="text-xs text-blue-600">
                    ✓ Cash on Delivery available
                  </div>
                )}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};