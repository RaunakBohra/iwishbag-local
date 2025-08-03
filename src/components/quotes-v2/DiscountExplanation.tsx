import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Shield,
  Calculator,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  DollarSign,
  Percent
} from 'lucide-react';
import { DiscountExplanation, DiscountTerms, DiscountExplanationService } from '@/services/DiscountExplanationService';

interface DiscountExplanationProps {
  discountData: {
    code?: string;
    name: string;
    type: 'percentage' | 'fixed_amount' | 'shipping' | 'free_shipping';
    value: number;
    appliesTo: string;
    minOrder?: number;
    maxDiscount?: number;
    usageLimit?: number;
    usagePerCustomer?: number;
    validFrom?: string;
    validUntil?: string;
    countries?: string[];
    conditions?: any;
  };
  className?: string;
  compact?: boolean;
}

export const DiscountExplanation: React.FC<DiscountExplanationProps> = ({
  discountData,
  className = '',
  compact = false
}) => {
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const explanation = DiscountExplanationService.generateDiscountExplanation(discountData);
  const standardTerms = DiscountExplanationService.generateStandardTerms();
  
  const getDiscountIcon = () => {
    switch (discountData.type) {
      case 'percentage':
        return <Percent className="w-5 h-5 text-blue-600" />;
      case 'fixed_amount':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'free_shipping':
      case 'shipping':
        return <MapPin className="w-5 h-5 text-purple-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-orange-600" />;
    }
  };
  
  const getDiscountBadge = () => {
    const badgeConfig = {
      percentage: { color: 'default', label: `${discountData.value}% Off` },
      fixed_amount: { color: 'secondary', label: `$${discountData.value} Off` },
      free_shipping: { color: 'outline', label: 'Free Shipping' },
      shipping: { color: 'outline', label: `${discountData.value}% Off Shipping` }
    };
    
    const config = badgeConfig[discountData.type as keyof typeof badgeConfig];
    return (
      <Badge variant={config.color as any} className="text-sm font-medium">
        {config.label}
      </Badge>
    );
  };
  
  if (compact) {
    return (
      <Card className={`border-blue-200 bg-blue-50/30 ${className}`}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getDiscountIcon()}
                <span className="font-medium text-blue-900">
                  {discountData.name}
                </span>
              </div>
              {getDiscountBadge()}
            </div>
            
            <p className="text-sm text-blue-800">
              {explanation.summary}
            </p>
            
            <div className="text-xs text-blue-700">
              <strong>How it works:</strong> {explanation.howItWorks}
            </div>
            
            {explanation.restrictions.length > 0 && (
              <Alert className="border-blue-200 bg-blue-100/50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  <strong>Key restrictions:</strong> {explanation.restrictions.slice(0, 2).join('; ')}
                  {explanation.restrictions.length > 2 && '...'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`border-blue-200 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {getDiscountIcon()}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span>{discountData.name}</span>
              {getDiscountBadge()}
            </div>
            {discountData.code && (
              <CardDescription className="mt-1">
                Code: <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{discountData.code}</code>
              </CardDescription>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="examples" className="text-xs">Examples</TabsTrigger>
            <TabsTrigger value="eligibility" className="text-xs">Eligibility</TabsTrigger>
            <TabsTrigger value="terms" className="text-xs">Terms</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  What You Get
                </h4>
                <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-md border border-green-200">
                  {explanation.summary}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  How It Works
                </h4>
                <p className="text-sm text-gray-700">
                  {explanation.howItWorks}
                </p>
              </div>
              
              {explanation.tips.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Pro Tips
                  </h4>
                  <ul className="space-y-1">
                    {explanation.tips.slice(0, 3).map((tip, index) => (
                      <li key={index} className="text-sm text-orange-800 bg-orange-50 p-2 rounded">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="examples" className="space-y-4">
            <div>
              <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Discount Examples
              </h4>
              <div className="space-y-3">
                {explanation.examples.map((example, index) => (
                  <div key={index} className="bg-purple-50 p-4 rounded-md border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-purple-900">{example.scenario}</span>
                      <Badge variant="outline" className="text-purple-700 border-purple-300">
                        ${example.discountAmount.toFixed(2)} saved
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                      <div>
                        <span className="text-gray-600">Order Value:</span>
                        <div className="font-medium">${example.orderValue.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Discount:</span>
                        <div className="font-medium text-green-600">-${example.discountAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Final Total:</span>
                        <div className="font-medium text-blue-600">${example.finalValue.toFixed(2)}</div>
                      </div>
                    </div>
                    <p className="text-xs text-purple-700">{example.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="eligibility" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Eligibility Requirements
                </h4>
                <ul className="space-y-2">
                  {explanation.eligibility.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Important Restrictions
                </h4>
                <ul className="space-y-2">
                  {explanation.restrictions.map((restriction, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{restriction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="terms" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Discount-Specific Terms
                </h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {explanation.terms.slice(0, 4).map((term, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFullTerms(!showFullTerms)}
                  className="w-full"
                >
                  {showFullTerms ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Hide Full Terms & Conditions
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      View Full Terms & Conditions
                    </>
                  )}
                </Button>
              </div>
              
              {showFullTerms && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-md border">
                  {Object.entries(standardTerms).map(([category, terms]) => (
                    <div key={category}>
                      <h5 className="font-medium text-gray-900 mb-2 capitalize">
                        {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h5>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {terms.map((term, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span>{term}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};