import * as React from "react";
import { Check, Package, Rocket, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const timelineSteps = [
  { status: 'paid', label: 'Paid', icon: Check },
  { status: 'ordered', label: 'Processing', icon: Package },
  { status: 'shipped', label: 'Shipped', icon: Truck },
  { status: 'completed', label: 'Completed', icon: Rocket },
];

const statusOrder: Record<string, number> = {
  paid: 0,
  ordered: 1,
  shipped: 2,
  completed: 3,
  cancelled: -1,
};

interface OrderTimelineProps {
  currentStatus: string;
}

export const OrderTimeline = ({ currentStatus }: OrderTimelineProps) => {
  const currentStatusIndex = statusOrder[currentStatus] ?? -1;

  if (currentStatus === 'cancelled') {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-red-500 font-bold text-lg">Order Cancelled</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Timeline</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-4">
        <div className="flex items-start w-full min-w-max">
          {timelineSteps.map((step, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isLastStep = index === timelineSteps.length - 1;
            const Icon = step.icon;

            return (
              <div key={step.status} className="contents">
                <div className="flex flex-col items-center gap-2 w-24">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2',
                      isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <p
                    className={cn(
                      'text-xs sm:text-sm font-medium text-center',
                      isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                </div>
                {!isLastStep && (
                  <div className={cn(
                    "flex-1 h-0.5 mt-5",
                    isCompleted ? 'bg-primary' : 'bg-muted'
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
