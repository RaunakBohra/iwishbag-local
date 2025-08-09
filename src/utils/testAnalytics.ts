/**
 * Analytics Testing Utility
 * 
 * Use this in browser console to test analytics integration:
 * import('./utils/testAnalytics').then(t => t.testAnalytics());
 */

import { analytics } from './analytics';

export const testAnalytics = async () => {
  console.log('🧪 Testing iwishBag Analytics System...');
  
  try {
    // Test 1: Check if analytics is initialized
    console.log('1️⃣ Testing initialization...');
    await analytics.initialize();
    console.log('✅ Analytics initialized successfully');
    
    // Test 2: Test page view tracking
    console.log('2️⃣ Testing page view tracking...');
    analytics.trackPageView('Test Page', window.location.href);
    console.log('✅ Page view tracked');
    
    // Test 3: Test ecommerce tracking
    console.log('3️⃣ Testing ecommerce tracking...');
    analytics.trackEcommerce({
      event_name: 'add_to_cart',
      currency: 'INR',
      value: 1500,
      items: [{
        item_id: 'test-quote-123',
        item_name: 'Test Product',
        category: 'quote',
        quantity: 1,
        price: 1500,
      }]
    });
    console.log('✅ Ecommerce event tracked');
    
    // Test 4: Test engagement tracking
    console.log('4️⃣ Testing engagement tracking...');
    analytics.trackEngagement({
      event_name: 'quote_requested',
      quote_id: 'test-123',
      quote_value: 1500,
      user_type: 'new',
    });
    console.log('✅ Engagement event tracked');
    
    // Test 5: Check if GA4 is loaded
    console.log('5️⃣ Checking Google Analytics 4...');
    if (typeof window !== 'undefined' && window.gtag) {
      console.log('✅ Google Analytics 4 is loaded and ready');
      console.log('📊 GA4 Measurement ID:', import.meta.env.VITE_GA4_MEASUREMENT_ID);
    } else {
      console.log('⚠️ Google Analytics 4 not detected');
    }
    
    // Test 6: Check if Facebook Pixel is loaded
    console.log('6️⃣ Checking Facebook Pixel...');
    if (typeof window !== 'undefined' && window.fbq) {
      console.log('✅ Facebook Pixel is loaded and ready');
      console.log('📊 FB Pixel ID:', import.meta.env.VITE_FACEBOOK_PIXEL_ID);
    } else {
      console.log('⚠️ Facebook Pixel not configured (needs VITE_FACEBOOK_PIXEL_ID)');
    }
    
    // Test 7: Performance tracking
    console.log('7️⃣ Testing performance tracking...');
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const loadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
      console.log(`⚡ Page load time: ${loadTime.toFixed(2)}ms`);
      console.log('✅ Performance tracking working');
    }
    
    console.log('🎉 Analytics testing complete!');
    console.log('📊 Check your Google Analytics Real-time reports to verify events');
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
  }
};

// Auto-run in development
if (import.meta.env.DEV) {
  console.log('💡 Run testAnalytics() in console to test analytics system');
  // @ts-ignore
  window.testAnalytics = testAnalytics;
}

export default testAnalytics;