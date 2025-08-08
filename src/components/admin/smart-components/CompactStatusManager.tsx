// ============================================================================
// COMPACT STATUS MANAGER - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Inline editing, progress indicators, smart suggestions
// ============================================================================

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ChevronDown, ChevronRight, ArrowRight, Zap } from 'lucide-react';
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
// import { useCart } from '@/hooks/useCart'; // REMOVED - Cart functionality completely removed
import { supabase } from '@/integrations/supabase/client';
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
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const { getStatusConfig, getAllowedTransitions, isValidTransition, orderStatuses } =
    useStatusManagement();
  const { toast } = useToast();
  // const { addItem, removeItem } = useCart(); // REMOVED - Cart functionality completely removed

  // Use optimistic status for immediate UI updates
  const displayStatus = optimisticStatus || quote.status;

  // Reset optimistic status when quote changes (parent refresh)
  React.useEffect(() => {
    setOptimisticStatus(null);
  }, [quote.status]);

  // Determine if this is a quote or order based on dynamic status config
  const isOrderStatus = orderStatuses.some((status) => status.name === displayStatus);
  const category: 'quote' | 'order' = isOrderStatus ? 'order' : 'quote';

  // Get dynamic status config from the management system
  const currentConfig = getStatusConfig(displayStatus, category);
  const allowedTransitions = getAllowedTransitions(displayStatus, category);

  const canTransition = allowedTransitions.length > 0;

  // Fallback to basic config if not found in dynamic system
  const fallbackConfig = {
    label: quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('_', ' '),
    progressPercentage: 50,
    customerActionText: 'View Status',
  };

  const statusConfig = currentConfig || fallbackConfig;

  const handleAction = async (
    action: string,
    actionType: 'cart' | 'status' | 'refresh' = 'status',
    event?: React.MouseEvent,
  ) => {
    // Prevent form submission and event bubbling as safety measures
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsUpdating(true);

    try {
      if (actionType === 'cart' && action === 'add_to_cart') {
        // Handle cart operation
        await handleAddToCart();
        return;
      }

      if (actionType === 'refresh' || action === displayStatus) {
        // Handle refresh action
        toast({
          title: 'Status Refreshed',
          description: `Refreshed ${statusConfig?.label || displayStatus} status`,
          duration: 2000,
        });
        onStatusUpdate(false); // Trigger refresh without database update
        return;
      }

      // Handle status change
      await handleStatusChange(action);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      // Validate quote can be added to cart
      if (displayStatus !== 'approved') {
        toast({
          title: 'Cannot Add to Cart',
          description: 'Only approved quotes can be added to cart',
          variant: 'destructive',
        });
        return;
      }

      // Create cart item from quote
      const cartItem = {
        id: quote.id,
        quoteId: quote.id,
        productName: quote.items?.[0]?.name || 'Product',
        finalTotal: quote.final_total_origincurrency || quote.total_quote_origincurrency || 0,
        quantity: quote.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
        itemWeight:
          quote.items?.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0) ||
          0,
        imageUrl: quote.items?.[0]?.image_url,
        countryCode: quote.destination_country || 'US',
        purchaseCountryCode: quote.origin_country || 'US',
        destinationCountryCode: quote.destination_country || 'US',
        inCart: true,
        isSelected: false,
        createdAt: new Date(quote.created_at),
        updatedAt: new Date(quote.updated_at),
      };

      // Cart functionality removed - would add item to cart here
      // addItem(cartItem); // DISABLED

      // Update quote's in_cart flag in database using direct Supabase call
      // This is more reliable than going through UnifiedDataEngine for this simple update
      const { error: updateError } = await supabase
        .from('quotes_v2')
        .update({
          in_cart: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      const success = !updateError;

      if (success) {
        toast({
          title: 'Added to Cart',
          description: 'Quote successfully added to cart',
        });
        onStatusUpdate(true);
      } else {
        throw new Error('Failed to update quote in database');
      }
    } catch (error) {
      toast({
        title: 'Cart Error',
        description: 'Failed to add quote to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    // Validate transition
    if (!isValidTransition(displayStatus, newStatus, category)) {
      toast({
        title: 'Invalid Transition',
        description: `Cannot transition from ${displayStatus} to ${newStatus}`,
        variant: 'destructive',
      });
      return;
    }

    // Additional business logic validation
    if (newStatus === 'approved' && (!quote.items || quote.items.length === 0)) {
      toast({
        title: 'Cannot Approve',
        description: 'Quote must have items before it can be approved',
        variant: 'destructive',
      });
      return;
    }

    if (newStatus === 'paid' && (quote.final_total_origincurrency || quote.total_quote_origincurrency || 0) <= 0) {
      toast({
        title: 'Cannot Mark as Paid',
        description: 'Quote must have a valid total amount',
        variant: 'destructive',
      });
      return;
    }

    // Optimistic update - immediately update UI
    setOptimisticStatus(newStatus);

    try {
      // Handle cart-related business logic before status update
      if (newStatus === 'rejected' || newStatus === 'expired') {
        // Remove from cart if being rejected/expired
        await handleRemoveFromCart();
      }

      const success = await unifiedDataEngine.updateQuote(quote.id, {
        status: newStatus,
      });

      if (success) {
        // Smart success messaging with business context
        let message = `Status changed to ${newStatus}`;
        if (newStatus === 'pending') {
          message = 'Reset to pending - ready for review';
        } else if (newStatus === 'approved') {
          message = 'Quote approved - ready to add to cart';
        } else if (newStatus === 'rejected') {
          message = 'Quote rejected and removed from cart';
        } else if (newStatus === 'paid') {
          message = 'Payment confirmed - order will be processed';
        } else if (newStatus === 'shipped') {
          message = 'Order shipped - tracking information available';
        }

        toast({
          title: 'Status Updated',
          description: message,
        });

        // Trigger parent component refresh to sync with database
        // Delay to ensure database update is processed and to avoid interrupting optimistic update
        setTimeout(() => {
          // Only refresh if the optimistic status matches what we expect
          // This prevents the refresh from overriding our optimistic state
          if (optimisticStatus === newStatus) {
            onStatusUpdate(true);
          }
        }, 500);
      } else {
        // Revert optimistic update on failure
        setOptimisticStatus(null);
        throw new Error('Failed to update quote status');
      }
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticStatus(null);

      toast({
        title: 'Update Failed',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleRemoveFromCart = async () => {
    try {
      // Cart functionality removed - would remove item from cart here
      // await removeItem(quote.id); // DISABLED
    } catch (error) {
      // Don't throw - this is a side effect, main status update should still proceed
    }
  };

  const getSmartAction = () => {
    // Business-rule-based primary action detection (Industry best practice)
    let primaryAction: string | null = null;
    let actionText: string;
    let actionType: 'cart' | 'status' | 'refresh' = 'status';

    // Define logical next steps based on business rules (Amazon/Stripe pattern)
    switch (displayStatus) {
      case 'pending':
        // For pending quotes, primary action is to send to customer
        primaryAction = allowedTransitions.includes('sent') ? 'sent' : null;
        actionText = 'Send Quote';
        break;

      case 'sent':
        // For sent quotes, primary action is customer approval
        primaryAction = allowedTransitions.includes('approved') ? 'approved' : null;
        actionText = 'Approve Quote';
        break;

      case 'approved':
        // For approved quotes, primary action is add to cart (business action, not status change)
        if (statusConfig?.allowCartActions) {
          primaryAction = 'add_to_cart'; // Special action
          actionText = 'Add to Cart';
          actionType = 'cart';
        } else {
          // Fallback to payment status if cart action not allowed
          primaryAction = allowedTransitions.includes('payment_pending') ? 'payment_pending' : null;
          actionText = 'Request Payment';
        }
        break;

      case 'payment_pending':
        primaryAction = allowedTransitions.includes('paid') ? 'paid' : null;
        actionText = 'Mark as Paid';
        break;

      case 'paid':
        primaryAction = allowedTransitions.includes('ordered') ? 'ordered' : null;
        actionText = 'Create Order';
        break;

      case 'ordered':
        primaryAction = allowedTransitions.includes('shipped') ? 'shipped' : null;
        actionText = 'Mark Shipped';
        break;

      case 'shipped':
        primaryAction = allowedTransitions.includes('completed') ? 'completed' : null;
        actionText = 'Mark Delivered';
        break;

      default:
        // For terminal or unknown statuses, no primary action
        primaryAction = null;
        actionText = 'No Action';
    }

    // If no logical primary action found, fall back to refresh or first valid transition
    if (!primaryAction && allowedTransitions.length > 0) {
      // Exclude self-transitions from primary action unless it's the only option
      const nonSelfTransitions = allowedTransitions.filter((t) => t !== displayStatus);
      if (nonSelfTransitions.length > 0) {
        primaryAction = nonSelfTransitions[0];
        const nextConfig = getStatusConfig(primaryAction, category);
        actionText = nextConfig?.label
          ? `Mark as ${nextConfig.label}`
          : `Change to ${primaryAction}`;
      } else {
        // Only self-transition available - make it a refresh action
        primaryAction = displayStatus;
        actionText = `Refresh ${statusConfig?.label || displayStatus}`;
        actionType = 'refresh';
      }
    }

    if (!primaryAction) return null;

    return {
      text: actionText,
      action: primaryAction,
      actionType,
      icon:
        actionType === 'refresh' ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowRight className="w-3 h-3" />
        ),
    };
  };

  const smartAction = getSmartAction();
  const nextStatus = allowedTransitions[0]; // Primary next action

  if (compact) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-3">
          {/* Component Header */}
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <span>Status Management</span>
            </h4>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Current Status Badge */}
              <StatusBadge status={displayStatus} category={category} className="text-xs" />

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
            </div>

            {/* Smart Action + Dropdown - Always show both when transitions available */}
            {canTransition ? (
              <div className="flex items-center space-x-1">
                {/* Smart Quick Action Button (Primary Action) */}
                {smartAction && (
                  <Button
                    type="button"
                    size="sm"
                    variant={smartAction.actionType === 'cart' ? 'default' : 'outline'}
                    onClick={(e) => handleAction(smartAction.action, smartAction.actionType, e)}
                    disabled={isUpdating}
                    className={`h-7 px-2 text-xs flex items-center space-x-1 font-medium ${
                      smartAction.actionType === 'cart'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : smartAction.actionType === 'refresh'
                          ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    {smartAction.icon}
                    <span>{smartAction.text}</span>
                  </Button>
                )}

                {/* Simple dropdown for other status options - Only show if there are alternatives */}
                {allowedTransitions.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isUpdating}
                        className="h-7 px-2 flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                        title="More status options"
                      >
                        <span className="text-xs">More</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {allowedTransitions
                        .filter((status) => status !== smartAction?.action)
                        .map((nextStatus) => (
                          <DropdownMenuItem
                            key={nextStatus}
                            onClick={(e) => handleAction(nextStatus, 'status', e)}
                            className="text-xs py-2"
                          >
                            <StatusBadge
                              status={nextStatus}
                              category={category}
                              className="text-xs h-5"
                              showIcon={true}
                            />
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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
        </CardContent>
      </Card>
    );
  }

  // Extended view (when not compact)
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-800 mb-3">
          Status Management
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusBadge status={displayStatus} category={category} className="px-3 py-1" />

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
                    type="button"
                    size="sm"
                    variant={smartAction.actionType === 'cart' ? 'default' : 'outline'}
                    onClick={(e) => handleAction(smartAction.action, smartAction.actionType, e)}
                    disabled={isUpdating}
                    className={`flex items-center space-x-1 font-medium ${
                      smartAction.actionType === 'cart'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : smartAction.actionType === 'refresh'
                          ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>{smartAction.text}</span>
                  </Button>
                )}

                {/* Simple dropdown for other status options - Only show if there are alternatives */}
                {allowedTransitions.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        className="flex items-center space-x-1"
                      >
                        <span>More Options</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {allowedTransitions
                        .filter((status) => status !== smartAction?.action)
                        .map((nextStatus) => (
                          <DropdownMenuItem
                            key={nextStatus}
                            onClick={(e) => handleAction(nextStatus, 'status', e)}
                            className="py-2"
                          >
                            <StatusBadge
                              status={nextStatus}
                              category={category}
                              className="text-sm h-6"
                              showIcon={true}
                            />
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              // Show informational actions for terminal statuses
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs px-3 py-1">
                  {statusConfig?.isTerminal
                    ? statusConfig.isSuccessful
                      ? '✓ Completed'
                      : 'Final Status'
                    : 'No Actions Available'}
                </Badge>
                {statusConfig?.customerMessage && (
                  <div
                    className="text-xs text-gray-500 italic max-w-48 truncate"
                    title={statusConfig.customerMessage}
                  >
                    "{statusConfig.customerMessage}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
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
            <div className="text-xs text-gray-600 italic">"{statusConfig.customerMessage}"</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
