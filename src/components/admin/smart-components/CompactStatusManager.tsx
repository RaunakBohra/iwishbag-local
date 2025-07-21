// ============================================================================
// COMPACT STATUS MANAGER - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Inline editing, progress indicators, smart suggestions
// ============================================================================

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  DollarSign,
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
import type { UnifiedQuote } from '@/types/unified-quote';

interface CompactStatusManagerProps {
  quote: UnifiedQuote;
  onStatusUpdate: () => void;
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

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="w-3 h-3" />,
        nextActions: ['sent'],
        priority: 'medium',
        progress: 10,
      },
      sent: {
        label: 'Sent',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Package className="w-3 h-3" />,
        nextActions: ['approved', 'rejected'],
        priority: 'high',
        progress: 25,
      },
      approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />,
        nextActions: ['paid'],
        priority: 'high',
        progress: 50,
      },
      rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertTriangle className="w-3 h-3" />,
        nextActions: ['pending'],
        priority: 'low',
        progress: 0,
      },
      paid: {
        label: 'Paid',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <DollarSign className="w-3 h-3" />,
        nextActions: ['ordered'],
        priority: 'high',
        progress: 75,
      },
      ordered: {
        label: 'Ordered',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Package className="w-3 h-3" />,
        nextActions: ['shipped'],
        priority: 'medium',
        progress: 85,
      },
      shipped: {
        label: 'Shipped',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Truck className="w-3 h-3" />,
        nextActions: ['completed'],
        priority: 'medium',
        progress: 95,
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />,
        nextActions: [],
        priority: 'low',
        progress: 100,
      },
    };

    return configs[status as keyof typeof configs] || configs.pending;
  };

  const currentConfig = getStatusConfig(quote.status);
  const canTransition = currentConfig.nextActions.length > 0;

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      // Here you would call the unifiedDataEngine to update status
      // await unifiedDataEngine.updateQuote(quote.id, { status: newStatus });
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getSmartAction = () => {
    const actions = {
      pending: { text: 'Send Quote', action: 'sent', icon: <ArrowRight className="w-3 h-3" /> },
      sent: {
        text: 'Mark Approved',
        action: 'approved',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      approved: { text: 'Mark Paid', action: 'paid', icon: <DollarSign className="w-3 h-3" /> },
      paid: { text: 'Place Order', action: 'ordered', icon: <Package className="w-3 h-3" /> },
      ordered: { text: 'Mark Shipped', action: 'shipped', icon: <Truck className="w-3 h-3" /> },
      shipped: { text: 'Complete', action: 'completed', icon: <CheckCircle className="w-3 h-3" /> },
    };

    return actions[quote.status as keyof typeof actions];
  };

  const smartAction = getSmartAction();
  const nextStatus = currentConfig.nextActions[0]; // Primary next action

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {/* Current Status Badge */}
        <Badge className={`flex items-center space-x-1 border ${currentConfig.color}`}>
          {currentConfig.icon}
          <span className="text-xs">{currentConfig.label}</span>
        </Badge>

        {/* Progress Bar (if enabled) */}
        {showProgress && (
          <div className="flex-1 max-w-16">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${currentConfig.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Action or Status Dropdown */}
        {canTransition &&
          (smartAction && nextStatus ? (
            // Smart Quick Action Button
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
          ) : (
            // Dropdown for multiple options
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  className="h-7 px-2 text-xs flex items-center space-x-1"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {currentConfig.nextActions.map((nextStatus) => {
                  const nextConfig = getStatusConfig(nextStatus);
                  return (
                    <DropdownMenuItem
                      key={nextStatus}
                      onClick={() => handleStatusChange(nextStatus)}
                      className="flex items-center space-x-2 text-xs"
                    >
                      <div className={`p-1 rounded-full ${nextConfig.color}`}>
                        {nextConfig.icon}
                      </div>
                      <span>{nextConfig.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
      </div>
    );
  }

  // Extended view (when not compact)
  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Badge className={`flex items-center space-x-2 border px-3 py-1 ${currentConfig.color}`}>
            {currentConfig.icon}
            <span>{currentConfig.label}</span>
          </Badge>

          {/* Priority Indicator */}
          {currentConfig.priority === 'high' && (
            <Badge variant="destructive" className="text-xs px-2 py-0">
              High Priority
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
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

          {canTransition && currentConfig.nextActions.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  className="flex items-center space-x-1"
                >
                  <span>More Actions</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {currentConfig.nextActions.map((nextStatus) => {
                  const nextConfig = getStatusConfig(nextStatus);
                  return (
                    <DropdownMenuItem
                      key={nextStatus}
                      onClick={() => handleStatusChange(nextStatus)}
                      className="flex items-center space-x-2"
                    >
                      <div className={`p-1 rounded-full ${nextConfig.color}`}>
                        {nextConfig.icon}
                      </div>
                      <span>{nextConfig.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{currentConfig.progress}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${currentConfig.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Timeline (mini) */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {['pending', 'sent', 'approved', 'paid', 'completed'].map((status, index) => {
          const config = getStatusConfig(status);
          const isActive = status === quote.status;
          const isPast = config.progress < currentConfig.progress;

          return (
            <div key={status} className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isActive
                    ? config.color
                    : isPast
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {config.icon}
              </div>
              {index < 4 && <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
