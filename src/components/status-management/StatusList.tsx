import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';
import { StatusCard } from './StatusCard';

interface StatusListProps {
  title: string;
  description: string;
  category: 'quote' | 'order';
  statuses: StatusConfig[];
  onAddStatus: (category: 'quote' | 'order') => void;
  onEditStatus: (status: StatusConfig) => void;
  onDeleteStatus: (statusId: string, category: 'quote' | 'order') => void;
  onMoveStatus: (statusId: string, direction: 'up' | 'down', category: 'quote' | 'order') => void;
}

export const StatusList: React.FC<StatusListProps> = ({
  title,
  description,
  category,
  statuses,
  onAddStatus,
  onEditStatus,
  onDeleteStatus,
  onMoveStatus,
}) => {
  const sectionId = `${category}-section`;
  const addButtonId = `add-${category}-status`;
  const listId = `${category}-statuses-list`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900" id={`${sectionId}-title`}>
            {title}
          </h2>
          <p className="text-sm text-gray-600" id={`${sectionId}-desc`}>
            {description}
          </p>
        </div>
        <Button
          onClick={() => onAddStatus(category)}
          className="bg-teal-600 hover:bg-teal-700 text-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
          aria-describedby={`${addButtonId}-desc`}
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add Status
        </Button>
        <span id={`${addButtonId}-desc`} className="sr-only">
          Creates a new {category} status configuration
        </span>
      </div>

      <div className="space-y-4" role="list" aria-label={`${title} list`} id={listId}>
        {statuses
          .sort((a, b) => a.order - b.order)
          .map((status, index) => (
            <div 
              key={status.id} 
              role="listitem" 
              aria-setsize={statuses.length} 
              aria-posinset={index + 1}
            >
              <StatusCard
                status={status}
                category={category}
                statuses={statuses}
                onEdit={onEditStatus}
                onDelete={onDeleteStatus}
                onMove={onMoveStatus}
              />
            </div>
          ))}
      </div>

      {statuses.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-sm mb-4">
            No {category} statuses configured yet
          </p>
          <Button
            onClick={() => onAddStatus(category)}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First {category === 'quote' ? 'Quote' : 'Order'} Status
          </Button>
        </div>
      )}
    </div>
  );
};