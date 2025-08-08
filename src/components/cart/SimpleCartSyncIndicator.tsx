/**
 * Simple Cart Sync Indicator - For enhanced original cart system
 * 
 * Shows cart sync status with simple visual indicators
 */

import React from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  WifiOff, 
  Users, 
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EnhancedSyncStatus } from '@/stores/cartStore';

// Status configurations
const STATUS_CONFIG: Record<EnhancedSyncStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  pulse?: boolean;
}> = {
  synced: {
    icon: CheckCircle,
    label: 'Synced',
    color: 'text-green-600',
    badgeVariant: 'default',
    pulse: false
  },
  syncing: {
    icon: Loader2,
    label: 'Syncing',
    color: 'text-blue-600',
    badgeVariant: 'secondary',
    pulse: true
  },
  offline: {
    icon: WifiOff,
    label: 'Offline',
    color: 'text-orange-600',
    badgeVariant: 'outline',
    pulse: false
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    color: 'text-red-600',
    badgeVariant: 'destructive',
    pulse: false
  },
  guest: {
    icon: Users,
    label: 'Guest',
    color: 'text-gray-600',
    badgeVariant: 'secondary',
    pulse: false
  },
  recovery: {
    icon: Clock,
    label: 'Recovered',
    color: 'text-blue-600',
    badgeVariant: 'secondary',
    pulse: false
  }
};

interface SimpleCartSyncIndicatorProps {
  syncStatus: EnhancedSyncStatus;
  recoveredFromSession?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function SimpleCartSyncIndicator({ 
  syncStatus, 
  recoveredFromSession = false,
  className,
  showLabel = true
}: SimpleCartSyncIndicatorProps) {
  const config = STATUS_CONFIG[syncStatus];
  const Icon = config.icon;

  // Show recovery status if cart was recovered
  const displayStatus = recoveredFromSession && syncStatus === 'synced' ? 'recovery' : syncStatus;
  const displayConfig = recoveredFromSession && syncStatus === 'synced' ? STATUS_CONFIG.recovery : config;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon
        className={cn(
          "h-4 w-4",
          displayConfig.color,
          displayConfig.pulse && "animate-spin"
        )}
      />
      
      {showLabel && (
        <Badge variant={displayConfig.badgeVariant} className="text-xs">
          {displayConfig.label}
        </Badge>
      )}
    </div>
  );
}