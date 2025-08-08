/**
 * LocalCurrencyPricingModal - Enhanced Currency Pricing Input
 * 
 * Features:
 * - Set prices in local currencies (NPR 100, INR 75, EUR 15, etc.)
 * - Real-time USD conversion preview
 * - Smart currency detection per country
 * - Currency selector with popular currencies
 * - Professional pricing input experience
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  Calculator, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

import { currencyService } from '@/services/CurrencyService';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface Country {
  code: string;
  name: string;
  continent: string | null;
  currency: string | null;
}

interface LocalCurrencyPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rate: number, currency: string, localAmount: number) => Promise<void>;
  country: Country | null;
  currentRate?: number;
  currentCurrency?: string;
  pricingType: 'percentage' | 'fixed';
}

// Popular currencies with their symbols and names
const POPULAR_CURRENCIES = [
  { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee', countries: ['NP'] },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', countries: ['IN'] },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', countries: ['PK'] },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', countries: ['BD'] },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', countries: ['LK'] },
  { code: 'EUR', symbol: '€', name: 'Euro', countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'BE'] },
  { code: 'GBP', symbol: '£', name: 'British Pound', countries: ['GB'] },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', countries: ['JP'] },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', countries: ['KR'] },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', countries: ['CN'] },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', countries: ['SG'] },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', countries: ['MY'] },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', countries: ['TH'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', countries: ['PH'] },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', countries: ['ID'] },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', countries: ['VN'] },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', countries: ['AE'] },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', countries: ['SA'] },
  { code: 'USD', symbol: '$', name: 'US Dollar', countries: ['US'] },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LocalCurrencyPricingModal: React.FC<LocalCurrencyPricingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  country,
  currentRate = 0,
  currentCurrency = 'USD',
  pricingType
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [localAmount, setLocalAmount] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [usdEquivalent, setUsdEquivalent] = useState<number>(0);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionRate, setConversionRate] = useState<number>(1);
  const [isValidInput, setIsValidInput] = useState<boolean>(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Auto-detect currency based on country
  useEffect(() => {
    if (country && isOpen) {
      // Find currency for this country
      const countryCurrency = POPULAR_CURRENCIES.find(curr => 
        curr.countries.includes(country.code)
      );
      
      if (countryCurrency) {
        setSelectedCurrency(countryCurrency.code);
      } else if (country.currency) {
        setSelectedCurrency(country.currency);
      }

      // Set current amount if editing
      if (currentRate > 0) {
        setLocalAmount(currentRate.toString());
      }
    }
  }, [country, isOpen, currentRate]);

  // ============================================================================
  // CURRENCY CONVERSION
  // ============================================================================

  const { data: exchangeRate, isLoading: rateLoading } = useQuery({
    queryKey: ['exchange-rate', selectedCurrency],
    queryFn: async () => {
      if (selectedCurrency === 'USD') return 1;
      try {
        return await currencyService.getExchangeRateByCurrency(selectedCurrency, 'USD');
      } catch (error) {
        console.warn('Failed to get exchange rate:', error);
        return 1;
      }
    },
    enabled: selectedCurrency !== 'USD' && isOpen,
    refetchOnWindowFocus: false,
  });

  // Update conversion when amount or rate changes
  useEffect(() => {
    const amount = parseFloat(localAmount);
    const rate = exchangeRate || 1;
    
    if (!isNaN(amount) && amount > 0) {
      const usdAmount = amount * rate;
      setUsdEquivalent(usdAmount);
      setConversionRate(rate);
      setIsValidInput(true);
    } else {
      setUsdEquivalent(0);
      setIsValidInput(false);
    }
  }, [localAmount, exchangeRate]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSave = async () => {
    if (!isValidInput || !country) return;

    try {
      setIsConverting(true);
      
      // Save the USD equivalent rate to database
      await onSave(usdEquivalent, selectedCurrency, parseFloat(localAmount));
      
      toast({
        title: 'Pricing Updated',
        description: `Set ${getCurrencySymbol(selectedCurrency)}${localAmount} for ${country.name}`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update pricing. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleClose = () => {
    setLocalAmount('');
    setUsdEquivalent(0);
    setIsValidInput(false);
    onClose();
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getCurrencySymbol = (currencyCode: string): string => {
    const currency = POPULAR_CURRENCIES.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const getCurrencyName = (currencyCode: string): string => {
    const currency = POPULAR_CURRENCIES.find(c => c.code === currencyCode);
    return currency?.name || currencyCode;
  };

  const getExampleAmounts = (currencyCode: string): string[] => {
    const examples: Record<string, string[]> = {
      'NPR': ['100', '150', '200', '500'],
      'INR': ['50', '75', '100', '200'],
      'PKR': ['200', '300', '500', '1000'],
      'BDT': ['100', '150', '200', '400'],
      'EUR': ['10', '15', '20', '50'],
      'GBP': ['8', '12', '15', '30'],
      'JPY': ['1000', '1500', '2000', '5000'],
      'SGD': ['15', '20', '30', '50'],
      'USD': ['5', '10', '15', '25']
    };
    return examples[currencyCode] || ['10', '20', '50', '100'];
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!country) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Set Local Currency Price
          </DialogTitle>
          <DialogDescription>
            Set pricing for <strong>{country.name}</strong> in their local currency
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Currency Selector */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_CURRENCIES.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm w-8">{currency.symbol}</span>
                      <span>{currency.code}</span>
                      <span className="text-gray-500">- {currency.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>
              Amount ({getCurrencySymbol(selectedCurrency)} {getCurrencyName(selectedCurrency)})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-mono">
                {getCurrencySymbol(selectedCurrency)}
              </span>
              <Input
                value={localAmount}
                onChange={(e) => setLocalAmount(e.target.value)}
                placeholder="0.00"
                className="pl-8"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {getExampleAmounts(selectedCurrency).map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalAmount(amount)}
                  className="h-7 px-3 text-xs"
                >
                  {getCurrencySymbol(selectedCurrency)}{amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Conversion Preview */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">USD Equivalent</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold">
                      ${usdEquivalent.toFixed(4)}
                    </span>
                    {rateLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Exchange Rate</p>
                  <p className="text-sm font-mono">
                    1 {selectedCurrency} = ${(exchangeRate || 1).toFixed(4)} USD
                  </p>
                </div>
              </div>
              
              {pricingType === 'percentage' && (
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <TrendingUp className="w-4 h-4" />
                    <span>
                      This will be applied as {usdEquivalent.toFixed(2)}% on order values
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Status */}
          <div className="flex items-center gap-2">
            {isValidInput ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Ready to save</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Enter a valid amount</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isValidInput || isConverting}
            className="min-w-24"
          >
            {isConverting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'Save Price'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};