/**
 * Standard Loading Pattern - Unified loading states and indicators
 * 
 * Provides consistent loading experiences across the application
 * with intelligent skeleton loading, progress indicators, and state management
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Zap,
  TrendingUp,
  Database,
  Upload,
  Download
} from 'lucide-react';

// Loading state types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'timeout';

export interface LoadingConfig {
  variant?: 'spinner' | 'skeleton' | 'progress' | 'pulse' | 'custom';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showProgress?: boolean;
  showElapsedTime?: boolean;
  minimumLoadTime?: number; // Prevent flashing
  timeout?: number; // Auto-fail after timeout
  retryable?: boolean;
  fullScreen?: boolean;
  overlay?: boolean;
}

export interface StandardLoadingProps {
  // Core state
  isLoading: boolean;
  loadingState?: LoadingState;
  children: ReactNode;
  
  // Configuration
  config?: LoadingConfig;
  
  // Labels and messages
  loadingText?: string;
  successText?: string;
  errorText?: string;
  timeoutText?: string;
  
  // Progress (0-100)
  progress?: number;
  progressLabel?: string;
  
  // Custom loading content
  loadingContent?: ReactNode;
  
  // Event handlers
  onRetry?: () => void;
  onTimeout?: () => void;
  onStateChange?: (state: LoadingState) => void;
  
  // Performance
  fallback?: ReactNode; // Shown immediately while skeleton loads
}

export const StandardLoading: React.FC<StandardLoadingProps> = ({
  isLoading,
  loadingState = 'loading',
  children,
  config = {},
  loadingText = 'Loading...',
  successText = 'Success!',
  errorText = 'An error occurred',
  timeoutText = 'Request timed out',
  progress,
  progressLabel,
  loadingContent,
  onRetry,
  onTimeout,
  onStateChange,
  fallback,
}) => {
  const {
    variant = 'skeleton',
    size = 'md',
    showLabel = true,
    showProgress = false,
    showElapsedTime = false,
    minimumLoadTime = 300,
    timeout = 30000,
    retryable = true,
    fullScreen = false,
    overlay = false,
  } = config;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [showContent, setShowContent] = useState(!isLoading);
  const [currentState, setCurrentState] = useState<LoadingState>(loadingState);

  // Handle minimum load time to prevent flashing
  useEffect(() => {
    if (isLoading) {
      setShowContent(false);
      const timer = setTimeout(() => {
        if (!isLoading) setShowContent(true);
      }, minimumLoadTime);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minimumLoadTime]);

  // Handle timeout
  useEffect(() => {
    if (isLoading && timeout > 0) {
      const timeoutTimer = setTimeout(() => {
        setCurrentState('timeout');
        if (onTimeout) onTimeout();
      }, timeout);
      return () => clearTimeout(timeoutTimer);
    }
  }, [isLoading, timeout, onTimeout]);

  // Track elapsed time
  useEffect(() => {
    if (isLoading && showElapsedTime) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1000);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [isLoading, showElapsedTime]);

  // Handle state changes
  useEffect(() => {
    setCurrentState(loadingState);
    if (onStateChange) onStateChange(loadingState);
  }, [loadingState, onStateChange]);

  // Format elapsed time
  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Render loading indicator based on variant
  const renderLoadingIndicator = () => {
    if (loadingContent) return loadingContent;

    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    };

    switch (variant) {
      case 'spinner':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
            {showLabel && <p className="text-sm text-muted-foreground">{loadingText}</p>}
            {showElapsedTime && elapsedTime > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatElapsedTime(elapsedTime)}
              </p>
            )}
          </div>
        );

      case 'progress':
        return (
          <div className="space-y-4 w-full max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progressLabel || loadingText}</span>
              {progress !== undefined && (
                <span className="text-sm text-muted-foreground">{progress}%</span>
              )}
            </div>
            <Progress value={progress} className="w-full" />
            {showElapsedTime && elapsedTime > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {formatElapsedTime(elapsedTime)}
              </p>
            )}
          </div>
        );

      case 'pulse':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className={`${sizeClasses[size]} bg-primary rounded-full animate-pulse`} />
            {showLabel && <p className="text-sm text-muted-foreground">{loadingText}</p>}
          </div>
        );

      case 'skeleton':
        return <StandardSkeleton variant="default" />;

      default:
        return (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {showLabel && <span className="text-sm">{loadingText}</span>}
          </div>
        );
    }
  };

  // Render state-specific content
  const renderStateContent = () => {
    switch (currentState) {
      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <p className="text-sm text-green-700">{successText}</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <p className="text-sm text-red-700">{errorText}</p>
            {retryable && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        );

      case 'timeout':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Clock className="w-8 h-8 text-yellow-600" />
            <p className="text-sm text-yellow-700">{timeoutText}</p>
            {retryable && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        );

      case 'loading':
        return renderLoadingIndicator();

      default:
        return null;
    }
  };

  // Handle full screen loading
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-4 p-8">
          {renderStateContent()}
        </div>
      </div>
    );
  }

  // Handle overlay loading
  if (overlay) {
    return (
      <div className="relative">
        {children}
        {(isLoading || !showContent) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
            {renderStateContent()}
          </div>
        )}
      </div>
    );
  }

  // Handle standard loading
  if (!showContent || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {renderStateContent()}
      </div>
    );
  }

  return <>{children}</>;
};

// Skeleton loading patterns
interface SkeletonProps {
  variant?: 'default' | 'form' | 'card' | 'table' | 'list' | 'custom';
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  children?: ReactNode;
}

export const StandardSkeleton: React.FC<SkeletonProps> = ({
  variant = 'default',
  className,
  lines = 3,
  showAvatar = false,
  children,
}) => {
  if (children) return <>{children}</>;

  switch (variant) {
    case 'form':
      return (
        <div className={`space-y-4 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      );

    case 'card':
      return (
        <Card className={className}>
          <CardHeader>
            <div className="flex items-center space-x-4">
              {showAvatar && <Skeleton className="h-12 w-12 rounded-full" />}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case 'table':
      return (
        <div className={`space-y-3 ${className}`}>
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );

    case 'list':
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              {showAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      );
  }
};

// Specialized loading components
export const PageLoading: React.FC<{ title?: string; description?: string }> = ({
  title = "Loading page...",
  description = "Please wait while we load the content",
}) => (
  <StandardLoading
    isLoading={true}
    config={{ fullScreen: true, variant: 'spinner', size: 'lg' }}
    loadingText={title}
  >
    <div className="text-center mt-4">
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </StandardLoading>
);

export const DataLoading: React.FC<{ 
  children: ReactNode; 
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
}> = ({ children, isLoading, error, onRetry }) => (
  <StandardLoading
    isLoading={isLoading}
    loadingState={error ? 'error' : 'loading'}
    config={{ variant: 'skeleton', overlay: true }}
    errorText={error}
    onRetry={onRetry}
  >
    {children}
  </StandardLoading>
);

export const ProgressLoading: React.FC<{
  progress: number;
  label: string;
  onCancel?: () => void;
}> = ({ progress, label, onCancel }) => (
  <StandardLoading
    isLoading={true}
    config={{ 
      variant: 'progress', 
      showProgress: true,
      showElapsedTime: true,
    }}
    progress={progress}
    progressLabel={label}
  >
    <div className="flex justify-end mt-4">
      {onCancel && (
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  </StandardLoading>
);

// Loading state hook
export function useLoadingState(initialState: LoadingState = 'idle') {
  const [state, setState] = useState<LoadingState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const startLoading = () => {
    setState('loading');
    setError(null);
    setStartTime(Date.now());
  };

  const finishLoading = (success: boolean = true, errorMessage?: string) => {
    setState(success ? 'success' : 'error');
    if (!success && errorMessage) {
      setError(errorMessage);
    }
    setStartTime(null);
  };

  const reset = () => {
    setState('idle');
    setError(null);
    setStartTime(null);
  };

  const elapsedTime = startTime ? Date.now() - startTime : 0;

  return {
    state,
    error,
    elapsedTime,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    startLoading,
    finishLoading,
    reset,
  };
}