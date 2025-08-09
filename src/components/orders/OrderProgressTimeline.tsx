import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  icon: React.ElementType;
  timestamp?: string;
  description?: string;
}

interface OrderProgressTimelineProps {
  currentStatus: string;
  overallStatus?: string;
  paymentMethod?: string;
  steps?: TimelineStep[];
  compact?: boolean;
}

export const OrderProgressTimeline: React.FC<OrderProgressTimelineProps> = ({
  currentStatus,
  overallStatus,
  paymentMethod = 'stripe',
  steps,
  compact = false
}) => {
  const getDefaultSteps = (): TimelineStep[] => {
    const baseSteps: TimelineStep[] = [
      {
        id: 'payment',
        label: paymentMethod === 'cod' ? 'Order Placed' : 'Payment Received',
        status: 'pending',
        icon: DollarSign,
        description: paymentMethod === 'cod' ? 'Order confirmed, payment on delivery' : 'Payment processed successfully'
      },
      {
        id: 'processing',
        label: 'Order Processing',
        status: 'pending',
        icon: Clock,
        description: 'Placing orders with sellers and processing items'
      },
      {
        id: 'seller_ordered',
        label: 'Seller Orders Placed',
        status: 'pending',
        icon: Package,
        description: 'Items ordered from various sellers and platforms'
      },
      {
        id: 'shipped',
        label: 'Shipped',
        status: 'pending',
        icon: Truck,
        description: 'Items consolidated and shipped to destination'
      },
      {
        id: 'delivered',
        label: 'Delivered',
        status: 'pending',
        icon: CheckCircle,
        description: 'Order delivered successfully'
      }
    ];

    // Update status based on current order status
    const statusOrder = ['pending_payment', 'paid', 'processing', 'seller_ordered', 'shipped', 'delivered', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);

    baseSteps.forEach((step, index) => {
      if (currentStatus === 'cancelled') {
        step.status = index === 0 ? 'completed' : 'skipped';
      } else if (paymentMethod === 'cod' && step.id === 'payment') {
        step.status = 'completed'; // COD orders start as "placed"
      } else {
        const stepIndex = statusOrder.indexOf(step.id === 'payment' ? 'paid' : step.id);
        if (stepIndex <= currentIndex) {
          step.status = 'completed';
        } else if (stepIndex === currentIndex + 1) {
          step.status = 'current';
        } else {
          step.status = 'pending';
        }
      }
    });

    return baseSteps;
  };

  const timelineSteps = steps || getDefaultSteps();

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-green-500 border-green-500 text-white',
          line: 'bg-green-500',
          text: 'text-green-700 font-medium'
        };
      case 'current':
        return {
          circle: 'bg-blue-500 border-blue-500 text-white animate-pulse',
          line: 'bg-gray-300',
          text: 'text-blue-700 font-medium'
        };
      case 'skipped':
        return {
          circle: 'bg-red-100 border-red-300 text-red-500',
          line: 'bg-gray-300',
          text: 'text-red-500'
        };
      default:
        return {
          circle: 'bg-gray-100 border-gray-300 text-gray-400',
          line: 'bg-gray-300',
          text: 'text-gray-500'
        };
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        {timelineSteps.map((step, index) => {
          const Icon = step.icon;
          const classes = getStepClasses(step.status);
          const isLast = index === timelineSteps.length - 1;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${classes.circle}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-xs mt-1 text-center ${classes.text}`}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-1 mx-2 rounded ${classes.line}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Progress
        </CardTitle>
        {overallStatus && (
          <p className="text-sm text-gray-500">
            Status: <span className="capitalize">{overallStatus.replace(/_/g, ' ')}</span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon;
            const classes = getStepClasses(step.status);
            const isLast = index === timelineSteps.length - 1;
            
            return (
              <div key={step.id} className="relative">
                <div className="flex items-start">
                  {/* Timeline circle and line */}
                  <div className="relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${classes.circle}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-12 mt-2 ${classes.line}`} />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="ml-4 pb-8">
                    <h4 className={`font-medium ${classes.text}`}>
                      {step.label}
                    </h4>
                    {step.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {step.description}
                      </p>
                    )}
                    {step.timestamp && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(step.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderProgressTimeline;