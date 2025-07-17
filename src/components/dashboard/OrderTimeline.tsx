import * as React from 'react';
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
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="backdrop-blur-xl bg-red-50/50 border border-red-200/50 rounded-lg p-4">
            <p className="text-red-600 font-bold text-lg">Order Cancelled</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-4">
        <div className="flex items-start w-full min-w-max">
          {timelineSteps.map((step, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isLastStep = index === timelineSteps.length - 1;
            const Icon = step.icon;

            return (
              <div key={step.status} className="contents">
                <div className="flex flex-col items-center gap-3 w-24">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center border-2 backdrop-blur-xl transition-all duration-300',
                      isCompleted
                        ? 'bg-gradient-to-r from-primary to-primary/80 border-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-white/20 border-white/30 text-gray-400',
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <p
                    className={cn(
                      'text-xs sm:text-sm font-medium text-center transition-colors duration-300',
                      isCompleted ? 'text-primary font-semibold' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </p>
                </div>
                {!isLastStep && (
                  <div
                    className={cn(
                      'flex-1 h-1 mt-6 rounded-full transition-all duration-300',
                      isCompleted ? 'bg-gradient-to-r from-primary to-primary/80' : 'bg-white/30',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
