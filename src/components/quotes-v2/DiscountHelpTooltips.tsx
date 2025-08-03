import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  HelpCircle, 
  Info, 
  Lightbulb, 
  Calculator,
  Percent,
  DollarSign,
  Truck,
  ShieldCheck,
  Gift,
  Clock,
  MapPin,
  Users,
  Star,
  Zap
} from 'lucide-react';

interface DiscountHelpTooltipsProps {
  context?: 'quote' | 'cart' | 'checkout' | 'admin';
  showAdvanced?: boolean;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string | React.ReactNode;
  examples?: string[];
  tips?: string[];
}

export const DiscountHelpTooltips: React.FC<DiscountHelpTooltipsProps> = ({
  context = 'quote',
  showAdvanced = false
}) => {
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const helpSections: HelpSection[] = [
    {
      id: 'discount-types',
      title: 'Discount Types',
      icon: <Percent className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Percent className="w-3 h-3 text-blue-600" />
              <span>Percentage Off</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-green-600" />
              <span>Fixed Amount</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-3 h-3 text-purple-600" />
              <span>Free Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-3 h-3 text-orange-600" />
              <span>Bundle Deals</span>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-gray-600">
            Each discount type has different rules and maximum savings limits.
          </p>
        </div>
      ),
      examples: [
        '10% off entire order',
        '$25 off orders over $100',
        'Free shipping to India',
        'Buy 2 get 15% off'
      ]
    },
    {
      id: 'volume-discounts',
      title: 'Volume Discounts',
      icon: <Calculator className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Tier 1</Badge>
                $100 - $499
              </span>
              <span className="text-green-600 font-medium">5% off shipping</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Tier 2</Badge>
                $500 - $999
              </span>
              <span className="text-green-600 font-medium">10% off shipping</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Tier 3</Badge>
                $1000+
              </span>
              <span className="text-green-600 font-medium">15% off shipping & customs</span>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-gray-600">
            Volume discounts apply automatically based on your order total.
          </p>
        </div>
      ),
      tips: [
        'Volume discounts stack with country-specific offers',
        'Higher tiers provide better savings on multiple components',
        'Add more items to reach the next discount tier'
      ]
    },
    {
      id: 'country-rules',
      title: 'Country-Specific Discounts',
      icon: <MapPin className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                🇮🇳 <span>India</span>
              </span>
              <span className="text-green-600">10% shipping discount</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                🇳🇵 <span>Nepal</span>
              </span>
              <span className="text-green-600">Free customs processing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                🇺🇸 <span>USA</span>
              </span>
              <span className="text-blue-600">Domestic delivery rates</span>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-gray-600">
            Country discounts are applied automatically based on your delivery address.
          </p>
        </div>
      ),
      examples: [
        'INDIASHIP10 - 10% off shipping to India',
        'NEPAL_FREE - Free customs processing',
        'USA_DOMESTIC - Domestic shipping rates'
      ]
    },
    {
      id: 'code-validation',
      title: 'Discount Code Rules',
      icon: <ShieldCheck className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Clock className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Codes have expiration dates and usage limits</span>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>Some codes are limited to first-time customers</span>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Minimum order requirements may apply</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
              <span>Geographic restrictions by country/region</span>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-gray-600">
            All conditions must be met for a discount code to be valid.
          </p>
        </div>
      ),
      tips: [
        'Codes are case-sensitive - enter exactly as shown',
        'Check expiration dates before applying codes',
        'Only one promotional code can be used per order'
      ]
    },
    {
      id: 'stacking-rules',
      title: 'How Discounts Combine',
      icon: <Zap className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-3 h-3 text-green-600" />
                <span className="font-medium text-green-800">Automatic Discounts</span>
              </div>
              <p className="text-xs text-green-700">Volume + Country discounts stack automatically</p>
            </div>
            
            <div className="p-2 bg-orange-50 border border-orange-200 rounded">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-3 h-3 text-orange-600" />
                <span className="font-medium text-orange-800">Coupon Codes</span>
              </div>
              <p className="text-xs text-orange-700">Override automatic discounts when better</p>
            </div>
          </div>
          <Separator />
          <p className="text-xs text-gray-600">
            The system automatically applies the best available discount combination.
          </p>
        </div>
      ),
      examples: [
        'Volume discount (15%) + Country discount (10%) = Both apply',
        'Coupon code (20%) overrides automatic discount (15%)',
        'Multiple coupon codes cannot be combined'
      ]
    }
  ];

  const QuickTip = ({ text, icon }: { text: string; icon?: React.ReactNode }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {icon || <HelpCircle className="w-3 h-3 text-gray-400" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const DetailedHelp = ({ section }: { section: HelpSection }) => (
    <Popover 
      open={activePopover === section.id} 
      onOpenChange={(open) => setActivePopover(open ? section.id : null)}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
          {section.icon}
          <span className="ml-1">{section.title}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>{section.content}</div>
            
            {section.examples && (
              <div>
                <h5 className="text-xs font-medium text-gray-900 mb-2">Examples:</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  {section.examples.map((example, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {section.tips && (
              <div>
                <h5 className="text-xs font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Pro Tips:
                </h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  {section.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-500">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );

  // Context-specific help sections
  const getContextualSections = () => {
    switch (context) {
      case 'admin':
        return helpSections;
      case 'checkout':
        return helpSections.filter(s => ['discount-types', 'code-validation'].includes(s.id));
      case 'cart':
        return helpSections.filter(s => ['volume-discounts', 'stacking-rules'].includes(s.id));
      default:
        return helpSections.filter(s => !['stacking-rules'].includes(s.id));
    }
  };

  const contextualSections = getContextualSections();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick tooltips for common questions */}
      <QuickTip 
        text="Discount codes are case-sensitive and have expiration dates. Check the spelling and validity period."
        icon={<Info className="w-3 h-3 text-blue-500" />}
      />
      
      {context !== 'admin' && (
        <QuickTip 
          text="Volume discounts apply automatically at $100, $500, and $1000+ order values."
          icon={<Calculator className="w-3 h-3 text-green-500" />}
        />
      )}
      
      <QuickTip 
        text="Country-specific discounts are applied automatically based on your delivery address."
        icon={<MapPin className="w-3 h-3 text-purple-500" />}
      />

      {/* Detailed help sections */}
      {showAdvanced && (
        <>
          <span className="text-xs text-gray-400 mx-2">|</span>
          {contextualSections.map((section) => (
            <DetailedHelp key={section.id} section={section} />
          ))}
        </>
      )}
      
      {/* Toggle for advanced help */}
      {!showAdvanced && contextualSections.length > 0 && (
        <Button variant="link" size="sm" className="text-xs text-gray-500 p-0 h-auto">
          More help topics →
        </Button>
      )}
    </div>
  );
};