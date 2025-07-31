import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import './styles/amazon-address-form.css';
import { validateEnv } from './config/env';
import { logger } from '@/utils/logger';

// Initialize Sentry for error and performance monitoring
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // GDPR compliance - mask sensitive data
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring - reduced for production
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Session Replay
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.01 : 0.1, // 1% in prod, 10% in dev
    replaysOnErrorSampleRate: 1.0, // Always capture on errors
    // Additional settings
    beforeSend(event, hint) {
      // Filter out non-error console logs
      if (event.level === 'log') {
        return null;
      }
      return event;
    },
  });
  
  logger.info('Sentry initialized successfully');
} else {
  logger.warn('Sentry DSN not configured - error tracking disabled');
}

// Validate environment variables on startup
if (!validateEnv()) {
  logger.error('❌ Environment validation failed. Check your environment variables.');
}

// Load country testing utils in development
if (import.meta.env.MODE === 'development') {
  import('./utils/countryTestUtils');
}

createRoot(document.getElementById('root')!).render(<App />);
