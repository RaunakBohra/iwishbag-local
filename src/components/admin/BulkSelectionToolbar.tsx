import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckSquare,
  Square,
  Minus,
  X,
  Ban,
  Plus,
  Clock,
  FileText,
  Download,
  Trash2,
  MoreVertical,
  MapPin,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBulkSelectionContext } from './BulkSelectionProvider';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
  onClick: (selectedIds: string[]) => void;
}

interface BulkSelectionToolbarProps {
  items: { id: string }[];
  actions: BulkAction[];
  title?: string;
  description?: string;
  className?: string;
}

export const BulkSelectionToolbar: React.FC<BulkSelectionToolbarProps> = ({
  items,
  actions,
  title = "Select items for bulk actions",
  description,
  className = "",
}) => {
  const {
    selectedItems,
    isAllSelected,
    isIndeterminate,
    selectAll,
    deselectAll,
    toggleAll,
    getSelectedCount,
    getSelectedArray,
    setTotalItems,
  } = useBulkSelectionContext();

  // Update total items count when items change
  React.useEffect(() => {
    setTotalItems(items.length);
  }, [items.length, setTotalItems]);

  const selectedCount = getSelectedCount();
  const itemIds = items.map(item => item.id);

  const handleSelectAllChange = () => {
    toggleAll(itemIds);
  };

  const primaryActions = actions.filter(action => !action.disabled).slice(0, 3);
  const secondaryActions = actions.filter(action => !action.disabled).slice(3);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className={`transition-all duration-200 ${selectedCount > 0 ? 'border-primary shadow-md' : ''} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Selection Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAllChange}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = isIndeterminate;
                  }
                }}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">
                {selectedCount > 0 ? (
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-1">
                      {selectedCount} selected
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAll}
                      className="h-auto p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{title}</span>
                )}
              </span>
            </div>
            
            {description && selectedCount === 0 && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">{description}</span>
              </>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              {/* Primary Actions */}
              {primaryActions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => action.onClick(getSelectedArray())}
                  disabled={action.disabled}
                  className="flex items-center gap-2"
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}

              {/* Secondary Actions Dropdown */}
              {secondaryActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {secondaryActions.map((action, index) => (
                      <React.Fragment key={action.id}>
                        {index > 0 && action.variant === 'destructive' && (
                          <DropdownMenuSeparator />
                        )}
                        <DropdownMenuItem
                          onClick={() => action.onClick(getSelectedArray())}
                          disabled={action.disabled}
                          className={
                            action.variant === 'destructive' 
                              ? 'text-destructive focus:text-destructive' 
                              : ''
                          }
                        >
                          {action.icon}
                          <span className="ml-2">{action.label}</span>
                        </DropdownMenuItem>
                      </React.Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Pre-defined common bulk actions
export const createStorageFeeBulkActions = (
  onWaiveFees: (ids: string[]) => void,
  onExtendExemptions: (ids: string[]) => void,
  onExport: (ids: string[]) => void
): BulkAction[] => [
  {
    id: 'waive-fees',
    label: 'Waive Fees',
    icon: <Ban className="h-4 w-4" />,
    variant: 'outline',
    onClick: onWaiveFees,
  },
  {
    id: 'extend-exemptions',
    label: 'Extend Exemptions',
    icon: <Plus className="h-4 w-4" />,
    variant: 'outline',
    onClick: onExtendExemptions,
  },
  {
    id: 'export',
    label: 'Export Data',
    icon: <Download className="h-4 w-4" />,
    variant: 'secondary',
    onClick: onExport,
  },
];

export const createPackageBulkActions = (
  onUpdateStatus: (ids: string[]) => void,
  onAddNotes: (ids: string[]) => void,
  onAssignLocation: (ids: string[]) => void,
  onExport: (ids: string[]) => void,
  onDelete: (ids: string[]) => void
): BulkAction[] => [
  {
    id: 'update-status',
    label: 'Update Status',
    icon: <CheckSquare className="h-4 w-4" />,
    variant: 'outline',
    onClick: onUpdateStatus,
  },
  {
    id: 'add-notes',
    label: 'Add Notes',
    icon: <FileText className="h-4 w-4" />,
    variant: 'outline',
    onClick: onAddNotes,
  },
  {
    id: 'assign-location',
    label: 'Assign Location',
    icon: <MapPin className="h-4 w-4" />,
    variant: 'outline',
    onClick: onAssignLocation,
  },
  {
    id: 'export',
    label: 'Export Data',
    icon: <Download className="h-4 w-4" />,
    variant: 'secondary',
    onClick: onExport,
  },
  {
    id: 'delete',
    label: 'Delete Selected',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive',
    onClick: onDelete,
  },
];