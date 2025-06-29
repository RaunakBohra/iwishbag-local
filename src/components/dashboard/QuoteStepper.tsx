import React from 'react';
import { cn } from '@/lib/utils';
import { Check, FileText, ShoppingCart, CreditCard, ArrowRight, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export type QuoteStep = 'review' | 'approve' | 'cart' | 'checkout' | 'rejected';

interface QuoteStepperProps {
  currentStep: QuoteStep;
  onStepClick?: (step: QuoteStep) => void;
  className?: string;
  rejected?: boolean;
}

const steps: { id: QuoteStep; label: string; icon: React.ReactNode }[] = [
  {
    id: 'review',
    label: 'Review Quote',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'approve',
    label: 'Approve',
    icon: <Check className="w-5 h-5" />
  },
  {
    id: 'cart',
    label: 'Add to Cart',
    icon: <ShoppingCart className="w-5 h-5" />
  },
  {
    id: 'checkout',
    label: 'Checkout',
    icon: <CreditCard className="w-5 h-5" />
  }
];

export function QuoteStepper({ currentStep, onStepClick, className, rejected }: QuoteStepperProps) {
  let displaySteps = [...steps];
  let currentIndex = displaySteps.findIndex(step => step.id === currentStep);

  // If rejected, replace 'approve' step with 'rejected'
  if (rejected) {
    displaySteps = displaySteps.map((step) =>
      step.id === 'approve'
        ? {
            id: 'rejected',
            label: 'Rejected',
            icon: <XCircle className="w-5 h-5 text-destructive" />
          }
        : step
    );
    currentIndex = displaySteps.findIndex(step => step.id === 'rejected');
  }

  return (
    <div className={cn("w-full bg-card border border-border rounded-lg p-6", className)}>
      <div className="relative flex items-center justify-between px-4 md:px-0">
        {/* Progress bar */}
        <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 h-full bg-foreground rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(currentIndex / (displaySteps.length - 1)) * 100}%`,
              transition: { duration: 0.5, ease: "easeInOut" }
            }}
          />
        </div>

        {/* Steps */}
        {displaySteps.map((step, index) => {
          const isActive = step.id === currentStep || (rejected && step.id === 'rejected' && currentStep === 'rejected');
          const isCompleted = index < currentIndex;
          const isClickable = isCompleted || isActive;
          const isRejectedStep = step.id === 'rejected';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex flex-col items-center flex-1"
            >
              {/* Step circle */}
              <motion.button
                onClick={() => isClickable && onStepClick?.(step.id)}
                className={cn(
                  "relative z-10 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isRejectedStep && "border-destructive bg-destructive text-background scale-110",
                  isActive && !isRejectedStep && "border-foreground bg-foreground text-background scale-110",
                  isCompleted && !isRejectedStep && "border-foreground bg-foreground text-background",
                  !isActive && !isCompleted && !isRejectedStep && "border-border bg-muted text-muted-foreground hover:border-foreground/50 hover:bg-muted/80",
                  isClickable && "cursor-pointer hover:scale-105",
                  !isClickable && "cursor-not-allowed"
                )}
                whileHover={isClickable ? { scale: 1.05 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {isRejectedStep ? (
                  <XCircle className="w-5 h-5 md:w-6 md:h-6" />
                ) : isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-background" />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    {React.cloneElement(step.icon as React.ReactElement, {
                      className: cn(
                        "w-5 h-5 md:w-6 md:h-6",
                        (isActive || isCompleted) && !isRejectedStep ? "text-background" : "text-muted-foreground"
                      )
                    })}
                  </motion.div>
                )}
              </motion.button>

              {/* Step label */}
              <motion.span
                className={cn(
                  "mt-2 md:mt-3 text-xs md:text-sm font-medium transition-colors duration-300 text-center",
                  isRejectedStep && "text-destructive",
                  isActive && !isRejectedStep && "text-foreground font-semibold",
                  isCompleted && !isRejectedStep && "text-foreground",
                  !isActive && !isCompleted && !isRejectedStep && "text-muted-foreground"
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {step.label}
              </motion.span>

              {/* Connecting arrow */}
              {index < displaySteps.length - 1 && (
                <motion.div
                  className="absolute right-0 top-5 md:top-6 -mr-2 md:-mr-4 text-muted-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
} 