/**
 * Cart Undo/Redo Component - Enhanced cart operations
 * 
 * Features:
 * - Undo/Redo buttons with state-aware styling
 * - Last operation display
 * - Error handling with user feedback
 * - Keyboard shortcuts support
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Undo2, Redo2, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useCartHistory } from '@/stores/cartStore';
import { logger } from '@/utils/logger';

interface CartUndoRedoProps {
  className?: string;
  showLabels?: boolean;
  showHistory?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CartUndoRedo: React.FC<CartUndoRedoProps> = ({
  className = '',
  showLabels = false,
  showHistory = true,
  size = 'md'
}) => {
  const { toast } = useToast();
  const {
    canUndo,
    canRedo,
    lastOperation,
    historyCount,
    undo,
    redo
  } = useCartHistory();

  const [isUndoing, setIsUndoing] = useState(false);
  const [isRedoing, setIsRedoing] = useState(false);

  // Handle undo operation
  const handleUndo = useCallback(async () => {
    if (!canUndo || isUndoing) return;

    setIsUndoing(true);
    try {
      await undo();
      
      toast({
        title: "Action undone",
        description: "Your last cart action has been undone.",
        duration: 2000
      });

      logger.info('Cart undo operation completed successfully');
    } catch (error) {
      console.error('[CART UNDO] Failed:', error);
      
      toast({
        title: "Undo failed",
        description: error instanceof Error ? error.message : "Failed to undo the last action.",
        variant: "destructive",
        duration: 4000
      });

      logger.error('Cart undo operation failed', error);
    } finally {
      setIsUndoing(false);
    }
  }, [canUndo, isUndoing, undo, toast]);

  // Handle redo operation
  const handleRedo = useCallback(async () => {
    if (!canRedo || isRedoing) return;

    setIsRedoing(true);
    try {
      await redo();
      
      toast({
        title: "Action redone",
        description: "Your cart action has been redone.",
        duration: 2000
      });

      logger.info('Cart redo operation completed successfully');
    } catch (error) {
      console.error('[CART REDO] Failed:', error);
      
      toast({
        title: "Redo failed", 
        description: error instanceof Error ? error.message : "Failed to redo the action.",
        variant: "destructive",
        duration: 4000
      });

      logger.error('Cart redo operation failed', error);
    } finally {
      setIsRedoing(false);
    }
  }, [canRedo, isRedoing, redo, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Get button size classes
  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'h-8 w-8';
      case 'lg': return 'h-12 w-12';
      default: return 'h-10 w-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-3 h-3';
      case 'lg': return 'w-6 h-6';
      default: return 'w-4 h-4';
    }
  };

  // Format operation for display
  const formatOperation = (operation: string | null) => {
    if (!operation) return 'No recent actions';
    
    return operation
      .replace(/_/g, ' ')
      .replace(/^undo_|^redo_/, '')
      .replace(/^(.)/g, (match) => match.toUpperCase());
  };

  if (historyCount === 0) {
    return null; // Don't show if no history
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`${getButtonSize()} ${!canUndo ? 'opacity-50' : 'hover:bg-blue-50'}`}
              onClick={handleUndo}
              disabled={!canUndo || isUndoing}
            >
              {isUndoing ? (
                <Loader2 className={getIconSize()} />
              ) : (
                <Undo2 className={getIconSize()} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{canUndo ? 'Undo last action (Ctrl+Z)' : 'Nothing to undo'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`${getButtonSize()} ${!canRedo ? 'opacity-50' : 'hover:bg-green-50'}`}
              onClick={handleRedo}
              disabled={!canRedo || isRedoing}
            >
              {isRedoing ? (
                <Loader2 className={getIconSize()} />
              ) : (
                <Redo2 className={getIconSize()} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{canRedo ? 'Redo last undone action (Ctrl+Y)' : 'Nothing to redo'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Show labels if requested */}
        {showLabels && (
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">
              {canUndo ? 'Undo' : ''} {canRedo ? 'Redo' : ''}
            </span>
          </div>
        )}

        {/* Show history info if requested */}
        {showHistory && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l">
            <History className="w-3 h-3 text-gray-400" />
            <div className="flex flex-col">
              <Badge variant="secondary" className="text-xs">
                {historyCount} actions
              </Badge>
              {lastOperation && (
                <span className="text-xs text-gray-500 max-w-24 truncate">
                  {formatOperation(lastOperation)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CartUndoRedo;