/**
 * Simple Cart Sync Indicator - For enhanced original cart system
 * 
 * Shows cart sync status with simple visual indicators
 */

import React from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EnhancedSyncStatus } from '@/stores/cartStore';

interface SimpleCartSyncIndicatorProps {
  status: EnhancedSyncStatus;
  lastSync?: Date | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SimpleCartSyncIndicator: React.FC<SimpleCartSyncIndicatorProps> = ({
  status,
  lastSync = null,
  className = '',
  size = 'sm'
}) => {
  
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'Synced',
          description: 'Cart is synced with server'
        };
      case 'syncing':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'Syncing',
          description: 'Syncing cart with server...'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'Error',
          description: 'Cart sync failed - will retry automatically'
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'Offline',
          description: 'Working offline - changes will sync when connected'
        };
      case 'guest':
        return {
          icon: Wifi,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'Guest',
          description: 'Guest cart - sign in to sync across devices'
        };
      case 'recovery':
        return {
          icon: Clock,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'Recovering',
          description: 'Recovering cart from previous session...'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'Unknown',
          description: 'Unknown sync status'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';

  const formatLastSync = () => {
    if (!lastSync) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    return `${Math.floor(diffSecs / 3600)}h ago`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`
              ${config.bg} ${config.border} ${config.color} 
              flex items-center gap-1 cursor-help
              ${className}
            `}
          >
            <Icon className={iconSize} />
            <span className={textSize}>{config.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p>{config.description}</p>
            {lastSync && status === 'synced' && (
              <p className="text-xs text-gray-500 mt-1">
                Last sync: {formatLastSync()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SimpleCartSyncIndicator;