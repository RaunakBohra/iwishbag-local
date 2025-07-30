/**
 * Service Integration Test Runner
 * 
 * Execute this script in the browser console to run service integration tests
 * 
 * Usage:
 * 1. Open http://localhost:8084 in browser
 * 2. Open developer console (F12)
 * 3. Copy and paste this entire file
 * 4. Run: await runServiceIntegrationTests()
 */

console.log('🚀 Loading Service Integration Test Runner...');

// Import the test classes (assuming they're available globally)
const runServiceIntegrationTests = async () => {
  console.log('⚙️ Starting Service Integration Tests...\n');
  
  const startTime = Date.now();
  const results = [];
  
  // Test 1: Check service availability
  console.log('📋 TEST 1: Service Availability Check');
  try {
    // Check if services are available in global scope or can be imported
    const servicesAvailable = {
      smartCalculationEngine: typeof window.smartCalculationEngine !== 'undefined',
      notificationService: typeof window.notificationService !== 'undefined',
      currencyService: typeof window.currencyService !== 'undefined',
    };
    
    console.log('Services availability:', servicesAvailable);
    
    if (Object.values(servicesAvailable).some(available => !available)) {
      console.log('⚠️ Some services not available in global scope. Attempting dynamic import...');
      
      // Try to load services dynamically
      try {
        const { smartCalculationEngine } = await import('/src/services/SmartCalculationEngine.ts');
        const { notificationService } = await import('/src/services/NotificationService.ts');
        const { currencyService } = await import('/src/services/CurrencyService.ts');
        
        window.smartCalculationEngine = smartCalculationEngine;
        window.notificationService = notificationService;
        window.currencyService = currencyService;
        
        console.log('✅ Services loaded dynamically');
        results.push({ test: 'Service Availability', status: 'PASS', message: 'Services loaded dynamically' });
      } catch (importError) {
        console.log('❌ Failed to load services:', importError);
        results.push({ test: 'Service Availability', status: 'FAIL', message: 'Cannot load services' });
        return results;
      }
    } else {
      console.log('✅ All services available');
      results.push({ test: 'Service Availability', status: 'PASS', message: 'All services available' });
    }
  } catch (error) {
    console.log('❌ Service availability check failed:', error);
    results.push({ test: 'Service Availability', status: 'FAIL', message: error.message });
  }
  
  // Test 2: SmartCalculationEngine methods
  console.log('\n📋 TEST 2: SmartCalculationEngine Methods');
  try {
    const service = window.smartCalculationEngine;
    const requiredMethods = [
      'calculateUnifiedQuote',
      'optimizeCalculation', 
      'getCalculationContext',
      'validateQuoteData'
    ];
    
    const methodTests = requiredMethods.map(method => ({
      method,
      exists: typeof service[method] === 'function'
    }));
    
    const missingMethods = methodTests.filter(test => !test.exists);
    
    if (missingMethods.length > 0) {
      console.log('❌ Missing methods:', missingMethods.map(m => m.method));
      results.push({ 
        test: 'SmartCalculationEngine Methods', 
        status: 'FAIL', 
        message: `Missing methods: ${missingMethods.map(m => m.method).join(', ')}` 
      });
    } else {
      console.log('✅ All required methods found');
      results.push({ 
        test: 'SmartCalculationEngine Methods', 
        status: 'PASS', 
        message: 'All required methods available' 
      });
    }
  } catch (error) {
    console.log('❌ Method check failed:', error);
    results.push({ test: 'SmartCalculationEngine Methods', status: 'FAIL', message: error.message });
  }
  
  // Test 3: NotificationService
  console.log('\n📋 TEST 3: NotificationService');
  try {
    const service = window.notificationService;
    const requiredMethods = ['create', 'getNotifications', 'markAsRead'];
    
    const methodTests = requiredMethods.map(method => ({
      method,
      exists: typeof service[method] === 'function'
    }));
    
    const missingMethods = methodTests.filter(test => !test.exists);
    
    if (missingMethods.length > 0) {
      console.log('❌ Missing methods:', missingMethods.map(m => m.method));
      results.push({ 
        test: 'NotificationService', 
        status: 'FAIL', 
        message: `Missing methods: ${missingMethods.map(m => m.method).join(', ')}` 
      });
    } else {
      console.log('✅ NotificationService methods found');
      results.push({ 
        test: 'NotificationService', 
        status: 'PASS', 
        message: 'All methods available' 
      });
    }
  } catch (error) {
    console.log('❌ NotificationService check failed:', error);
    results.push({ test: 'NotificationService', status: 'FAIL', message: error.message });
  }
  
  // Test 4: Database Connection via Supabase
  console.log('\n📋 TEST 4: Database Connection');
  try {
    // Import supabase client
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    
    // Test basic database connectivity
    const { data, error } = await supabase
      .from('quotes')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error);
      results.push({ test: 'Database Connection', status: 'FAIL', message: error.message });
    } else {
      console.log('✅ Database connection successful');
      results.push({ test: 'Database Connection', status: 'PASS', message: 'Connected successfully' });
    }
  } catch (error) {
    console.log('❌ Database test failed:', error);
    results.push({ test: 'Database Connection', status: 'FAIL', message: error.message });
  }
  
  // Test 5: Core Database Functions
  console.log('\n📋 TEST 5: Core Database Functions');
  try {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    
    // Test if our core RPC functions exist
    const functionTests = [];
    
    // Test is_admin function
    try {
      const { data, error } = await supabase.rpc('is_admin');
      
      const functionExists = !error || !error.message.includes('function') || !error.message.includes('does not exist');
      
      functionTests.push({
        function: 'is_admin',
        exists: functionExists,
        error: error?.message || null
      });
    } catch (err) {
      functionTests.push({
        function: 'is_admin',
        exists: false,
        error: err.message
      });
    }
    
    console.log('Function test results:', functionTests);
    
    const allFunctionsExist = functionTests.every(test => test.exists);
    
    if (allFunctionsExist) {
      console.log('✅ Database functions available');
      results.push({ test: 'Database Functions', status: 'PASS', message: 'Functions available' });
    } else {
      console.log('❌ Some database functions missing');
      results.push({ test: 'Database Functions', status: 'FAIL', message: 'Some functions missing' });
    }
  } catch (error) {
    console.log('❌ Database function test failed:', error);
    results.push({ test: 'Database Functions', status: 'FAIL', message: error.message });
  }
  
  // Test 6: Core Tables Access
  console.log('\n📋 TEST 6: Core Tables Access');
  try {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    
    // Check if core tables exist and are accessible
    const tables = ['quotes', 'profiles', 'country_settings'];
    const tableTests = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        tableTests.push({
          table,
          accessible: !error || !error.message.includes('relation'),
          error: error?.message || null
        });
      } catch (err) {
        tableTests.push({
          table,
          accessible: false,
          error: err.message
        });
      }
    }
    
    const allTablesAccessible = tableTests.every(test => test.accessible);
    
    if (allTablesAccessible) {
      console.log('✅ Core tables accessible');
      results.push({ test: 'Core Tables Access', status: 'PASS', message: 'All core tables accessible' });
    } else {
      console.log('❌ Some core tables not accessible');
      results.push({ test: 'Core Tables Access', status: 'FAIL', message: 'Some tables inaccessible' });
    }
  } catch (error) {
    console.log('❌ Core tables test failed:', error);
    results.push({ test: 'Core Tables Access', status: 'FAIL', message: error.message });
  }
  
  // Test Summary
  console.log('\n📊 SERVICE INTEGRATION TEST SUMMARY');
  console.log('=====================================');
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.status === 'PASS').length;
  const failedTests = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`Execution Time: ${Date.now() - startTime}ms\n`);
  
  // Detailed Results
  console.log('📋 DETAILED RESULTS:');
  results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${statusIcon} ${result.test}: ${result.message}`);
  });
  
  console.log('\n🎉 Service Integration Tests Complete!');
  
  if (failedTests === 0) {
    console.log('✅ All tests passed! Services are properly integrated.');
  } else {
    console.log('⚠️ Some tests failed. Review the results above and fix integration issues.');
  }
  
  return {
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
      executionTime: Date.now() - startTime + 'ms'
    },
    results: results
  };
};

// Make the test runner available globally
window.runServiceIntegrationTests = runServiceIntegrationTests;

console.log('✅ Service Integration Test Runner loaded!');
console.log('📝 To run tests, execute: await runServiceIntegrationTests()');

// Auto-run if requested
if (window.location.search.includes('autotest=true')) {
  console.log('🚀 Auto-running service integration tests...');
  runServiceIntegrationTests();
}