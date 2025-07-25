/**
 * SLA Indicator Components
 * Visual components for displaying SLA status, progress bars, and warnings
 */

import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSLAUtils, useSLAStatus } from '@/hooks/useSLA';
import { type TicketWithSLA } from '@/services/SLAService';
import { cn } from '@/lib/utils';

interface SLAIndicatorProps {
  ticket: TicketWithSLA;
  type: 'response' | 'resolution';
  compact?: boolean;
}

export const SLAIndicator = ({ ticket, type, compact = false }: SLAIndicatorProps) => {
  const { data: slaStatus } = useSLAStatus(ticket);
  const { formatTimeRemaining, getSLAStatusColor, getSLAStatusIcon, getSLAStatusLabel } =
    useSLAUtils();

  if (!slaStatus) {
    return <div className="h-6 w-16 bg-gray-100 animate-pulse rounded"></div>;
  }

  const sla = type === 'response' ? slaStatus.response_sla : slaStatus.resolution_sla;

  if (!sla.deadline) {
    return null;
  }

  const statusColor = getSLAStatusColor(sla.status);
  const statusIcon = getSLAStatusIcon(sla.status);
  const statusLabel = getSLAStatusLabel(sla.status);
  const timeRemaining = formatTimeRemaining(sla.time_remaining);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border',
                statusColor,
              )}
            >
              <span>{statusIcon}</span>
              <span>{timeRemaining}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">
                {type === 'response' ? 'Response' : 'Resolution'} SLA
              </div>
              <div>Status: {statusLabel}</div>
              <div>Time: {timeRemaining}</div>
              <div>Progress: {Math.round(sla.percentage_used)}%</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        statusColor.replace('text-', 'border-').replace('bg-', 'bg-'),
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="font-medium text-sm">
            {type === 'response' ? 'Response' : 'Resolution'} SLA
          </span>
        </div>
        <Badge variant="outline" className={statusColor}>
          {statusIcon} {statusLabel}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span>Time Remaining:</span>
          <span className="font-medium">{timeRemaining}</span>
        </div>

        <Progress
          value={sla.percentage_used}
          className={cn(
            'h-2',
            sla.status === 'critical' || sla.status === 'breached'
              ? '[&>div]:bg-red-500'
              : sla.status === 'warning'
                ? '[&>div]:bg-yellow-500'
                : '[&>div]:bg-green-500',
          )}
        />

        <div className="text-xs text-gray-600">{Math.round(sla.percentage_used)}% of time used</div>
      </div>
    </div>
  );
};

interface SLAProgressBarProps {
  percentage: number;
  status: 'safe' | 'warning' | 'critical' | 'breached' | 'met';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SLAProgressBar = ({
  percentage,
  status,
  showLabel = false,
  size = 'md',
}: SLAProgressBarProps) => {
  const getBarColor = (status: string) => {
    switch (status) {
      case 'safe':
      case 'met':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-orange-500';
      case 'breached':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getBarHeight = (size: string) => {
    switch (size) {
      case 'sm':
        return 'h-1';
      case 'lg':
        return 'h-3';
      default:
        return 'h-2';
    }
  };

  const barColor = getBarColor(status);
  const barHeight = getBarHeight(size);

  return (
    <div className="space-y-1">
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', barHeight)}>
        <div
          className={cn('h-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-gray-600 text-center">{Math.round(percentage)}%</div>
      )}
    </div>
  );
};

interface SLABadgeProps {
  status: 'safe' | 'warning' | 'critical' | 'breached' | 'met';
  timeRemaining?: string;
  type?: 'response' | 'resolution';
}

export const SLABadge = ({ status, timeRemaining, type }: SLABadgeProps) => {
  const { getSLAStatusColor, getSLAStatusIcon, getSLAStatusLabel } = useSLAUtils();

  const statusColor = getSLAStatusColor(status);
  const statusIcon = getSLAStatusIcon(status);
  const statusLabel = getSLAStatusLabel(status);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('text-xs', statusColor)}>
            <span className="mr-1">{statusIcon}</span>
            {timeRemaining || statusLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {type && <div className="font-medium capitalize">{type} SLA</div>}
            <div>Status: {statusLabel}</div>
            {timeRemaining && <div>Time: {timeRemaining}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface SLASummaryCardProps {
  title: string;
  value: number;
  total: number;
  icon: React.ComponentType<{ className?: string }>;
  status: 'good' | 'warning' | 'critical';
}

export const SLASummaryCard = ({
  title,
  value,
  total,
  icon: Icon,
  status,
}: SLASummaryCardProps) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'from-green-50 to-green-100 border-green-200 text-green-800';
      case 'warning':
        return 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800';
      case 'critical':
        return 'from-red-50 to-red-100 border-red-200 text-red-800';
      default:
        return 'from-gray-50 to-gray-100 border-gray-200 text-gray-800';
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <div className={cn('bg-gradient-to-r rounded-lg p-4 border', statusColor)}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-2xl font-bold">
            {value}
            <span className="text-sm font-normal ml-1">/ {total}</span>
          </p>
        </div>
        <Icon className="h-6 w-6 opacity-70" />
      </div>
      <div className="text-sm opacity-75">{percentage}% of total tickets</div>
    </div>
  );
};

interface SLAWarningAlertProps {
  breachedCount: number;
  criticalCount: number;
  onViewBreaches?: () => void;
}

export const SLAWarningAlert = ({
  breachedCount,
  criticalCount,
  onViewBreaches,
}: SLAWarningAlertProps) => {
  if (breachedCount === 0 && criticalCount === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800">SLA Attention Required</h4>
          <div className="text-sm text-red-700 mt-1">
            {breachedCount > 0 && <div>{breachedCount} tickets have breached SLA</div>}
            {criticalCount > 0 && <div>{criticalCount} tickets are approaching SLA deadline</div>}
          </div>
          {onViewBreaches && (
            <button
              onClick={onViewBreaches}
              className="text-sm text-red-800 underline hover:no-underline mt-2"
            >
              View affected tickets →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
