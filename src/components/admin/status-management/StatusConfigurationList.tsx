import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Activity, 
  Package, 
  FileText 
} from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';

const colorOptions = [
  { value: 'default', className: 'bg-teal-100 text-teal-800' },
  { value: 'secondary', className: 'bg-gray-100 text-gray-800' },
  { value: 'outline', className: 'bg-white text-gray-800 border' },
  { value: 'destructive', className: 'bg-red-100 text-red-800' },
  { value: 'success', className: 'bg-green-100 text-green-800' },
  { value: 'warning', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'info', className: 'bg-sky-100 text-sky-800' },
  { value: 'purple', className: 'bg-orange-100 text-orange-800' },
  { value: 'pink', className: 'bg-pink-100 text-pink-800' },
  { value: 'indigo', className: 'bg-teal-100 text-cyan-800' },
  { value: 'emerald', className: 'bg-emerald-100 text-emerald-800' },
  { value: 'amber', className: 'bg-amber-100 text-amber-800' },
  { value: 'rose', className: 'bg-rose-100 text-rose-800' },
  { value: 'violet', className: 'bg-violet-100 text-violet-800' },
  { value: 'cyan', className: 'bg-cyan-100 text-cyan-800' },
  { value: 'lime', className: 'bg-lime-100 text-lime-800' },
];

const getIconForCategory = (category: string) => {
  switch (category) {
    case 'quote':
      return <FileText className="h-4 w-4" />;
    case 'order':
      return <Package className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getBadgeClassName = (color: string) => {
  const colorOption = colorOptions.find(option => option.value === color);
  return colorOption?.className || 'bg-gray-100 text-gray-800';
};

interface StatusConfigurationListProps {
  statuses: StatusConfig[];
  category: string;
  onAddStatus: (category: string) => void;
  onEditStatus: (status: StatusConfig) => void;
  onDeleteStatus: (id: string, category: string) => void;
  onReorderStatus: (id: string, direction: 'up' | 'down', category: string) => void;
  isLoading: boolean;
}

export const StatusConfigurationList: React.FC<StatusConfigurationListProps> = ({
  statuses,
  category,
  onAddStatus,
  onEditStatus,
  onDeleteStatus,
  onReorderStatus,
  isLoading
}) => {
  const categoryTitle = category === 'quote' ? 'Quote Statuses' : 'Order Statuses';
  const categoryDescription = category === 'quote' 
    ? 'Manage the lifecycle of quotes from creation to approval'
    : 'Manage the lifecycle of orders from payment to delivery';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="h-9 bg-gray-200 rounded w-24"></div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-gray-200 rounded w-24"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            {getIconForCategory(category)}
            <span>{categoryTitle}</span>
            <Badge variant="outline">{statuses.length} statuses</Badge>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {categoryDescription}
          </p>
        </div>
        <Button
          onClick={() => onAddStatus(category)}
          size="sm"
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Status</span>
        </Button>
      </div>

      {/* Status List */}
      <div className="space-y-3">
        {statuses.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-gray-400">
              {getIconForCategory(category)}
              <h4 className="mt-2 text-lg font-medium text-gray-900">No statuses configured</h4>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first {category} status.
              </p>
              <Button
                onClick={() => onAddStatus(category)}
                className="mt-4"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Status
              </Button>
            </div>
          </div>
        ) : (
          statuses.map((status, index) => (
            <div
              key={status.id}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge 
                      className={getBadgeClassName(status.color || 'default')}
                    >
                      {status.label}
                    </Badge>
                    
                    <span className="text-sm text-gray-500 font-mono">
                      {status.name}
                    </span>
                    
                    {status.requiresPayment && (
                      <Badge variant="outline" className="text-xs">
                        Requires Payment
                      </Badge>
                    )}
                    
                    {status.finalStatus && (
                      <Badge variant="secondary" className="text-xs">
                        Final Status
                      </Badge>
                    )}
                    
                    <span className="text-xs text-gray-400">
                      Order: {status.order || index + 1}
                    </span>
                  </div>
                  
                  {status.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {status.description}
                    </p>
                  )}
                  
                  {/* Additional Status Info */}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {status.allowedTransitions && status.allowedTransitions.length > 0 && (
                      <span>
                        Transitions: {status.allowedTransitions.length}
                      </span>
                    )}
                    
                    {status.paymentMilestones && status.paymentMilestones.length > 0 && (
                      <span>
                        Milestones: {status.paymentMilestones.length}
                      </span>
                    )}
                    
                    {status.codSettings && (
                      <span>COD Enabled</span>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReorderStatus(status.id, 'up', category)}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReorderStatus(status.id, 'down', category)}
                      disabled={index === statuses.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Edit Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStatus(status)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  {/* Delete Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete the status "${status.label}"? This action cannot be undone.`)) {
                        onDeleteStatus(status.id, category);
                      }
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Summary Stats */}
      {statuses.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {statuses.length}
              </div>
              <div className="text-sm text-gray-600">Total Statuses</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {statuses.filter(s => s.finalStatus).length}
              </div>
              <div className="text-sm text-gray-600">Final Statuses</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {statuses.filter(s => s.requiresPayment).length}
              </div>
              <div className="text-sm text-gray-600">Payment Required</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {statuses.reduce((sum, s) => sum + (s.allowedTransitions?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Transitions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};