import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { captureException } from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: string[];
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  component?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private readonly ERROR_RESET_TIME = 5000; // 5 seconds
  private readonly MAX_ERROR_COUNT = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, component } = this.props;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component:', component || 'Unknown');
    }

    // Send to Sentry
    captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        component: component || 'unknown',
        errorBoundary: true,
      },
    });

    // Update error count
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: timeSinceLastError < this.ERROR_RESET_TIME 
        ? prevState.errorCount + 1 
        : 1,
      lastErrorTime: now,
    }));

    // Call custom error handler
    onError?.(error, errorInfo);

    // Auto-reset after timeout if not too many errors
    if (this.state.errorCount < this.MAX_ERROR_COUNT) {
      this.scheduleReset();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset on prop changes if enabled
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
    
    // Reset on specific key changes
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        key => prevProps[key as keyof Props] !== this.props[key as keyof Props]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  scheduleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, this.ERROR_RESET_TIME);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { fallback, children, isolate, component } = this.props;

    if (hasError && error) {
      // Too many errors - show permanent error state
      if (errorCount >= this.MAX_ERROR_COUNT) {
        return (
          <div className="min-h-[400px] flex items-center justify-center p-8">
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <CardTitle>Critical Error</CardTitle>
                </div>
                <CardDescription>
                  This component has encountered multiple errors and cannot recover automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Details</AlertTitle>
                  <AlertDescription className="mt-2">
                    <code className="text-xs">{error.message}</code>
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button onClick={() => window.location.reload()} variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button onClick={() => window.location.href = '/'} variant="outline">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Custom fallback
      if (fallback) {
        return <>{fallback}</>;
      }

      // Isolated error - minimal UI impact
      if (isolate) {
        return (
          <Alert variant="destructive" className="m-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Component Error</AlertTitle>
            <AlertDescription>
              {component || 'This component'} encountered an error. It will retry in a few seconds.
            </AlertDescription>
          </Alert>
        );
      }

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Something went wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred. The component will automatically retry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert>
                  <AlertDescription className="text-xs font-mono">
                    {error.message}
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={this.resetErrorBoundary} 
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// HOC for easy component wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}