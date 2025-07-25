import { TicketIcon, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

interface CompactStatsBarProps {
  stats?: TicketStats;
  isLoading?: boolean;
}

export const CompactStatsBar = ({ stats, isLoading }: CompactStatsBarProps) => {
  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-6 py-3 px-4 bg-gray-50 border-b">
        <div className="animate-pulse flex space-x-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-300 rounded"></div>
              <div className="h-4 w-8 bg-gray-300 rounded"></div>
              <div className="h-3 w-12 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: TicketIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      label: 'Open',
      value: stats.open,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'In Progress',
      value: stats.in_progress,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Closed',
      value: stats.closed,
      icon: CheckCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ];

  return (
    <div className="flex items-center gap-3 md:gap-6 py-3 px-4 bg-gray-50 border-b overflow-x-auto">
      {statItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <div className={`p-1 rounded ${item.bgColor}`}>
            <item.icon className={`h-3 w-3 ${item.color}`} />
          </div>
          <span className="font-semibold text-sm">{item.value}</span>
          <span className="text-xs text-gray-500 whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
