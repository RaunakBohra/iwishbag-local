/**
 * Browser Console Test for Discount Abuse Prevention
 * 
 * How to use:
 * 1. Open browser developer tools (F12)
 * 2. Navigate to any page with discount functionality
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run the tests
 */

(async function testAbusePreventionInBrowser() {
  console.log('🧪 DISCOUNT ABUSE PREVENTION - BROWSER TEST');
  console.log('===========================================\n');

  // Test configuration
  const config = {
    sessionId: 'browser_test_' + Date.now(),
    testIP: '192.168.1.100',
    userAgent: navigator.userAgent
  };

  console.log('Test Configuration:');
  console.log('- Session ID:', config.sessionId);
  console.log('- Test IP:', config.testIP);
  console.log('- User Agent:', config.userAgent.substring(0, 50) + '...\n');

  // Helper function to create delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Test 1: Rapid Attempts Detection
  async function testRapidAttempts() {
    console.log('🚀 TEST 1: Rapid Attempts Detection');
    console.log('Attempting to trigger rate limiting...\n');

    try {
      // Try to dynamically import the service
      let DiscountService;
      
      try {
        // Try different import paths
        const module = await import('./src/services/DiscountService.ts');
        DiscountService = module.DiscountService || module.default;
      } catch (importError) {
        console.log('⚠️  Cannot import DiscountService directly.');
        console.log('   This test requires the service to be available in the browser context.');
        console.log('   Please run this test from a page that includes the discount functionality.\n');
        return false;
      }

      if (!DiscountService) {
        console.log('⚠️  DiscountService not available in browser context.');
        console.log('   Please ensure you are on a page with discount functionality.\n');
        return false;
      }

      const discountService = DiscountService.getInstance();
      let blocked = false;

      // Make 12 rapid attempts (threshold is 10)
      for (let i = 1; i <= 12; i++) {
        console.log(`Attempt ${i}/12: Testing invalid code RAPID${i}`);

        try {
          const result = await discountService.validateDiscountCode(
            `RAPID${i}`,
            'test@example.com',
            'US',
            100,
            config.sessionId,
            config.testIP,
            config.userAgent
          );

          if (result.actionRequired === 'rate_limit' || result.actionRequired === 'block') {
            console.log(`🚫 RATE LIMITING TRIGGERED after ${i} attempts!`);
            console.log('   Action required:', result.actionRequired);
            console.log('   Block duration:', result.blockDuration, 'minutes');
            console.log('   Reason:', result.error);
            blocked = true;
            break;
          }

          // Small delay to simulate rapid attempts
          await delay(100);
        } catch (error) {
          console.log(`   Error on attempt ${i}:`, error.message);
        }
      }

      if (blocked) {
        console.log('✅ TEST 1 PASSED: Rate limiting working correctly\n');
        return true;
      } else {
        console.log('❌ TEST 1 FAILED: Rate limiting not triggered\n');
        return false;
      }

    } catch (error) {
      console.log('❌ TEST 1 ERROR:', error.message, '\n');
      return false;
    }
  }

  // Test 2: Check if abuse detection service is available
  async function testServiceAvailability() {
    console.log('🔧 TEST 2: Service Availability Check');

    // Check if window has the services attached
    const services = ['DiscountService', 'DiscountAbuseDetectionService'];
    let available = 0;

    for (const serviceName of services) {
      if (window[serviceName]) {
        console.log(`   ✅ ${serviceName} available in window object`);
        available++;
      } else {
        console.log(`   ⚠️  ${serviceName} not found in window object`);
      }
    }

    // Check if we can access via module system
    try {
      const response = await fetch('/src/services/DiscountService.ts');
      if (response.ok) {
        console.log('   ✅ DiscountService.ts file accessible');
        available++;
      }
    } catch (error) {
      console.log('   ⚠️  Cannot access service files directly');
    }

    if (available > 0) {
      console.log('✅ TEST 2 PASSED: Services are available\n');
      return true;
    } else {
      console.log('❌ TEST 2 FAILED: Services not accessible\n');
      return false;
    }
  }

  // Test 3: Network/API Test (check if backend is responding)
  async function testBackendAPI() {
    console.log('🌐 TEST 3: Backend API Test');

    try {
      // Test if we can reach the database via Supabase
      const testEndpoints = [
        '/rest/v1/discount_codes?limit=1',
        '/rest/v1/abuse_patterns?limit=1'
      ];

      let working = 0;

      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(`http://127.0.0.1:54321${endpoint}`, {
            headers: {
              'apikey': 'your-anon-key', // This would need to be the actual key
              'Authorization': 'Bearer your-anon-key'
            }
          });

          if (response.status === 401 || response.status === 200) {
            // 401 is expected without proper auth, 200 means it's working
            console.log(`   ✅ ${endpoint} - API reachable`);
            working++;
          } else {
            console.log(`   ⚠️  ${endpoint} - Unexpected status: ${response.status}`);
          }
        } catch (error) {
          console.log(`   ⚠️  ${endpoint} - Not reachable:`, error.message);
        }
      }

      if (working > 0) {
        console.log('✅ TEST 3 PASSED: Backend API is responding\n');
        return true;
      } else {
        console.log('❌ TEST 3 FAILED: Cannot reach backend API\n');
        return false;
      }

    } catch (error) {
      console.log('❌ TEST 3 ERROR:', error.message, '\n');
      return false;
    }
  }

  // Test 4: Local Storage / Session Test
  async function testBrowserStorage() {
    console.log('💾 TEST 4: Browser Storage Test');

    try {
      // Test if we can store and retrieve session data
      const testKey = 'abuse_test_' + Date.now();
      const testData = { sessionId: config.sessionId, timestamp: Date.now() };

      // Test localStorage
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = JSON.parse(localStorage.getItem(testKey));

      if (retrieved && retrieved.sessionId === config.sessionId) {
        console.log('   ✅ LocalStorage working correctly');
        localStorage.removeItem(testKey); // Cleanup
      } else {
        console.log('   ❌ LocalStorage not working');
        return false;
      }

      // Test sessionStorage
      sessionStorage.setItem(testKey, JSON.stringify(testData));
      const sessionRetrieved = JSON.parse(sessionStorage.getItem(testKey));

      if (sessionRetrieved && sessionRetrieved.sessionId === config.sessionId) {
        console.log('   ✅ SessionStorage working correctly');
        sessionStorage.removeItem(testKey); // Cleanup
      } else {
        console.log('   ❌ SessionStorage not working');
        return false;
      }

      console.log('✅ TEST 4 PASSED: Browser storage working\n');
      return true;

    } catch (error) {
      console.log('❌ TEST 4 ERROR:', error.message, '\n');
      return false;
    }
  }

  // Test 5: UI Elements Test
  async function testUIElements() {
    console.log('🎨 TEST 5: UI Elements Test');

    const elementsToCheck = [
      'input[type="text"]', // Discount code input
      'button', // Submit buttons
      'form', // Forms
      '.error-message', // Error message containers
      '.discount-input' // Specific discount inputs
    ];

    let found = 0;

    for (const selector of elementsToCheck) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`   ✅ Found ${elements.length} ${selector} elements`);
        found++;
      } else {
        console.log(`   ⚠️  No ${selector} elements found`);
      }
    }

    // Check for React app
    if (document.getElementById('root') || document.querySelector('[data-reactroot]')) {
      console.log('   ✅ React application detected');
      found++;
    }

    if (found > 2) {
      console.log('✅ TEST 5 PASSED: UI elements available for testing\n');
      return true;
    } else {
      console.log('❌ TEST 5 FAILED: Limited UI elements for testing\n');
      return false;
    }
  }

  // Run all tests
  console.log('Starting browser-based abuse prevention tests...\n');

  const tests = [
    { name: 'Service Availability', fn: testServiceAvailability },
    { name: 'Backend API', fn: testBackendAPI },
    { name: 'Browser Storage', fn: testBrowserStorage },
    { name: 'UI Elements', fn: testUIElements },
    { name: 'Rapid Attempts Detection', fn: testRapidAttempts }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`Running ${test.name}...`);
      const result = await test.fn();
      results.push({ name: test.name, success: result });
      await delay(500); // Brief pause between tests
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      results.push({ name: test.name, success: false });
    }
  }

  // Test Summary
  console.log('🏁 BROWSER TEST SUMMARY');
  console.log('=======================\n');

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  });

  console.log(`\n📊 Results: ${passed}/${total} tests passed`);

  if (passed >= 3) {
    console.log('\n🎉 Browser environment is ready for abuse prevention testing!');
    console.log('\nNext steps:');
    console.log('1. Navigate to a page with discount code input');
    console.log('2. Try entering multiple invalid codes rapidly');
    console.log('3. Watch for rate limiting messages');
    console.log('4. Check admin dashboard at /admin/abuse-monitoring');
  } else {
    console.log('\n⚠️  Browser environment needs setup.');
    console.log('\nRecommendations:');
    console.log('- Navigate to a page with discount functionality');
    console.log('- Ensure the development server is running');
    console.log('- Check that Supabase backend is accessible');
  }

  console.log('\n🔗 For comprehensive testing, see: src/tests/discount-abuse-testing-guide.md');

  return passed >= 3;
})();