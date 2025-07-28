import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calculator,
  Package,
  Plane,
  Ship,
  Truck,
  Clock,
  DollarSign,
  Scale,
  Ruler,
  Info,
  Zap,
  Archive,
} from 'lucide-react';

interface ShippingOption {
  id: string;
  name: string;
  carrier: string;
  icon: React.ReactNode;
  estimatedDays: string;
  price: number;
  description: string;
  features: string[];
}

interface ShippingCalculatorProps {
  packages?: any[];
  onCalculate?: (result: any) => void;
}

export const ShippingCalculator: React.FC<ShippingCalculatorProps> = ({ 
  packages = [], 
  onCalculate 
}) => {
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState({
    length: '',
    width: '',
    height: '',
  });
  const [declaredValue, setDeclaredValue] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const countries = [
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  ];

  const calculateShipping = async () => {
    setIsCalculating(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const packageWeight = parseFloat(weight) || 1;
    const basePrice = packageWeight * 12; // $12 per kg base rate
    const valueMultiplier = parseFloat(declaredValue) > 500 ? 1.2 : 1.0;
    
    const options: ShippingOption[] = [
      {
        id: 'economy',
        name: 'Economy Shipping',
        carrier: 'DHL eCommerce',
        icon: <Ship className="h-4 w-4" />,
        estimatedDays: '15-25 days',
        price: Math.round(basePrice * 0.8 * valueMultiplier),
        description: 'Cost-effective shipping with tracking',
        features: ['Tracking included', 'Insurance up to $100', 'Delivery to door'],
      },
      {
        id: 'standard',
        name: 'Standard Shipping',
        carrier: 'FedEx International',
        icon: <Plane className="h-4 w-4" />,
        estimatedDays: '7-12 days',
        price: Math.round(basePrice * valueMultiplier),
        description: 'Reliable shipping with good tracking',
        features: ['Full tracking', 'Insurance up to $500', 'Signature required', 'Customs handling'],
      },
      {
        id: 'express',
        name: 'Express Shipping',
        carrier: 'FedEx Express',
        icon: <Zap className="h-4 w-4" />,
        estimatedDays: '3-5 days',
        price: Math.round(basePrice * 1.8 * valueMultiplier),
        description: 'Fast shipping with priority handling',
        features: ['Premium tracking', 'Insurance up to $1000', 'Priority customs', 'Guaranteed delivery'],
      },
    ];

    // Add consolidation option if multiple packages
    if (packages.length > 1) {
      const consolidationSavings = Math.round(basePrice * 0.3);
      options.unshift({
        id: 'consolidation',
        name: 'Consolidation + Standard',
        carrier: 'iwishBag Consolidation',
        icon: <Archive className="h-4 w-4" />,
        estimatedDays: '10-15 days',
        price: Math.round(basePrice * 0.7 * valueMultiplier),
        description: `Save $${consolidationSavings} by combining packages`,
        features: [`Save $${consolidationSavings}`, 'Repackaging included', 'Optimized weight', 'Single shipment'],
      });
    }
    
    setShippingOptions(options);
    setIsCalculating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Shipping Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Package Information */}
        <div className="space-y-4">
          <div>
            <Label>Destination Country</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Weight (kg)</Label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Declared Value (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="150"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Package Dimensions (cm)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Length"
                value={dimensions.length}
                onChange={(e) => setDimensions({ ...dimensions, length: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Width"
                value={dimensions.width}
                onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Height"
                value={dimensions.height}
                onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Calculate Button */}
        <Button 
          onClick={calculateShipping}
          disabled={!destination || !weight || isCalculating}
          className="w-full"
        >
          {isCalculating ? (
            <>
              <Calculator className="h-4 w-4 mr-2 animate-spin" />
              Calculating rates...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Shipping Rates
            </>
          )}
        </Button>

        {/* Shipping Options */}
        {shippingOptions.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h3 className="font-semibold">Available Shipping Options</h3>
            
            <div className="space-y-3">
              {shippingOptions.map((option) => (
                <Card 
                  key={option.id}
                  className={`cursor-pointer transition-all ${
                    selectedOption === option.id 
                      ? 'ring-2 ring-blue-500 border-blue-500' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedOption(option.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {option.icon}
                          <span className="font-semibold">{option.name}</span>
                          {option.id === 'consolidation' && (
                            <Badge className="bg-green-100 text-green-800">
                              Best Value
                            </Badge>
                          )}
                          {option.id === 'express' && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Fastest
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {option.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {option.estimatedDays}
                          </span>
                          <span className="text-muted-foreground">via {option.carrier}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {option.features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${option.price}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${(option.price / parseFloat(weight || '1')).toFixed(2)}/kg
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedOption && (
              <div className="pt-4">
                <Button className="w-full" onClick={() => onCalculate?.(selectedOption)}>
                  <Package className="h-4 w-4 mr-2" />
                  Create Shipping Quote
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Rates are estimates and may vary based on actual package dimensions, destination, and customs requirements. 
            Final rates will be provided during checkout.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ShippingCalculator;