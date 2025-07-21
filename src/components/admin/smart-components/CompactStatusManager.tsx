// ============================================================================
// COMPACT STATUS MANAGER - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Inline editing, progress indicators, smart suggestions
// ============================================================================

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedQuote } from '@/types/unified-quote';

interface CompactStatusManagerProps {
  quote: UnifiedQuote;
  onStatusUpdate: (forceRefresh?: boolean) => void;
  compact?: boolean;
  showProgress?: boolean;
}

export const CompactStatusManager: React.FC<CompactStatusManagerProps> = ({
  quote,
  onStatusUpdate,
  compact = true,
  showProgress = true,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { getStatusConfig, getAllowedTransitions, isValidTransition, orderStatuses } = useStatusManagement();
  const { toast } = useToast();
  
  // Determine if this is a quote or order based on dynamic status config
  const isOrderStatus = orderStatuses.some(status => status.name === quote.status);
  const category: 'quote' | 'order' = isOrderStatus ? 'order' : 'quote';

  // Get dynamic status config from the management system
  const currentConfig = getStatusConfig(quote.status, category);
  const allowedTransitions = getAllowedTransitions(quote.status, category);
  
  // Debug logging
  console.log(`🔍 CompactStatusManager Debug:`, {
    status: quote.status,
    category,
    isOrderStatus,
    currentConfig: !!currentConfig,
    allowedTransitions: allowedTransitions.length,
    transitions: allowedTransitions
  });
  const canTransition = allowedTransitions.length > 0;
  
  // Fallback to basic config if not found in dynamic system
  const fallbackConfig = {
    label: quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('_', ' '),
    progressPercentage: 50,
    customerActionText: 'View Status'
  };
  
  const statusConfig = currentConfig || fallbackConfig;

  const handleStatusChange = async (newStatus: string) => {
    // Validate transition
    if (!isValidTransition(quote.status, newStatus, category)) {
      toast({
        title: 'Invalid Transition',
        description: `Cannot transition from ${quote.status} to ${newStatus}`,
        variant: 'destructive',
      });
      return;
    }

    // Handle self-transitions (refresh actions)
    if (newStatus === quote.status) {
      toast({
        title: 'Status Refreshed',
        description: `Refreshed ${statusConfig?.label || newStatus} status`,
        duration: 2000,
      });
      onStatusUpdate(false); // Trigger refresh without database update
      return;
    }

    // Confirm destructive actions (reset to pending)
    if (newStatus === 'pending' && quote.status !== 'pending') {
      // You could add a confirmation dialog here if needed
      // For now, we'll proceed with the reset
    }

    setIsUpdating(true);
    try {
      console.log(`🔄 CompactStatusManager: Updating quote ${quote.id} status from ${quote.status} to ${newStatus}`);
      
      const success = await unifiedDataEngine.updateQuote(quote.id, { 
        status: newStatus 
      });

      if (success) {
        // Smart success messaging
        let message = `Status changed to ${newStatus}`;
        if (newStatus === 'pending') {
          message = 'Reset to pending - ready for review';
        } else if (newStatus === quote.status) {
          message = `Refreshed ${statusConfig?.label || newStatus}`;
        }
        
        toast({
          title: 'Status Updated',
          description: message,
        });
        onStatusUpdate(true); // Trigger parent component refresh with force refresh
      } else {
        throw new Error('Failed to update quote status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getSmartAction = () => {
    // Get the primary next action from allowed transitions
    const primaryTransition = allowedTransitions[0];
    if (!primaryTransition) return null;
    
    const nextConfig = getStatusConfig(primaryTransition, category);
    
    // Smart action labeling based on transition type
    let actionText: string;
    
    if (primaryTransition === quote.status) {
      // Self-transition: Show as "Refresh"
      actionText = `Refresh ${statusConfig?.label || quote.status}`;
    } else if (primaryTransition === 'pending') {
      // Reset transition: Show as "Reset to Pending"
      actionText = 'Reset to Pending';
    } else {
      // Normal transition: Use customer action text or fallback
      actionText = statusConfig?.customerActionText || 
                  nextConfig?.customerActionText || 
                  `Mark ${nextConfig?.label || primaryTransition}`;
    }
    
    return {
      text: actionText,
      action: primaryTransition,
      icon: primaryTransition === quote.status ? 
            <ChevronDown className="w-3 h-3" /> : 
            <ArrowRight className="w-3 h-3" />
    };
  };

  const smartAction = getSmartAction();
  const nextStatus = allowedTransitions[0]; // Primary next action

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {/* Current Status Badge */}
        <StatusBadge 
          status={quote.status} 
          category={category}
          className="text-xs"
        />

        {/* Progress Bar (if enabled) */}
        {showProgress && (
          <div className="flex-1 max-w-16">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${statusConfig?.progressPercentage || 50}%` }}
              />
            </div>
          </div>
        )}

        {/* Smart Action + Dropdown - Always show both when transitions available */}
        {canTransition ? (
          <div className="flex items-center space-x-1">
            {/* Smart Quick Action Button (Primary Action) */}
            {smartAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(smartAction.action)}
                disabled={isUpdating}
                className="h-7 px-2 text-xs flex items-center space-x-1"
              >
                {smartAction.icon}
                <span>{smartAction.text}</span>
              </Button>
            )}
            
            {/* Always show dropdown for ALL transitions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  className="h-7 w-7 p-0 flex items-center justify-center"
                  title="More status options"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                  Available Transitions
                </div>
                {allowedTransitions.map((nextStatus) => {
                  const isPrimary = smartAction?.action === nextStatus;
                  return (
                    <DropdownMenuItem
                      key={nextStatus}
                      onClick={() => handleStatusChange(nextStatus)}
                      className="flex items-center justify-between text-xs py-2"
                    >
                      <StatusBadge
                        status={nextStatus}
                        category={category}
                        className="text-xs h-5"
                        showIcon={true}
                      />
                      {isPrimary && (
                        <span className="text-xs text-blue-600 font-medium ml-2">Primary</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          // Show enhanced messaging for terminal statuses
          <div className="flex items-center space-x-1">
            {statusConfig?.isTerminal ? (
              <Badge variant="secondary" className="text-xs h-6 px-2">
                {statusConfig.isSuccessful ? '✓ Complete' : '⚬ Final'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs h-6 px-2">
                No actions
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // Extended view (when not compact)
  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <StatusBadge 
            status={quote.status} 
            category={category}
            className="px-3 py-1"
          />

          {/* Priority Indicator */}
          {statusConfig?.requiresAction && (
            <Badge variant="destructive" className="text-xs px-2 py-0">
              Action Required
            </Badge>
          )}
        </div>

        {/* Quick Actions - Always show smart action + dropdown */}
        <div className="flex items-center space-x-2">
          {canTransition ? (
            // Show transition actions for active statuses
            <div className="flex items-center space-x-2">
              {/* Smart Quick Action Button */}
              {smartAction && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(smartAction.action)}
                  disabled={isUpdating}
                  className="flex items-center space-x-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>{smartAction.text}</span>
                </Button>
              )}

              {/* Always show dropdown for ALL transitions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    className="flex items-center space-x-1"
                  >
                    <span>All Actions</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                    Available Transitions
                  </div>
                  {allowedTransitions.map((nextStatus) => {
                    const isPrimary = smartAction?.action === nextStatus;
                    return (
                      <DropdownMenuItem
                        key={nextStatus}
                        onClick={() => handleStatusChange(nextStatus)}
                        className="flex items-center justify-between py-2"
                      >
                        <StatusBadge
                          status={nextStatus}
                          category={category}
                          className="text-xs h-6"
                          showIcon={true}
                        />
                        {isPrimary && (
                          <span className="text-xs text-blue-600 font-medium ml-2">Primary</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Show informational actions for terminal statuses
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs px-3 py-1">
                {statusConfig?.isTerminal 
                  ? (statusConfig.isSuccessful ? '✓ Completed' : 'Final Status') 
                  : 'No Actions Available'
                }
              </Badge>
              {statusConfig?.customerMessage && (
                <div className="text-xs text-gray-500 italic max-w-48 truncate" title={statusConfig.customerMessage}>
                  "{statusConfig.customerMessage}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{statusConfig?.progressPercentage || 50}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${statusConfig?.progressPercentage || 50}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Timeline (mini) - Dynamic based on category */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {statusConfig?.customerMessage && (
          <div className="text-xs text-gray-600 italic">
            "{statusConfig.customerMessage}"
          </div>
        )}
      </div>
    </div>
  );
};
