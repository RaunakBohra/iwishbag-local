import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  DollarSign,
  FileText,
  ShoppingCart,
  Calculator,
  Activity,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string | null | undefined;
  category: 'quote' | 'order';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge = ({ status, category, className, showIcon = true }: StatusBadgeProps) => {
  const { getStatusConfig } = useStatusManagement();

  // Handle null/undefined status
  if (!status) {
    return (
      <Badge
        variant="secondary"
        className={cn('bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', className)}
        title="No status"
      >
        No Status
      </Badge>
    );
  }

  // Get status configuration from the management system
  const statusConfig = getStatusConfig(status, category);

  // Fallback to default if status not found in management system
  if (!statusConfig) {
    const fallbackConfig = {
      label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      tooltip: `Status: ${status}`,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
      <Badge
        variant="secondary"
        className={cn(fallbackConfig.className, className)}
        title={fallbackConfig.tooltip}
      >
        {fallbackConfig.label}
      </Badge>
    );
  }

  // Get the icon component based on the icon name
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      Clock: Clock,
      CheckCircle: CheckCircle,
      XCircle: XCircle,
      AlertTriangle: AlertTriangle,
      Package: Package,
      Truck: Truck,
      DollarSign: DollarSign,
      FileText: FileText,
      ShoppingCart: ShoppingCart,
      Calculator: Calculator,
      Activity: Activity,
    };

    return iconMap[iconName] || Activity;
  };

  const IconComponent = getIconComponent(statusConfig.icon);

  // Type-safe variant mapping
  type BadgeVariant =
    | 'default'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'purple'
    | 'pink'
    | 'indigo'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'violet'
    | 'cyan'
    | 'lime';

  const variant = (statusConfig.color as BadgeVariant) || 'default';

  return (
    <Badge variant={variant} className={cn(className, 'text-sm')} title={statusConfig.description}>
      {showIcon && statusConfig.icon && <IconComponent className="mr-1 h-4 w-4" />}
      {statusConfig.label}
    </Badge>
  );
};
