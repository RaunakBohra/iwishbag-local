import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, Truck, Globe, Home, Clock, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { DeliveryTimeline, format } from '@/lib/delivery-estimates';

interface EnhancedDeliveryTimelineProps {
  timeline: DeliveryTimeline[];
  currentDate?: Date;
  className?: string;
}

export const EnhancedDeliveryTimeline: React.FC<EnhancedDeliveryTimelineProps> = ({
  timeline,
  currentDate = new Date(),
  className = '',
}) => {
  const getPhaseIcon = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'order processing':
        return <Package className="h-5 w-5" />;
      case 'international shipping':
        return <Globe className="h-5 w-5" />;
      case 'customs clearance':
        return <Truck className="h-5 w-5" />;
      case 'local delivery':
        return <Home className="h-5 w-5" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const getPhaseStatus = (phase: DeliveryTimeline) => {
    if (currentDate < phase.start_date) {
      return {
        status: 'pending',
        color: 'text-gray-400',
        bgColor: 'bg-gray-100',
      };
    } else if (currentDate >= phase.start_date && currentDate <= phase.end_date) {
      return {
        status: 'in_progress',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
      };
    } else {
      return {
        status: 'completed',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      };
    }
  };

  const getProgressPercentage = (phase: DeliveryTimeline) => {
    if (currentDate < phase.start_date) return 0;
    if (currentDate > phase.end_date) return 100;

    const totalDuration = phase.end_date.getTime() - phase.start_date.getTime();
    const elapsed = currentDate.getTime() - phase.start_date.getTime();
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Circle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timeline.map((phase, index) => {
            const phaseStatus = getPhaseStatus(phase);
            const progress = getProgressPercentage(phase);

            return (
              <div key={phase.phase} className="relative">
                {/* Connection Line */}
                {index < timeline.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                )}

                <div className="flex items-start gap-4">
                  {/* Phase Icon */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${phaseStatus.bgColor}`}
                  >
                    <div className={phaseStatus.color}>{getPhaseIcon(phase.phase)}</div>
                  </div>

                  {/* Phase Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{phase.phase}</h4>
                      {getStatusIcon(phaseStatus.status)}
                      <Badge
                        variant={phaseStatus.status === 'completed' ? 'default' : 'secondary'}
                        className={`${
                          phaseStatus.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : phaseStatus.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {phaseStatus.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{phase.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{format(phase.start_date, 'MMM do')}</span>
                        <span>{format(phase.end_date, 'MMM do')}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          {phase.duration_days} day
                          {phase.duration_days > 1 ? 's' : ''}
                        </span>
                        <span>{Math.round(progress)}% complete</span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {phaseStatus.status === 'in_progress' && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Currently in progress</span>
                        </div>
                      </div>
                    )}

                    {phaseStatus.status === 'completed' && (
                      <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Completed on {format(phase.end_date, 'MMM do, yyyy')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">
              {timeline.filter((p) => getPhaseStatus(p).status === 'completed').length} of{' '}
              {timeline.length} phases
            </span>
          </div>
          <Progress
            value={
              (timeline.filter((p) => getPhaseStatus(p).status === 'completed').length /
                timeline.length) *
              100
            }
            className="h-3"
          />
        </div>
      </CardContent>
    </Card>
  );
};
