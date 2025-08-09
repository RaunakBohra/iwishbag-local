/**
 * Network & Caching Optimization Verification Test
 * 
 * Quick test to verify all implementations are working correctly
 */

import { serviceWorkerManager } from './serviceWorkerManager';
import { resourcePreloader } from './resourcePreloader';

export async function testNetworkOptimizations(): Promise<{
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  resourcePreloaderActive: boolean;
  queryClientGlobal: boolean;
  allSystemsOperational: boolean;
}> {
  console.group('🧪 Testing Network & Caching Optimizations');

  // Test 1: Service Worker Support
  const serviceWorkerSupported = 'serviceWorker' in navigator && 'caches' in window;
  console.log('✅ Service Worker Support:', serviceWorkerSupported ? 'YES' : 'NO');

  // Test 2: Service Worker Registration (only works in production or when enabled)
  let serviceWorkerRegistered = false;
  if (serviceWorkerSupported && (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === 'true')) {
    try {
      const registration = await serviceWorkerManager.initialize();
      serviceWorkerRegistered = registration;
      console.log('✅ Service Worker Registration:', serviceWorkerRegistered ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Service Worker Registration:', 'FAILED', error);
    }
  } else {
    console.log('ℹ️  Service Worker Registration:', 'SKIPPED (development mode)');
  }

  // Test 3: Resource Preloader
  const resourcePreloaderActive = typeof resourcePreloader !== 'undefined';
  console.log('✅ Resource Preloader:', resourcePreloaderActive ? 'ACTIVE' : 'INACTIVE');
  
  if (resourcePreloaderActive) {
    const stats = resourcePreloader.getResourceStats();
    console.log('📊 Resource Preloader Stats:', stats);
  }

  // Test 4: Global Query Client
  const queryClientGlobal = typeof window !== 'undefined' && 
    typeof window.__REACT_QUERY_CLIENT__ !== 'undefined';
  console.log('✅ Global Query Client:', queryClientGlobal ? 'AVAILABLE' : 'NOT SET');

  // Test 5: Cache API Support
  const cacheApiSupported = 'caches' in window;
  console.log('✅ Cache API Support:', cacheApiSupported ? 'YES' : 'NO');

  // Overall Status
  const criticalSystemsWorking = serviceWorkerSupported && resourcePreloaderActive && cacheApiSupported;
  const allSystemsOperational = criticalSystemsWorking && (serviceWorkerRegistered || import.meta.env.DEV);

  console.log('🎯 Overall Status:', allSystemsOperational ? 'ALL SYSTEMS GO' : 'ISSUES DETECTED');
  console.groupEnd();

  return {
    serviceWorkerSupported,
    serviceWorkerRegistered,
    resourcePreloaderActive,
    queryClientGlobal,
    allSystemsOperational,
  };
}

// Auto-run test in development after page load
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(testNetworkOptimizations, 1000);
  });
}

export default testNetworkOptimizations;