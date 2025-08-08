import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Scale, 
  AlertTriangle, 
  Package, 
  Calculator, 
  TrendingUp, 
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface WeightVarianceCalculatorProps {
  currentWeight: number;
  currentTotal: number;
  currency: string;
  onVarianceCalculated?: (worstCaseTotal: number) => void;
}

export const WeightVarianceCalculator: React.FC<WeightVarianceCalculatorProps> = ({
  currentWeight,
  currentTotal,
  currency,
  onVarianceCalculated
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVariance, setSelectedVariance] = useState(20); // Default 20% variance
  
  // Calculate potential weight increases and their cost impact
  const calculateVarianceImpact = useCallback((variancePercent: number) => {
    const newWeight = currentWeight * (1 + variancePercent / 100);
    const weightIncrease = newWeight - currentWeight;
    
    // Estimate additional cost based on weight increase
    // Rough calculation: $8-12 per kg additional weight for international shipping
    const costPerKgIncrease = 10; // USD per kg
    const additionalShippingCost = weightIncrease * costPerKgIncrease;
    
    // Additional customs duty (estimated 10-15% on additional value)
    const additionalCustoms = additionalShippingCost * 0.125; // 12.5% average
    
    const totalAdditionalCost = additionalShippingCost + additionalCustoms;
    const newTotal = currentTotal + totalAdditionalCost;
    
    return {
      newWeight: newWeight,
      weightIncrease: weightIncrease,
      additionalShippingCost: additionalShippingCost,
      additionalCustoms: additionalCustoms,
      totalAdditionalCost: totalAdditionalCost,
      newTotal: newTotal
    };
  }, [currentWeight, currentTotal]);

  const varianceOptions = [
    { percent: 10, label: 'Conservative', description: 'Minor packaging variations', color: 'green' },
    { percent: 15, label: 'Typical', description: 'Most common scenario', color: 'blue' },
    { percent: 20, label: 'Realistic', description: 'Safe estimate for planning', color: 'orange' },
    { percent: 30, label: 'Worst Case', description: 'Maximum protection', color: 'red' }
  ];

  const selectedImpact = calculateVarianceImpact(selectedVariance);

  // Notify parent component of worst-case scenario
  useEffect(() => {
    if (onVarianceCalculated) {
      const worstCase = calculateVarianceImpact(30);
      onVarianceCalculated(worstCase.newTotal);
    }
  }, [calculateVarianceImpact, onVarianceCalculated]);

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-50 text-green-700 border-green-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200', 
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      red: 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-orange-900">Weight Variance Calculator</CardTitle>
              <p className="text-sm text-orange-700 mt-1">
                Understand potential weight increases and costs
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-orange-700 hover:bg-orange-100"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Quick Summary - Always Visible */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-white/70 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Current Weight</div>
            <div className="font-semibold text-orange-900">{currentWeight.toFixed(2)} kg</div>
          </div>
          <div className="text-center p-3 bg-white/70 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Estimated Range</div>
            <div className="font-semibold text-orange-900">
              {currentWeight.toFixed(1)} - {(currentWeight * 1.2).toFixed(1)} kg
            </div>
          </div>
        </div>

        {/* Expandable Detailed Calculator */}
        {isExpanded && (
          <div className="space-y-6">
            <Separator className="bg-orange-200" />
            
            {/* Variance Options */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-orange-900">Select Weight Increase Scenario</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {varianceOptions.map((option) => (
                  <button
                    key={option.percent}
                    onClick={() => setSelectedVariance(option.percent)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedVariance === option.percent
                        ? `${getColorClasses(option.color)} border-current shadow-md`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{option.label}</span>
                      <Badge variant="secondary" className="text-xs">+{option.percent}%</Badge>
                    </div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculation Results */}
            <div className="bg-white/70 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-orange-900">
                  Impact of {selectedVariance}% Weight Increase
                </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">New Weight</div>
                  <div className="font-semibold text-orange-900">
                    {selectedImpact.newWeight.toFixed(2)} kg
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Weight Increase</div>
                  <div className="font-semibold text-red-600">
                    +{selectedImpact.weightIncrease.toFixed(2)} kg
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Additional Shipping</div>
                  <div className="font-semibold text-red-600">
                    +{formatCurrency(selectedImpact.additionalShippingCost, currency)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Additional Customs</div>
                  <div className="font-semibold text-red-600">
                    +{formatCurrency(selectedImpact.additionalCustoms, currency)}
                  </div>
                </div>
              </div>

              <Separator className="my-3 bg-orange-200" />
              
              <div className="flex items-center justify-between">
                <div className="text-gray-700">
                  <div className="text-sm">Total Additional Cost</div>
                  <div className="text-lg font-bold text-red-600">
                    +{formatCurrency(selectedImpact.totalAdditionalCost, currency)}
                  </div>
                </div>
                <div className="text-right text-gray-700">
                  <div className="text-sm">New Total</div>
                  <div className="text-lg font-bold text-orange-900">
                    {formatCurrency(selectedImpact.newTotal, currency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Why Weights Change */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-blue-900 mb-2">Why do weights often increase?</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Protective packaging:</strong> Extra bubble wrap, foam, or box padding</li>
                    <li>• <strong>Seller bundling:</strong> Unexpected accessories or documentation</li>
                    <li>• <strong>Measurement errors:</strong> Seller listings may underestimate weight</li>
                    <li>• <strong>Packaging materials:</strong> Boxes, tape, labels add 5-15% weight</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Protection Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-900">Weight Protection</span>
                  <Badge className="bg-green-100 text-green-800 text-xs">Available</Badge>
                </div>
                <p className="text-sm text-green-800 mb-2">
                  Cover weight increases up to 25% for just +$5
                </p>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  Add Protection
                </Button>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-900">Actual Weight</span>
                  <Badge className="bg-purple-100 text-purple-800 text-xs">Pay Later</Badge>
                </div>
                <p className="text-sm text-purple-800 mb-2">
                  Pay only the actual shipping cost once goods arrive
                </p>
                <Button size="sm" variant="outline" className="border-purple-300 text-purple-700">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA when collapsed */}
        {!isExpanded && (
          <div className="mt-4 pt-3 border-t border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <AlertTriangle className="w-4 h-4" />
                <span>Weights may increase by 10-30%</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="text-orange-700 hover:bg-orange-100"
              >
                Calculate Impact
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};