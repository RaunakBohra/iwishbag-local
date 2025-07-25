import React, { useMemo, useCallback, memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  ShoppingCart,
  Eye,
  Edit,
  Send,
  Download,
  Share2,
  Copy,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Heart,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  RefreshCw,
  Trash2,
  Archive,
  FileText,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuoteTheme, useConversionColors } from '@/contexts/QuoteThemeContext';
import { useColorVariantTesting } from '@/hooks/useColorVariantTesting';
import type { UnifiedQuote } from '@/types/unified-quote';

// Rate limiting and throttling
interface RateLimitState {
  [actionType: string]: {
    lastExecuted: number;
    attempts: number;
    cooldownUntil?: number;
  };
}

const RATE_LIMITS = {
  approve: { maxAttempts: 3, windowMs: 60000, cooldownMs: 30000 },
  reject: { maxAttempts: 3, windowMs: 60000, cooldownMs: 30000 },
  'add-to-cart': { maxAttempts: 5, windowMs: 60000, cooldownMs: 10000 },
  'remove-from-cart': { maxAttempts: 5, windowMs: 60000, cooldownMs: 5000 },
  send: { maxAttempts: 2, windowMs: 300000, cooldownMs: 60000 }, // 2 sends per 5 min
  duplicate: { maxAttempts: 3, windowMs: 300000, cooldownMs: 60000 },
  delete: { maxAttempts: 1, windowMs: 300000, cooldownMs: 300000 }, // Very restrictive
  share: { maxAttempts: 10, windowMs: 60000, cooldownMs: 5000 },
  download: { maxAttempts: 10, windowMs: 60000, cooldownMs: 2000 },
  contact: { maxAttempts: 3, windowMs: 300000, cooldownMs: 60000 },
};

class RateLimiter {
  private state: RateLimitState = {};

  canExecute(actionType: string, userId: string): boolean {
    const key = `${actionType}_${userId}`;
    const limit = RATE_LIMITS[actionType as keyof typeof RATE_LIMITS];

    if (!limit) return true; // No limit defined

    const now = Date.now();
    const userState = this.state[key];

    if (!userState) {
      this.state[key] = { lastExecuted: now, attempts: 1 };
      return true;
    }

    // Check if we're in cooldown
    if (userState.cooldownUntil && now < userState.cooldownUntil) {
      return false;
    }

    // Reset attempts if window has passed
    if (now - userState.lastExecuted > limit.windowMs) {
      userState.attempts = 0;
    }

    // Check if we've exceeded attempts
    if (userState.attempts >= limit.maxAttempts) {
      userState.cooldownUntil = now + limit.cooldownMs;
      return false;
    }

    // Allow execution
    userState.attempts += 1;
    userState.lastExecuted = now;
    return true;
  }

  getRemainingCooldown(actionType: string, userId: string): number {
    const key = `${actionType}_${userId}`;
    const userState = this.state[key];

    if (!userState?.cooldownUntil) return 0;

    const remaining = userState.cooldownUntil - Date.now();
    return Math.max(0, remaining);
  }
}

const rateLimiter = new RateLimiter();

// Optimistic update state
interface OptimisticState {
  isUpdating: boolean;
  pendingAction: string | null;
  originalStatus?: string;
  optimisticStatus?: string;
  error?: string;
}

// Performance monitoring
interface ActionPerformanceMetrics {
  actionType: string;
  executionTime: number;
  success: boolean;
  rateLimited: boolean;
  optimistic: boolean;
  userType: 'admin' | 'customer' | 'guest';
  componentId: string;
}

const logActionPerformance = (metrics: ActionPerformanceMetrics) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('⚡ UnifiedQuoteActions Performance:', metrics);
  }

  // Send to analytics service in production
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'quote_action_performance', {
      action_type: metrics.actionType,
      execution_time: metrics.executionTime,
      success: metrics.success,
      rate_limited: metrics.rateLimited,
      optimistic: metrics.optimistic,
      user_type: metrics.userType,
      component_id: metrics.componentId,
    });
  }
};

// Action configuration based on quote status and user type
interface ActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost';
  color?: string;
  disabled?: boolean;
  hidden?: boolean;
  requiresConfirmation?: boolean;
  optimisticUpdate?: boolean;
  category: 'primary' | 'secondary' | 'tertiary';
  hotkey?: string;
  tooltip?: string;
}

const getAvailableActions = (
  quote: UnifiedQuote,
  viewMode: 'admin' | 'customer' | 'guest',
  conversionColors: any,
): ActionConfig[] => {
  const actions: ActionConfig[] = [];

  // Customer/Guest actions
  if (viewMode !== 'admin') {
    switch (quote.status) {
      case 'sent':
        actions.push(
          {
            id: 'approve',
            label: 'Approve Quote',
            icon: <CheckCircle className="h-4 w-4" />,
            variant: 'default',
            color: conversionColors.approveButton,
            category: 'primary',
            optimisticUpdate: true,
            hotkey: 'A',
            tooltip: 'Approve this quote to proceed',
          },
          {
            id: 'reject',
            label: 'Reject',
            icon: <XCircle className="h-4 w-4" />,
            variant: 'outline',
            category: 'secondary',
            requiresConfirmation: true,
            optimisticUpdate: true,
          },
        );
        break;

      case 'approved':
        actions.push({
          id: 'add-to-cart',
          label: 'Add to Cart',
          icon: <ShoppingCart className="h-4 w-4" />,
          variant: 'default',
          color: conversionColors.addToCartButton,
          category: 'primary',
          optimisticUpdate: true,
          hotkey: 'C',
          tooltip: 'Add this approved quote to your cart',
        });
        break;

      case 'paid':
        actions.push({
          id: 'track-order',
          label: 'Track Order',
          icon: <Eye className="h-4 w-4" />,
          variant: 'outline',
          category: 'primary',
          hotkey: 'T',
          tooltip: 'Track your order status',
        });
        break;
    }

    // Common customer actions
    actions.push(
      {
        id: 'view-details',
        label: 'View Details',
        icon: <Eye className="h-4 w-4" />,
        variant: 'outline',
        category: 'secondary',
      },
      {
        id: 'download',
        label: 'Download',
        icon: <Download className="h-4 w-4" />,
        variant: 'ghost',
        category: 'tertiary',
      },
    );

    if (viewMode === 'customer') {
      actions.push(
        {
          id: 'contact-support',
          label: 'Contact Support',
          icon: <MessageSquare className="h-4 w-4" />,
          variant: 'ghost',
          category: 'tertiary',
        },
        {
          id: 'share',
          label: 'Share',
          icon: <Share2 className="h-4 w-4" />,
          variant: 'ghost',
          category: 'tertiary',
        },
      );
    }
  } else {
    // Admin actions
    actions.push(
      {
        id: 'edit',
        label: 'Edit Quote',
        icon: <Edit className="h-4 w-4" />,
        variant: 'outline',
        category: 'primary',
      },
      {
        id: 'send',
        label: quote.status === 'pending' ? 'Send Quote' : 'Resend Quote',
        icon: <Send className="h-4 w-4" />,
        variant: 'default',
        category: 'primary',
        optimisticUpdate: true,
        disabled: quote.status === 'sent',
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: <Copy className="h-4 w-4" />,
        variant: 'outline',
        category: 'secondary',
      },
      {
        id: 'contact-customer',
        label: 'Contact Customer',
        icon: <Phone className="h-4 w-4" />,
        variant: 'outline',
        category: 'secondary',
      },
      {
        id: 'archive',
        label: 'Archive',
        icon: <Archive className="h-4 w-4" />,
        variant: 'ghost',
        category: 'tertiary',
      },
    );

    // Status-specific admin actions
    if (quote.status === 'approved') {
      actions.push({
        id: 'mark-paid',
        label: 'Mark as Paid',
        icon: <CreditCard className="h-4 w-4" />,
        variant: 'default',
        category: 'primary',
        optimisticUpdate: true,
      });
    }

    // Destructive actions
    if (quote.status === 'pending' || quote.status === 'rejected') {
      actions.push({
        id: 'delete',
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
        category: 'tertiary',
        requiresConfirmation: true,
      });
    }
  }

  return actions;
};

interface UnifiedQuoteActionsProps {
  quote: UnifiedQuote;
  viewMode: 'admin' | 'customer' | 'guest';

  // Layout options
  layout: 'horizontal' | 'vertical' | 'grid' | 'dropdown';
  size: 'sm' | 'md' | 'lg';
  maxActions?: number;

  // Behavior options
  enableOptimisticUpdates?: boolean;
  enableRateLimiting?: boolean;
  enableHotkeys?: boolean;

  // Event handlers
  onAction?: (action: string, quote: UnifiedQuote, optimistic?: boolean) => Promise<any>;
  onActionStart?: (action: string, quote: UnifiedQuote) => void;
  onActionComplete?: (action: string, quote: UnifiedQuote, result: any) => void;
  onActionError?: (action: string, quote: UnifiedQuote, error: Error) => void;

  // Performance & Security
  userId?: string;
  performanceMode?: 'fast' | 'detailed';
  securityLevel?: 'public' | 'private' | 'admin';

  // Styling
  className?: string;
  actionClassName?: string;

  // Cultural theming
  culturalTheme?: 'india' | 'nepal' | 'international';
}

/**
 * UnifiedQuoteActions - Comprehensive action buttons for quotes
 * Context-aware with rate limiting, optimistic updates, and analytics
 */
export const UnifiedQuoteActions = memo<UnifiedQuoteActionsProps>(
  ({
    quote,
    viewMode,
    layout = 'horizontal',
    size = 'md',
    maxActions = 6,
    enableOptimisticUpdates = true,
    enableRateLimiting = true,
    enableHotkeys = true,
    onAction,
    onActionStart,
    onActionComplete,
    onActionError,
    userId = 'anonymous',
    performanceMode = 'detailed',
    securityLevel = 'private',
    className,
    actionClassName,
    culturalTheme = 'international',
  }) => {
    const startTime = performance.now();

    // Theme and color context
    const { colors, userType } = useQuoteTheme();
    const conversionColors = useConversionColors();
    const { variant, trackConversion } = useColorVariantTesting();

    // Component state
    const [optimisticState, setOptimisticState] = useState<OptimisticState>({
      isUpdating: false,
      pendingAction: null,
    });
    const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

    // Get available actions based on quote status and user type
    const availableActions = useMemo(() => {
      return getAvailableActions(quote, viewMode, conversionColors);
    }, [quote, viewMode, conversionColors]);

    // Filter and limit actions
    const displayedActions = useMemo(() => {
      const primary = availableActions.filter((a) => a.category === 'primary' && !a.hidden);
      const secondary = availableActions.filter((a) => a.category === 'secondary' && !a.hidden);
      const tertiary = availableActions.filter((a) => a.category === 'tertiary' && !a.hidden);

      const total = [...primary, ...secondary, ...tertiary];
      return total.slice(0, maxActions);
    }, [availableActions, maxActions]);

    // Handle cooldown updates
    React.useEffect(() => {
      const intervals: NodeJS.Timeout[] = [];

      Object.keys(cooldowns).forEach((actionType) => {
        if (cooldowns[actionType] > 0) {
          const interval = setInterval(() => {
            const remaining = rateLimiter.getRemainingCooldown(actionType, userId);
            if (remaining <= 0) {
              setCooldowns((prev) => ({ ...prev, [actionType]: 0 }));
              clearInterval(interval);
            } else {
              setCooldowns((prev) => ({ ...prev, [actionType]: remaining }));
            }
          }, 1000);
          intervals.push(interval);
        }
      });

      return () => intervals.forEach(clearInterval);
    }, [cooldowns, userId]);

    // Handle hotkeys
    React.useEffect(() => {
      if (!enableHotkeys || viewMode === 'guest') return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        const action = displayedActions.find(
          (a) => a.hotkey?.toLowerCase() === event.key.toLowerCase(),
        );

        if (action && !action.disabled) {
          event.preventDefault();
          handleActionClick(action.id);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [displayedActions, enableHotkeys, viewMode]);

    // Action execution handler
    const handleActionClick = useCallback(
      async (actionId: string) => {
        const actionStartTime = performance.now();
        const action = displayedActions.find((a) => a.id === actionId);

        if (!action || action.disabled) return;

        // Rate limiting check
        if (enableRateLimiting && !rateLimiter.canExecute(actionId, userId)) {
          const cooldownTime = rateLimiter.getRemainingCooldown(actionId, userId);
          setCooldowns((prev) => ({ ...prev, [actionId]: cooldownTime }));

          logActionPerformance({
            actionType: actionId,
            executionTime: performance.now() - actionStartTime,
            success: false,
            rateLimited: true,
            optimistic: false,
            userType,
            componentId: quote.id,
          });

          return;
        }

        // Confirmation dialog for destructive actions
        if (action.requiresConfirmation) {
          const confirmed = window.confirm(
            `Are you sure you want to ${action.label.toLowerCase()}?`,
          );
          if (!confirmed) return;
        }

        // Start action
        onActionStart?.(actionId, quote);

        // Optimistic update
        if (enableOptimisticUpdates && action.optimisticUpdate) {
          setOptimisticState({
            isUpdating: true,
            pendingAction: actionId,
            originalStatus: quote.status,
            optimisticStatus: getOptimisticStatus(actionId, quote.status),
          });
        }

        try {
          // Execute action
          const result = await onAction?.(actionId, quote, action.optimisticUpdate);

          // Track successful conversion
          trackConversion(`action_${actionId}`, 1);

          // Complete action
          onActionComplete?.(actionId, quote, result);

          logActionPerformance({
            actionType: actionId,
            executionTime: performance.now() - actionStartTime,
            success: true,
            rateLimited: false,
            optimistic: !!action.optimisticUpdate,
            userType,
            componentId: quote.id,
          });
        } catch (error) {
          console.error(`Action ${actionId} failed:`, error);

          // Revert optimistic update
          if (optimisticState.isUpdating) {
            setOptimisticState((prev) => ({
              ...prev,
              error: error instanceof Error ? error.message : 'Action failed',
            }));

            // Auto-revert after 3 seconds
            setTimeout(() => {
              setOptimisticState({
                isUpdating: false,
                pendingAction: null,
              });
            }, 3000);
          }

          onActionError?.(
            actionId,
            quote,
            error instanceof Error ? error : new Error(String(error)),
          );

          logActionPerformance({
            actionType: actionId,
            executionTime: performance.now() - actionStartTime,
            success: false,
            rateLimited: false,
            optimistic: !!action.optimisticUpdate,
            userType,
            componentId: quote.id,
          });
        } finally {
          if (!optimisticState.error) {
            setOptimisticState({
              isUpdating: false,
              pendingAction: null,
            });
          }
        }
      },
      [
        displayedActions,
        enableRateLimiting,
        enableOptimisticUpdates,
        userId,
        onAction,
        onActionStart,
        onActionComplete,
        onActionError,
        quote,
        trackConversion,
        userType,
        optimisticState,
      ],
    );

    // Get optimistic status based on action
    const getOptimisticStatus = (actionId: string, currentStatus: string): string => {
      switch (actionId) {
        case 'approve':
          return 'approved';
        case 'reject':
          return 'rejected';
        case 'send':
          return 'sent';
        case 'mark-paid':
          return 'paid';
        case 'add-to-cart':
          return currentStatus; // No status change
        default:
          return currentStatus;
      }
    };

    // Render action button
    const renderActionButton = (action: ActionConfig, index: number) => {
      const isLoading = optimisticState.pendingAction === action.id;
      const cooldownTime = cooldowns[action.id] || 0;
      const isDisabled = action.disabled || cooldownTime > 0 || isLoading;

      return (
        <Button
          key={action.id}
          variant={action.variant}
          size={size}
          disabled={isDisabled}
          onClick={() => handleActionClick(action.id)}
          className={cn(
            'transition-all duration-200',
            action.category === 'primary' && 'shadow-sm hover:shadow-md',
            actionClassName,
          )}
          style={{
            backgroundColor: action.color && !isDisabled ? action.color : undefined,
            color: action.color && !isDisabled ? 'white' : undefined,
          }}
          title={action.tooltip || `${action.label}${action.hotkey ? ` (${action.hotkey})` : ''}`}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : action.icon}
          <span
            className={cn(
              layout === 'vertical' || size === 'lg' ? 'ml-2' : 'ml-1 hidden sm:inline',
            )}
          >
            {action.label}
          </span>

          {cooldownTime > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {Math.ceil(cooldownTime / 1000)}s
            </Badge>
          )}

          {action.hotkey && size === 'lg' && (
            <Badge variant="outline" className="ml-2 text-xs">
              {action.hotkey}
            </Badge>
          )}
        </Button>
      );
    };

    // Performance monitoring
    React.useEffect(() => {
      if (performanceMode === 'detailed') {
        const renderTime = performance.now() - startTime;

        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'component_performance', {
            component: 'UnifiedQuoteActions',
            render_time: renderTime,
            user_type: userType,
            action_count: displayedActions.length,
            layout: layout,
          });
        }
      }
    }, [userType, displayedActions.length, layout, performanceMode, startTime]);

    // Error state
    if (optimisticState.error) {
      return (
        <div
          className={cn(
            'flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg',
            className,
          )}
        >
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{optimisticState.error}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOptimisticState({ isUpdating: false, pendingAction: null })}
            className="ml-auto text-red-600 hover:bg-red-100"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    // Layout rendering
    const containerClassName = cn(
      'quote-actions',
      `quote-actions--${viewMode}`,
      `quote-actions--${layout}`,
      `color-variant-${variant}`,
      {
        'flex items-center gap-2': layout === 'horizontal',
        'flex flex-col gap-2': layout === 'vertical',
        'grid grid-cols-2 gap-2': layout === 'grid',
        relative: layout === 'dropdown',
      },
      className,
    );

    return (
      <div className={containerClassName}>
        {displayedActions.map((action, index) => renderActionButton(action, index))}

        {optimisticState.isUpdating && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
          </div>
        )}
      </div>
    );
  },
);

UnifiedQuoteActions.displayName = 'UnifiedQuoteActions';

export default UnifiedQuoteActions;
