import React from 'react';
import { Card, CardProps } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useBulkSelectionContext } from './BulkSelectionProvider';

interface SelectableCardProps extends CardProps {
  id: string;
  children: React.ReactNode;
  selectable?: boolean;
  showCheckbox?: boolean;
  checkboxPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const SelectableCard: React.FC<SelectableCardProps> = ({
  id,
  children,
  selectable = true,
  showCheckbox = true,
  checkboxPosition = 'top-right',
  className,
  ...props
}) => {
  const {
    isSelected,
    toggleItem,
  } = useBulkSelectionContext();

  const selected = isSelected(id);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle selection if clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, a, input, select, textarea, [role="button"]');
    
    if (selectable && !isInteractive) {
      toggleItem(id);
    }
  };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectable) {
      toggleItem(id);
    }
  };

  const getCheckboxPositionClasses = () => {
    switch (checkboxPosition) {
      case 'top-left':
        return 'top-3 left-3';
      case 'top-right':
        return 'top-3 right-3';
      case 'bottom-left':
        return 'bottom-3 left-3';
      case 'bottom-right':
        return 'bottom-3 right-3';
      default:
        return 'top-3 right-3';
    }
  };

  return (
    <Card
      className={cn(
        'relative transition-all duration-200',
        selectable && 'cursor-pointer hover:shadow-md',
        selected && 'ring-2 ring-primary shadow-lg',
        className
      )}
      onClick={handleCardClick}
      {...props}
    >
      {selectable && showCheckbox && (
        <div className={cn('absolute z-10', getCheckboxPositionClasses())}>
          <div
            className={cn(
              'rounded p-1 transition-all duration-200',
              selected 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-white/90 backdrop-blur-sm border shadow-sm hover:bg-white'
            )}
            onClick={handleCheckboxChange}
          >
            <Checkbox
              checked={selected}
              onChange={() => {}} // Handled by parent
              className="h-4 w-4 pointer-events-none"
            />
          </div>
        </div>
      )}
      
      {children}
      
      {/* Selection Overlay */}
      {selected && (
        <div className="absolute inset-0 bg-primary/5 rounded-lg pointer-events-none" />
      )}
    </Card>
  );
};