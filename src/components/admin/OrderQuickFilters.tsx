import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Calendar,
  Package,
  Truck,
  DollarSign,
  Receipt,
  CreditCard
} from 'lucide-react';
import { BodySmall } from '@/components/ui/typography';

interface OrderQuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  orderCounts: {
    all: number;
    today: number;
    pending: number;
    paid: number;
    shipped: number;
    completed: number;
    unpaid: number;
    partial: number;
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
      ${isActive 
        ? `bg-${color}-600 text-white hover:bg-${color}-700` 
        : `text-gray-700 hover:bg-${color}-50 hover:text-${color}-700`
      }
    `}
  >
    <div className={`w-4 h-4 ${isActive ? 'text-white' : `text-${color}-600`}`}>
      {icon}
    </div>
    <span className="font-medium">{label}</span>
    <Badge 
      variant={isActive ? 'secondary' : 'outline'}
      className={`
        ml-1 text-xs
        ${isActive 
          ? 'bg-white/20 text-white border-white/20' 
          : `bg-${color}-50 text-${color}-700 border-${color}-200`
        }
      `}
    >
      {count}
    </Badge>
  </Button>
);

export const OrderQuickFilters = ({ 
  activeFilter, 
  onFilterChange, 
  orderCounts 
}: OrderQuickFiltersProps) => {
  const filters = [
    {
      id: 'all',
      label: 'All Orders',
      count: orderCounts.all,
      icon: <div className="w-2 h-2 bg-current rounded-full" />,
      color: 'gray'
    },
    {
      id: 'today',
      label: 'Today',
      count: orderCounts.today,
      icon: <Calendar className="w-4 h-4" />,
      color: 'blue'
    },
    {
      id: 'pending',
      label: 'Pending',
      count: orderCounts.pending,
      icon: <Clock className="w-4 h-4" />,
      color: 'yellow'
    },
    {
      id: 'paid',
      label: 'Paid',
      count: orderCounts.paid,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'green'
    },
    {
      id: 'shipped',
      label: 'Shipped',
      count: orderCounts.shipped,
      icon: <Truck className="w-4 h-4" />,
      color: 'purple'
    },
    {
      id: 'completed',
      label: 'Completed',
      count: orderCounts.completed,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'emerald'
    },
    {
      id: 'unpaid',
      label: 'Unpaid',
      count: orderCounts.unpaid,
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'red'
    },
    {
      id: 'partial',
      label: 'Partial Payment',
      count: orderCounts.partial,
      icon: <DollarSign className="w-4 h-4" />,
      color: 'orange'
    }
  ];

  // Filter out tabs with zero counts (except 'all')
  const visibleFilters = filters.filter(filter => 
    filter.id === 'all' || filter.count > 0
  );

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
              Showing {orderCounts[activeFilter as keyof typeof orderCounts] || 0} orders
              {activeFilter === 'today' && ' created today'}
              {activeFilter === 'pending' && ' awaiting processing'}
              {activeFilter === 'paid' && ' with confirmed payment'}
              {activeFilter === 'shipped' && ' currently in transit'}
              {activeFilter === 'completed' && ' successfully delivered'}
              {activeFilter === 'unpaid' && ' requiring payment'}
              {activeFilter === 'partial' && ' with partial payment'}
            </BodySmall>
          </div>
        </div>
      )}
    </div>
  );
};