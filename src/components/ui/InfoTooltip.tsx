/**
 * InfoTooltip - Reusable tooltip component for displaying additional information
 * 
 * Features:
 * - Hover and click triggers
 * - Mobile-friendly with touch support
 * - Customizable content and positioning
 * - Accessible with proper ARIA labels
 */

import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface InfoTooltipProps {
  content: React.ReactNode;
  trigger?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  triggerClassName?: string;
  delayDuration?: number;
  sideOffset?: number;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  trigger,
  side = 'top',
  align = 'center',
  className = '',
  triggerClassName = '',
  delayDuration = 200,
  sideOffset = 4
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={`p-1 h-auto text-gray-500 hover:text-gray-700 ${triggerClassName}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      <Info className="w-4 h-4" />
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen} delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          {trigger || defaultTrigger}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={`max-w-xs sm:max-w-sm p-4 text-sm ${className}`}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default InfoTooltip;