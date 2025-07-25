import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { validateEnv } from './config/env';

// Initialize Sentry for error and performance monitoring
Sentry.init({
  dsn: 'https://8c2b7811dbad53f28b209864b6dc66f0@o4509707940265984.ingest.us.sentry.io/4509707943215104',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If an error happens while a session is being recorded, send the replay
});

// Validate environment variables on startup
if (!validateEnv()) {
  console.error('❌ Environment validation failed. Check your environment variables.');
}

createRoot(document.getElementById('root')!).render(<App />);
