import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserCheck,
  UserX,
  Star,
  Calendar,
  TrendingUp,
  Activity,
  MapPin,
} from 'lucide-react';
import { BodySmall } from '@/components/ui/typography';
import { Customer } from './CustomerTable';

interface CustomerQuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  customers: Customer[];
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

export const CustomerQuickFilters = ({
  activeFilter,
  onFilterChange,
  customers,
}: CustomerQuickFiltersProps) => {
  // Calculate filter counts
  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filterCounts = {
    all: customers?.length || 0,
    active: customers?.filter((c) => c.cod_enabled)?.length || 0,
    inactive: customers?.filter((c) => !c.cod_enabled)?.length || 0,
    vip: customers?.filter((c) => c.internal_notes?.includes('VIP'))?.length || 0,
    new_this_week: customers?.filter((c) => new Date(c.created_at) >= weekAgo)?.length || 0,
    new_this_month: customers?.filter((c) => new Date(c.created_at) >= monthAgo)?.length || 0,
    with_addresses:
      customers?.filter((c) => c.delivery_addresses && c.delivery_addresses.length > 0)?.length || 0,
    recent_activity: customers?.filter((c) => new Date(c.created_at) >= weekAgo)?.length || 0, // This would need real activity data
  };

  const filters = [
    {
      id: 'all',
      label: 'All Customers',
      count: filterCounts.all,
      icon: <Users className="w-4 h-4" />,
      color: 'gray',
    },
    {
      id: 'active',
      label: 'Active',
      count: filterCounts.active,
      icon: <UserCheck className="w-4 h-4" />,
      color: 'green',
    },
    {
      id: 'inactive',
      label: 'Inactive',
      count: filterCounts.inactive,
      icon: <UserX className="w-4 h-4" />,
      color: 'red',
    },
    {
      id: 'vip',
      label: 'VIP',
      count: filterCounts.vip,
      icon: <Star className="w-4 h-4" />,
      color: 'yellow',
    },
    {
      id: 'new_this_week',
      label: 'New This Week',
      count: filterCounts.new_this_week,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'blue',
    },
    {
      id: 'new_this_month',
      label: 'New This Month',
      count: filterCounts.new_this_month,
      icon: <Calendar className="w-4 h-4" />,
      color: 'purple',
    },
    {
      id: 'with_addresses',
      label: 'With Addresses',
      count: filterCounts.with_addresses,
      icon: <MapPin className="w-4 h-4" />,
      color: 'indigo',
    },
    {
      id: 'recent_activity',
      label: 'Recently Active',
      count: filterCounts.recent_activity,
      icon: <Activity className="w-4 h-4" />,
      color: 'emerald',
    },
  ];

  // Filter out tabs with zero counts (except 'all')
  const visibleFilters = filters.filter((filter) => filter.id === 'all' || filter.count > 0);

  // Get filter description
  const getFilterDescription = (filterId: string) => {
    const descriptions = {
      all: 'all customers',
      active: 'with COD enabled',
      inactive: 'without COD enabled',
      vip: 'marked as VIP',
      new_this_week: 'joined in the last 7 days',
      new_this_month: 'joined in the last 30 days',
      with_addresses: 'with saved addresses',
      recent_activity: 'active in the last 7 days',
    };
    return descriptions[filterId as keyof typeof descriptions] || '';
  };

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
              Showing {filterCounts[activeFilter as keyof typeof filterCounts] || 0} customers{' '}
              {getFilterDescription(activeFilter)}
            </BodySmall>
          </div>
        </div>
      )}
    </div>
  );
};
