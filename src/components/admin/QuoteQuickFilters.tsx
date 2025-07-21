import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Star,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { BodySmall } from '@/components/ui/typography';

interface QuickFilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  quoteCounts: {
    all: number;
    today: number;
    pending: number;
    approved: number;
    highPriority: number;
    overdue: number;
    paid: number;
    rejected: number;
  };
}

interface FilterTabProps {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

const FilterTab = ({ id, label, count, icon, color, isActive, onClick }: FilterTabProps) => (
  <Button
    variant={isActive ? 'default' : 'ghost'}
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-2 h-auto rounded-lg transition-all duration-200
      ${
        isActive
          ? `bg-${color}-600 text-white hover:bg-${color}-700`
          : `text-gray-700 hover:bg-${color}-50 hover:text-${color}-700`
      }
    `}
  >
    <div className={`w-4 h-4 ${isActive ? 'text-white' : `text-${color}-600`}`}>{icon}</div>
    <span className="font-medium">{label}</span>
    <Badge
      variant={isActive ? 'secondary' : 'outline'}
      className={`
        ml-1 text-xs
        ${
          isActive
            ? 'bg-white/20 text-white border-white/20'
            : `bg-${color}-50 text-${color}-700 border-${color}-200`
        }
      `}
    >
      {count}
    </Badge>
  </Button>
);

export const QuoteQuickFilters = ({
  activeFilter,
  onFilterChange,
  quoteCounts,
}: QuickFilterTabsProps) => {
  const filters = [
    {
      id: 'all',
      label: 'All Quotes',
      count: quoteCounts.all,
      icon: <div className="w-2 h-2 bg-current rounded-full" />,
      color: 'gray',
    },
    {
      id: 'today',
      label: 'Today',
      count: quoteCounts.today,
      icon: <Calendar className="w-4 h-4" />,
      color: 'blue',
    },
    {
      id: 'pending',
      label: 'Pending',
      count: quoteCounts.pending,
      icon: <Clock className="w-4 h-4" />,
      color: 'yellow',
    },
    {
      id: 'approved',
      label: 'Approved',
      count: quoteCounts.approved,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'green',
    },
    {
      id: 'high_priority',
      label: 'High Priority',
      count: quoteCounts.highPriority,
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'red',
    },
    {
      id: 'paid',
      label: 'Paid',
      count: quoteCounts.paid,
      icon: <DollarSign className="w-4 h-4" />,
      color: 'emerald',
    },
    {
      id: 'rejected',
      label: 'Rejected',
      count: quoteCounts.rejected,
      icon: <XCircle className="w-4 h-4" />,
      color: 'red',
    },
  ];

  // Filter out tabs with zero counts (except 'all')
  const visibleFilters = filters.filter((filter) => filter.id === 'all' || filter.count > 0);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BodySmall className="text-gray-600 font-medium">Quick Filters:</BodySmall>
        {activeFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange('all')}
            className="text-gray-500 hover:text-gray-700 h-6 px-2 text-xs"
          >
            Clear filter
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleFilters.map((filter) => (
          <FilterTab
            key={filter.id}
            id={filter.id}
            label={filter.label}
            count={filter.count}
            icon={filter.icon}
            color={filter.color}
            isActive={activeFilter === filter.id}
            onClick={() => onFilterChange(filter.id)}
          />
        ))}
      </div>

      {/* Show active filter info */}
      {activeFilter !== 'all' && (
        <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-600 rounded-full" />
            <BodySmall className="text-teal-700">
              Showing {quoteCounts[activeFilter as keyof typeof quoteCounts] || 0} quotes
              {activeFilter === 'today' && ' created today'}
              {activeFilter === 'pending' && ' awaiting approval'}
              {activeFilter === 'approved' && ' ready for payment'}
              {activeFilter === 'high_priority' && ' marked as high priority'}
              {activeFilter === 'paid' && ' with confirmed payment'}
              {activeFilter === 'rejected' && ' that were rejected'}
            </BodySmall>
          </div>
        </div>
      )}
    </div>
  );
};
