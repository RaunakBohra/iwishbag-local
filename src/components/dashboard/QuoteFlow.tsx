import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ShoppingCart, CreditCard, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuoteFlowProps {
  currentStep: 'review' | 'approve' | 'cart' | 'checkout' | 'complete';
  onStepClick?: (step: string) => void;
}

export const QuoteFlow: React.FC<QuoteFlowProps> = ({ currentStep, onStepClick }) => {
  const steps = [
    {
      id: 'review',
      label: 'Review Quote',
      icon: Package,
      description: 'Review quote details and pricing'
    },
    {
      id: 'approve',
      label: 'Approve/Reject',
      icon: Check,
      description: 'Approve or reject the quote'
    },
    {
      id: 'cart',
      label: 'Add to Cart',
      icon: ShoppingCart,
      description: 'Add approved quote to cart'
    },
    {
      id: 'checkout',
      label: 'Checkout',
      icon: CreditCard,
      description: 'Complete payment'
    }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isPast = steps.findIndex(s => s.id === currentStep) > index;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center text-center relative flex-1",
                  isActive ? "text-primary" : isPast ? "text-muted-foreground" : "text-muted-foreground/50"
                )}
                onClick={() => onStepClick?.(step.id)}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                  isActive ? "bg-primary text-primary-foreground" : 
                  isPast ? "bg-primary/20 text-primary" : "bg-muted"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-medium mb-1">{step.label}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {index < steps.length - 1 && (
                  <div className={cn(
                    "absolute top-6 left-[60%] w-[80%] h-0.5",
                    isPast ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}; 