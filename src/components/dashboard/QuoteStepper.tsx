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
    <div className={cn("w-full overflow-x-auto pb-4 flex justify-center", className)}>
      <div className="flex min-w-max gap-4">
        {steps.map((step, index) => {
          const isGreen = GREEN_STEPS.includes(step.id) && (step.status === "completed" || step.status === "current");
          return (
            <TooltipProvider key={step.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      {index > 0 && (
                        <div className="absolute -left-8 top-1/2 h-0.5 w-8 -translate-y-1/2 bg-border" />
                      )}
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2",
                          isGreen && "border-green-500 bg-green-100 text-green-700",
                          !isGreen && step.status === "completed" && "border-primary bg-primary text-primary-foreground",
                          !isGreen && step.status === "current" && "border-primary text-primary",
                          !isGreen && step.status === "upcoming" && "border-muted-foreground/25 text-muted-foreground/25",
                          !isGreen && step.status === "error" && "border-destructive text-destructive"
                        )}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : step.status === "error" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Icon name={step.icon} className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isGreen && "text-green-700",
                          !isGreen && step.status === "completed" && "text-primary",
                          !isGreen && step.status === "current" && "text-primary",
                          !isGreen && step.status === "upcoming" && "text-muted-foreground/50",
                          !isGreen && step.status === "error" && "text-destructive"
                        )}
                      >
                        {step.label}
                      </span>
                      {step.date && (
                        <span className="text-xs text-muted-foreground">
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
  );
}; 