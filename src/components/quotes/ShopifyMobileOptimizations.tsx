import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Shield, 
  CreditCard,
  MessageCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface MobileStickyBarProps {
  quote: any;
  onApprove: () => void;
  onRequestChanges: () => void;
  formatCurrency: (amount: number, currency: string) => string;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  quote,
  onApprove,
  onRequestChanges,
  formatCurrency
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50 md:hidden">
      <div className="space-y-3">
        {/* Price Summary */}
        <div className="text-center">
          <div className="text-2xl font-bold">
            {formatCurrency(quote.total_customer_currency || quote.total_usd, quote.customer_currency)}
          </div>
          {quote.customer_currency !== 'USD' && (
            <div className="text-sm text-muted-foreground">
              ≈ {formatCurrency(quote.total_usd, 'USD')}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            className="flex-1 h-12 text-base font-medium bg-black hover:bg-gray-800"
            onClick={onApprove}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Approve & Add to Cart
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRequestChanges}
            className="px-3"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>

        {/* Trust Signal */}
        <div className="text-center text-xs text-muted-foreground">
          🔒 Secure checkout • ⚡ Instant approval
        </div>
      </div>
    </div>
  );
};

interface MobileProductSummaryProps {
  items: any[];
  quote: any;
  formatCurrency: (amount: number, currency: string) => string;
}

export const MobileProductSummary: React.FC<MobileProductSummaryProps> = ({
  items,
  quote,
  formatCurrency
}) => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        {/* Hero Product */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {items[0]?.image_url ? (
              <img 
                src={items[0].image_url} 
                alt={items[0].name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg leading-tight mb-2">
              {items.length > 1 
                ? `${items[0]?.name} + ${items.length - 1} more`
                : items[0]?.name
              }
            </h2>
            <div className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''} • Express shipping
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            All verified
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
            <Truck className="w-3 h-3 mr-1" />
            12-15 days
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Insured
          </Badge>
        </div>

        {/* Delivery Estimate */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Truck className="w-4 h-4 mr-2" />
              <span>Delivery</span>
            </div>
            <span className="font-medium">
              {new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} - {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileBreakdownProps {
  quote: any;
  breakdown: any;
  expanded: boolean;
  onToggle: () => void;
  formatCurrency: (amount: number, currency: string) => string;
}

export const MobileBreakdown: React.FC<MobileBreakdownProps> = ({
  quote,
  breakdown,
  expanded,
  onToggle,
  formatCurrency
}) => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Total: {formatCurrency(quote.total_customer_currency || quote.total_usd, quote.customer_currency)}</h3>
          <Button variant="ghost" size="sm" onClick={onToggle} className="p-1 h-auto">
            {expanded ? (
              <>
                <span className="text-sm mr-1">Hide</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="text-sm mr-1">Show</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {quote.customer_currency !== 'USD' && (
          <div className="text-sm text-muted-foreground text-center mb-3">
            ≈ {formatCurrency(quote.total_usd, 'USD')}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Products</span>
              <span>{formatCurrency(breakdown.items_total || 0, quote.customer_currency)}</span>
            </div>
            
            {breakdown.item_discounts > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Bundle savings</span>
                <span>-{formatCurrency(breakdown.item_discounts, quote.customer_currency)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>Shipping & Insurance</span>
              <span>{formatCurrency((breakdown.shipping || 0) + (breakdown.insurance || 0), quote.customer_currency)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Duties & Taxes</span>
              <span>{formatCurrency((breakdown.customs || 0) + (breakdown.local_tax || 0), quote.customer_currency)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Service fees</span>
              <span>{formatCurrency((breakdown.handling_fee || 0) + (breakdown.domestic_delivery || 0), quote.customer_currency)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MobileTrustSignalsProps {}

export const MobileTrustSignals: React.FC<MobileTrustSignalsProps> = () => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Free packaging</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Insurance included</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <Truck className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Express shipping</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <Package className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-sm font-medium">SMS tracking</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileProgressProps {
  currentStep: number;
}

export const MobileProgress: React.FC<MobileProgressProps> = ({ currentStep }) => {
  const steps = ['Requested', 'Calculated', 'Approval', 'Cart', 'Checkout'];
  
  return (
    <div className="md:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                index + 1 <= currentStep 
                  ? 'bg-green-500 text-white' 
                  : index + 1 === currentStep + 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1 <= currentStep ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-xs mt-1 ${
              index + 1 <= currentStep ? 'text-green-600 font-medium' : 'text-gray-500'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div 
          className="bg-green-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
};