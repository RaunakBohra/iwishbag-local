import React from 'react';
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { QuoteStep } from "@/hooks/useQuoteSteps";
import { CheckCircle2, Circle } from "lucide-react";
import { Icon } from "@/components/ui/icon";

interface QuoteStepperProps {
  steps: QuoteStep[];
  className?: string;
}

const GREEN_STEPS = ["approved", "paid", "delivered"];

export const QuoteStepper = ({ steps, className }: QuoteStepperProps) => {
  return (
    <>
      <style>{`
        @keyframes ripple {
          0% { box-shadow: 0 0 0 0 var(--ripple-color, rgba(59,130,246,0.07)); }
          70% { box-shadow: 0 0 0 12px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        .ripple-animate { position: relative; }
        .ripple-animate::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 40px;
          height: 40px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: var(--ripple-color, rgba(59,130,246,0.07));
          z-index: 0;
          animation: ripple 2s infinite;
        }
      `}</style>
      <div className={cn("w-full flex justify-center py-4 sm:py-6", className)}>
        <div className="flex flex-wrap justify-center">
          {steps.map((step, index) => {
            const isCurrent = step.status === "current";
            const isCompleted = step.status === "completed";
            const isUpcoming = step.status === "upcoming";
            const isRejected = step.status === "error";
            const isRejectedStep = step.label === "Rejected" || step.id === "rejected" || isRejected;

            // Color logic
            let borderColor = "border-gray-300";
            let bgColor = "bg-gray-100";
            let textColor = "text-gray-400";
            let iconColor = "text-gray-400";
            let rippleColor = "rgba(34,255,94,0.25)"; // default green for current

            if (isCompleted) {
              borderColor = "border-[#00c9db]";
              bgColor = "bg-white";
              textColor = "text-[#00c9db]";
              iconColor = "text-[#00c9db]";
            }
            if (isCurrent) {
              borderColor = "border-green-500";
              bgColor = "bg-white";
              textColor = "text-green-600 font-bold";
              iconColor = "text-green-600";
              rippleColor = "rgba(34,255,94,0.25)";
            }
            if (isRejectedStep && (isCurrent || isCompleted)) {
              borderColor = "border-destructive";
              bgColor = "bg-white";
              textColor = "text-destructive font-bold";
              iconColor = "text-destructive";
              rippleColor = "rgba(239,68,68,0.18)";
            }

            return (
              <TooltipProvider key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1 sm:gap-2 relative px-4 sm:px-6">
                      <div className="relative">
                        {index > 0 && (
                          <div className="absolute -left-3 sm:-left-4 top-1/2 h-0.5 w-3 sm:w-4 -translate-y-1/2 bg-border" style={{background: 'linear-gradient(90deg, #e0f7fa 0%, #00c9db 100%)', opacity: 0.7}} />
                        )}
                        <div
                          className={cn(
                            "flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                            isCompleted && "border-[#00c9db] bg-white text-[#00c9db]",
                            isCurrent && "border-green-500 bg-white text-green-600 font-bold ripple-animate",
                            isUpcoming && "border-gray-300 bg-gray-100 text-gray-400",
                            isRejectedStep && (isCurrent || isCompleted) && "border-destructive text-destructive bg-white font-bold ripple-animate"
                          )}
                          style={isCurrent ? { '--ripple-color': rippleColor } : {}}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          ) : isRejectedStep ? (
                            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          ) : (
                            <Icon name={step.icon} className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <span
                          className={cn(
                            "text-xs sm:text-sm font-medium transition-all duration-200",
                            isCompleted && "text-[#00c9db]",
                            isCurrent && "text-green-600 font-bold",
                            isUpcoming && "text-gray-400",
                            isRejectedStep && (isCurrent || isCompleted) && "text-destructive font-bold"
                          )}
                        >
                          {isRejectedStep ? "Rejected" : step.label}
                        </span>
                        {step.date && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {new Date(step.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{step.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    </>
  );
}; 