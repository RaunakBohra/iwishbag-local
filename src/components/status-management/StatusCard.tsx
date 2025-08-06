import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
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
  Banknote,
} from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';

const iconOptions = [
  { value: 'Clock', label: 'Clock', icon: Clock },
  { value: 'CheckCircle', label: 'Check Circle', icon: CheckCircle },
  { value: 'XCircle', label: 'X Circle', icon: XCircle },
  { value: 'AlertTriangle', label: 'Alert Triangle', icon: AlertTriangle },
  { value: 'Package', label: 'Package', icon: Package },
  { value: 'Truck', label: 'Truck', icon: Truck },
  { value: 'DollarSign', label: 'Dollar Sign', icon: DollarSign },
  { value: 'FileText', label: 'File Text', icon: FileText },
  { value: 'ShoppingCart', label: 'Shopping Cart', icon: ShoppingCart },
  { value: 'Calculator', label: 'Calculator', icon: Calculator },
  { value: 'Banknote', label: 'Banknote', icon: Banknote },
];

interface StatusCardProps {
  status: StatusConfig;
  category: 'quote' | 'order';
  statuses: StatusConfig[];
  onEdit: (status: StatusConfig) => void;
  onDelete: (statusId: string, category: 'quote' | 'order') => void;
  onMove: (statusId: string, direction: 'up' | 'down', category: 'quote' | 'order') => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  status,
  category,
  statuses,
  onEdit,
  onDelete,
  onMove,
}) => {
  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find((opt) => opt.value === iconName);
    return iconOption ? iconOption.icon : Clock;
  };

  const IconComponent = getIconComponent(status.icon);

  const sortedStatuses = statuses.sort((a, b) => a.order - b.order);
  const currentIndex = sortedStatuses.findIndex(s => s.id === status.id);

  return (
    <article
      key={status.id}
      className="bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2"
      role="article"
      aria-labelledby={`status-${status.id}-title`}
      aria-describedby={`status-${status.id}-desc`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-50 rounded-lg" aria-hidden="true">
              <IconComponent className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900" id={`status-${status.id}-title`}>
                {status.label}
              </h3>
              <p className="text-xs text-gray-500" id={`status-${status.id}-desc`}>
                {status.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={status.color} className="text-xs" aria-label={`Status name: ${status.name}`}>
              {status.name}
            </Badge>
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                status.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
              role="status"
              aria-label={`Status is ${status.isActive ? 'active' : 'inactive'}`}
            >
              {status.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(status)}
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMove(status.id, 'up', category)}
              disabled={currentIndex === 0}
              className="text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Move status up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMove(status.id, 'down', category)}
              disabled={currentIndex === sortedStatuses.length - 1}
              className="text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Move status down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>Order: {status.order}</span>
            {status.isTerminal && (
              <Badge variant="outline" className="text-xs ml-2">
                Terminal
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (confirm(`Are you sure you want to delete the status "${status.label}"?`)) {
                onDelete(status.id, category);
              }
            }}
            className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400"
            aria-label={`Delete status: ${status.label}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </article>
  );
};