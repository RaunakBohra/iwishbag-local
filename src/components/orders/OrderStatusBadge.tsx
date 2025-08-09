import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  DollarSign, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

type OrderStatus = 'pending_payment' | 'paid' | 'processing' | 'seller_ordered' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'exception';
type OverallStatus = 'payment_pending' | 'processing' | 'automation_in_progress' | 'revision_needed' | 'ready_to_ship' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'exception';

interface OrderStatusBadgeProps {
  status: OrderStatus | OverallStatus | string;
  type?: 'order' | 'overall';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ 
  status, 
  type = 'order',
  showIcon = true,
  size = 'md' 
}) => {
  const getStatusConfig = () => {
    const configs: Record<string, { variant: any; icon: React.ElementType; color: string }> = {
      // Order statuses
      'pending_payment': { variant: 'destructive', icon: DollarSign, color: 'text-red-600' },
      'paid': { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      'processing': { variant: 'secondary', icon: Clock, color: 'text-blue-600' },
      'seller_ordered': { variant: 'outline', icon: Package, color: 'text-purple-600' },
      'shipped': { variant: 'secondary', icon: Truck, color: 'text-indigo-600' },
      'delivered': { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      'completed': { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      'cancelled': { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      
      // Overall statuses
      'payment_pending': { variant: 'destructive', icon: DollarSign, color: 'text-red-600' },
      'automation_in_progress': { variant: 'outline', icon: RefreshCw, color: 'text-blue-600' },
      'revision_needed': { variant: 'destructive', icon: AlertTriangle, color: 'text-orange-600' },
      'ready_to_ship': { variant: 'default', icon: Package, color: 'text-green-600' },
      'exception': { variant: 'destructive', icon: AlertTriangle, color: 'text-red-600' },
    };

    return configs[status] || { variant: 'outline', icon: Package, color: 'text-gray-600' };
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const getSize = () => {
    switch (size) {
      case 'sm': return 'text-xs px-2 py-1';
      case 'lg': return 'text-base px-4 py-2';
      default: return 'text-sm px-3 py-1';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-5 w-5';
      default: return 'h-4 w-4';
    }
  };

  return (
    <Badge variant={config.variant} className={`${getSize()} flex items-center gap-1.5`}>
      {showIcon && <Icon className={getIconSize()} />}
      <span className="capitalize">
        {status.replace(/_/g, ' ')}
      </span>
    </Badge>
  );
};

export default OrderStatusBadge;