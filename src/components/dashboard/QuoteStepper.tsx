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
    <div className={cn("w-full", className)}>
      <div className="relative flex items-center justify-between">
        {/* Progress bar */}
        <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-gray-200">
          <motion.div
            className="absolute left-0 top-0 h-full bg-primary"
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
              className="relative flex flex-col items-center"
            >
              {/* Step circle */}
              <motion.button
                onClick={() => isClickable && onStepClick?.(step.id)}
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isRejectedStep && "border-destructive bg-destructive/10 text-destructive scale-110",
                  isActive && !isRejectedStep && "border-primary bg-primary text-white scale-110",
                  isCompleted && !isRejectedStep && "border-primary bg-primary text-white",
                  !isActive && !isCompleted && !isRejectedStep && "border-gray-300 bg-white text-gray-400",
                  isClickable && "cursor-pointer hover:scale-105",
                  !isClickable && "cursor-not-allowed"
                )}
                whileHover={isClickable ? { scale: 1.05 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {isRejectedStep ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    {step.icon}
                  </motion.div>
                )}
              </motion.button>

              {/* Step label */}
              <motion.span
                className={cn(
                  "mt-2 text-sm font-medium transition-colors duration-300",
                  isRejectedStep && "text-destructive",
                  isActive && !isRejectedStep && "text-primary",
                  isCompleted && !isRejectedStep && "text-primary",
                  !isActive && !isCompleted && !isRejectedStep && "text-gray-500"
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
                  className="absolute right-0 top-5 -mr-4 text-gray-300"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
} 