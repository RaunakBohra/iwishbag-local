import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import './styles/amazon-address-form.css';
import { validateEnv } from './config/env';
import { logger } from '@/utils/logger';
import { assetPreloader } from '@/utils/assetPreloader';
import { preloadStrategies } from '@/utils/dynamic-imports';

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

// Initialize performance optimization systems
assetPreloader.preloadCriticalAssets();
logger.info('Asset preloader initialized');

// Initialize advanced code splitting systems with error handling
import('./utils/routeCodeSplitting.tsx')
  .then(({ preloadCriticalRoutes }) => {
    preloadCriticalRoutes();
    logger.info('Route code splitting initialized');
  })
  .catch((error) => {
    logger.warn('Route code splitting failed to load:', error);
  });

import('./utils/intelligentChunkLoading')
  .then(({ intelligentChunkLoader }) => {
    // System auto-initializes
    logger.info('Intelligent chunk loader initialized');
  })
  .catch((error) => {
    logger.warn('Intelligent chunk loader failed to load:', error);
  });

import('./utils/criticalPathOptimization')
  .then(({ criticalPathOptimizer }) => {
    // System auto-initializes
    logger.info('Critical path optimizer initialized');
  })
  .catch((error) => {
    logger.warn('Critical path optimizer failed to load:', error);
  });

// Initialize service worker and resource preloader
if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === 'true') {
  import('./utils/serviceWorkerManager')
    .then(({ serviceWorkerManager }) => {
      serviceWorkerManager.initialize().then((success) => {
        if (success) {
          logger.info('🚀 Service Worker activated - offline support enabled');
        } else {
          logger.warn('⚠️ Service Worker initialization failed - limited offline support');
        }
      });
    })
    .catch((error) => {
      logger.warn('Service Worker manager failed to load:', error);
    });
} else {
  logger.info('ℹ️ Service Worker disabled in development - set VITE_ENABLE_SW=true to enable');
}

// Initialize advanced resource preloading
import('./utils/resourcePreloader')
  .then(({ resourcePreloader }) => {
    logger.info('⚡ Resource preloader initialized - intelligent prefetching active');
  })
  .catch((error) => {
    logger.warn('Resource preloader failed to load:', error);
  });

// Run optimization tests in development
if (import.meta.env.DEV) {
  import('./utils/networkOptimizationTest')
    .then(({ testNetworkOptimizations }) => {
      // Test will auto-run on window load
      logger.info('🧪 Network optimization tests loaded');
    })
    .catch((error) => {
      logger.warn('Network optimization tests failed to load:', error);
    });
}

// Admin Bundle Intelligent Preloading - Only preload admin bundles for admin users
setTimeout(() => {
  // Check if user is likely an admin (in localStorage or cookies)
  const hasAdminSession = localStorage.getItem('isAdmin') === 'true' || 
                         document.cookie.includes('admin=true') ||
                         window.location.pathname.includes('/admin');
  
  if (hasAdminSession) {
    // Preload admin components in background after initial load
    import('./utils/adminBundleSplitter')
      .then(({ useAdminPreloader }) => {
        // This will run after user auth check
        logger.info('🔒 Admin bundle preloader initialized');
      })
      .catch((error) => {
        logger.warn('Admin bundle preloader failed to load:', error);
      });
  }
}, 3000); // 3 second delay to not interfere with critical path

createRoot(document.getElementById('root')!).render(<App />);
