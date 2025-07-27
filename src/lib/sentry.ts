import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

// Initialize Sentry only in production
export const initSentry = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        // React Router integration
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
        // Replay integration for session recording on errors
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          // Only record sessions when errors occur
          sessionSampleRate: 0,
          errorSampleRate: 1.0,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Filter out known non-errors
      beforeSend(event, hint) {
        // Filter out non-error console logs
        if (event.level === 'log') {
          return null;
        }
        
        // Filter out network errors that are expected
        const error = hint.originalException;
        if (error && error instanceof Error) {
          // Ignore Supabase auth refresh errors
          if (error.message?.includes('Auth session missing')) {
            return null;
          }
          // Ignore canceled requests
          if (error.message?.includes('aborted')) {
            return null;
          }
        }
        
        // Add user context if available
        const user = getCurrentUser();
        if (user) {
          event.user = {
            id: user.id,
            email: user.email,
            username: user.role,
          };
        }
        
        return event;
      },
      
      // Ignore common errors
      ignoreErrors: [
        // Browser extensions
        'chrome-extension://',
        'moz-extension://',
        // Common non-errors
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed',
        // Network errors
        'NetworkError',
        'Failed to fetch',
      ],
    });
  }
};

// Helper to get current user from localStorage
const getCurrentUser = () => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed?.state?.user;
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
};

// Error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Manual error capture
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error captured:', error, context);
  }
};

// Capture custom events
export const captureEvent = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    console.log(`[${level.toUpperCase()}]`, message, context);
  }
};

// Track user actions
export const trackUserAction = (action: string, data?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      message: action,
      category: 'user-action',
      level: 'info',
      data,
    });
  }
};

// Set user context
export const setSentryUser = (user: { id: string; email: string; role?: string } | null) => {
  if (import.meta.env.PROD) {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.role,
      });
    } else {
      Sentry.setUser(null);
    }
  }
};